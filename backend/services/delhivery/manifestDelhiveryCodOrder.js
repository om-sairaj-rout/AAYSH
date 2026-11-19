const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const User = require("../../models/user.model");
const Company = require("../../models/company.model");
const DelhiveryPickupLocation = require("../../models/delhiveryPickupLocation.model");
const DelhiveryShipmentManifest = require("../../models/delhiveryShipmentManifest.model");
const { runDelhiveryCodPrecheck } = require("./delhiveryCodPrecheck");
const { createDelhiveryShipment } = require("./delhiveryCreateShipmentApi");
const {
  buildSpsPayload,
  buildMpsPayload,
} = require("./buildDelhiveryShipmentPayload");
const {
  reserveDelhiveryAwbsForOrder,
  releaseReservedDelhiveryAwbs,
  markDelhiveryAwbsBooked,
} = require("./delhiveryAwbReservation");
const { resolveDelhiveryShippingMode } = require("../../constants/delhiveryShippingMode");
const {
  assertUserCanAccessOrder,
  splitCodAmountsForMps,
  sanitizeDelhiveryResponseForStorage,
} = require("../../utils/delhiveryShipmentHelpers");
const { parseISODateOnly, now } = require("../../utils/dateTime");
const {
  acquireManifestLock,
  updateManifestWithLock,
  finalizeManifestWithLock,
  markCmuRequestSent,
  RECONCILIATION_MESSAGE,
} = require("./delhiveryManifestLock");
const {
  shouldReleaseReservedAwbsOnManifestCatch,
} = require("../../utils/delhiveryManifestWalletPolicy");
const {
  recordDelhiveryWalletInconsistency,
} = require("../../utils/delhiveryWalletReconciliation");

const preCmuManifestFailure = (error, extra = {}) => ({
  success: false,
  error,
  definiteFailure: true,
  walletShouldReverse: true,
  ...extra,
});

const confirmReservedPackagesInResponse = (packageResults, reservedAwbs) => {
  const expected = reservedAwbs.map((r) => String(r.awbNumber));
  if (!Array.isArray(packageResults) || !packageResults.length) {
    return { ok: false, reason: "NO_PACKAGE_RESULTS" };
  }

  const byWaybill = new Map(
    packageResults
      .filter((p) => p.waybill)
      .map((p) => [String(p.waybill), p])
  );

  for (const waybill of expected) {
    const row = byWaybill.get(waybill);
    if (!row || row.success !== true) {
      return { ok: false, reason: "PACKAGE_NOT_CONFIRMED", waybill };
    }
  }

  return { ok: true };
};

const loadPickupLocation = async ({ pickupLocationId, operatorCompanyID }) => {
  const location = await DelhiveryPickupLocation.findOne({
    _id: pickupLocationId,
    companyID: operatorCompanyID,
    active: true,
  }).lean();

  if (!location) {
    const err = new Error(
      "Active Delhivery pickup location not found for your company."
    );
    err.code = "PICKUP_LOCATION_INVALID";
    throw err;
  }

  if (!location.facilityName?.trim()) {
    const err = new Error("Pickup location facility name is missing.");
    err.code = "PICKUP_LOCATION_INVALID";
    throw err;
  }

  return location;
};

const manifestDelhiveryCodOrder = async ({
  orderId,
  user,
  serviceType,
  pickupDate,
  pickupTime = "11:00",
  pickupLocationId,
  notes = "",
  shipmentType = "SPS",
  packages = null,
}) => {
  const service = String(serviceType || "").toLowerCase();
  const modeCheck = resolveDelhiveryShippingMode(service);
  if (!modeCheck.ok) {
    return preCmuManifestFailure(modeCheck.message);
  }

  const order = await Order.findById(orderId).lean();
  const access = assertUserCanAccessOrder(order, user);
  if (!access.ok) {
    return preCmuManifestFailure(access.message);
  }

  const shipping = await Shipping.findOne({ orderId: order._id }).lean();
  if (shipping?.awbNumber && shipping?.delhiveryManifestStatus === "success") {
    return {
      success: false,
      error: "Order is already manifested with Delhivery.",
      awbNumber: shipping.awbNumber,
    };
  }

  if (shipping?.awbNumber && shipping?.courierName === "Delhivery") {
    return {
      success: false,
      error: "AWB already assigned on this shipment.",
      awbNumber: shipping.awbNumber,
    };
  }

  const companyID = String(order.companyID || "").trim().toUpperCase();
  const operatorCompanyID = String(
    user?.companyID || user?.companyId || ""
  )
    .trim()
    .toUpperCase();

  let pickupLocation;
  try {
    pickupLocation = await loadPickupLocation({
      pickupLocationId,
      operatorCompanyID,
    });
  } catch (pickupErr) {
    return preCmuManifestFailure(
      pickupErr.message || "Delhivery pickup location validation failed.",
      { error_code: pickupErr.code }
    );
  }

  const precheck = await runDelhiveryCodPrecheck({
    destinationPincode: order.destinationPincode,
    companyID,
    paymentMethod: "COD",
    serviceType: service,
    expectedPickupDate: pickupDate,
  });

  if (!precheck.skipped && precheck.can_proceed === false) {
    return preCmuManifestFailure(
      precheck.message ||
        "Delhivery COD is not serviceable for this destination."
    );
  }

  const lockResult = await acquireManifestLock(
    order._id,
    companyID,
    order.externalOrderId
  );

  if (!lockResult.locked) {
    if (lockResult.duplicate && lockResult.manifest?.manifestStatus === "success") {
      return {
        success: true,
        duplicate: true,
        awbNumber: lockResult.manifest.masterAwb,
        childAwbs: lockResult.manifest.childAwbs,
        shipmentType: lockResult.manifest.shipmentType,
      };
    }
    if (lockResult.inProgress) {
      return {
        success: false,
        error:
          lockResult.message ||
          "Delhivery manifestation is already in progress for this order.",
        inProgress: true,
        walletShouldReverse: false,
      };
    }
    if (lockResult.uncertain || lockResult.reconciliationRequired) {
      return {
        success: false,
        error:
          lockResult.message ||
          "Previous Delhivery request requires manual reconciliation before retry.",
        manifestStatus:
          lockResult.manifest?.manifestStatus || "reconciliation_required",
        reconciliationRequired: true,
        walletShouldReconcile: true,
        walletShouldReverse: false,
      };
    }
    return {
      success: false,
      error:
        lockResult.message ||
        "Could not acquire manifestation lock for this order.",
      walletShouldReverse: false,
      inProgress: true,
    };
  }

  const { manifest, lockOwnerToken } = lockResult;
  const type = String(shipmentType || "SPS").toUpperCase();
  let packageInputs = null;
  let awbReservation = null;
  let apiPayload = null;
  let reservedAwbs = [];
  let cmuRequestWasMarked = false;
  let cmuResponseIndicatesAcceptance = false;

  try {
    const [seller, company] = await Promise.all([
      User.findById(order.uploadedBy).lean(),
      Company.findOne({ companyID }).lean(),
    ]);

    if (type === "MPS") {
      if (!Array.isArray(packages) || packages.length < 2) {
        throw Object.assign(
          new Error("MPS requires at least 2 packages with weight and dimensions."),
          { code: "VALIDATION_ERROR" }
        );
      }
      packageInputs = splitCodAmountsForMps(packages, order.invoiceValue);
      awbReservation = await reserveDelhiveryAwbsForOrder(
        order._id,
        packageInputs.length
      );
      if (!awbReservation.success) {
        throw Object.assign(new Error(awbReservation.message), {
          code: "AWB_POOL_EMPTY",
        });
      }
      reservedAwbs = awbReservation.awbs;
      apiPayload = buildMpsPayload({
        order,
        seller,
        company,
        serviceType: service,
        pickupFacilityName: pickupLocation.facilityName,
        reservedAwbs,
        packageInputs,
      });
    } else {
      const spsPackage =
        Array.isArray(packages) && packages[0] ? packages[0] : null;
      awbReservation = await reserveDelhiveryAwbsForOrder(order._id, 1);
      if (!awbReservation.success) {
        throw Object.assign(new Error(awbReservation.message), {
          code: "AWB_POOL_EMPTY",
        });
      }
      reservedAwbs = awbReservation.awbs;
      apiPayload = buildSpsPayload({
        order,
        seller,
        company,
        serviceType: service,
        pickupFacilityName: pickupLocation.facilityName,
        waybill: reservedAwbs[0].awbNumber,
        packageInput: spsPackage,
      });
    }

    await updateManifestWithLock(manifest._id, lockOwnerToken, {
      shipmentType: type,
      pickupLocationId: pickupLocation._id,
      pickupFacilityName: pickupLocation.facilityName,
      serviceType: service,
      requestSnapshot: {
        shipmentType: type,
        packageCount: type === "MPS" ? packageInputs.length : 1,
      },
    });

    const cmuMarked = await markCmuRequestSent(manifest._id, lockOwnerToken);
    if (!cmuMarked) {
      throw Object.assign(
        new Error("Lost manifestation lock before Delhivery request."),
        { code: "LOCK_LOST" }
      );
    }
    cmuRequestWasMarked = true;

    const apiResult = await createDelhiveryShipment(apiPayload);

    if (apiResult.uncertain) {
      await finalizeManifestWithLock(manifest._id, lockOwnerToken, {
        manifestStatus: "reconciliation_required",
        reconciliationRequired: true,
        reconciliationNote:
          "CMU request timed out or outcome unknown. Verify Delhivery before retry.",
        lastError: apiResult.message || RECONCILIATION_MESSAGE,
        httpStatus: apiResult.http_status || null,
        masterAwb: reservedAwbs[0].awbNumber,
        childAwbs: reservedAwbs.slice(1).map((r) => r.awbNumber),
        delhiveryResponse: sanitizeDelhiveryResponseForStorage(apiResult.raw),
        walletReconciliationRequired: true,
        walletReconciliationReason:
          "Wallet debited; CMU outcome uncertain after HTTP request.",
      });

      return {
        success: false,
        uncertain: true,
        reconciliationRequired: true,
        walletShouldReconcile: true,
        walletShouldReverse: false,
        error: apiResult.message,
        awbNumber: reservedAwbs[0].awbNumber,
        childAwbs: reservedAwbs.slice(1).map((r) => r.awbNumber),
      };
    }

    if (apiResult.api_error) {
      await releaseReservedDelhiveryAwbs(reservedAwbs.map((r) => r.awbId));
      await finalizeManifestWithLock(manifest._id, lockOwnerToken, {
        manifestStatus: "failed",
        lastError: apiResult.message,
        httpStatus: apiResult.http_status || null,
        delhiveryResponse: sanitizeDelhiveryResponseForStorage(apiResult.raw),
      });

      return {
        success: false,
        error: apiResult.message,
        error_code: apiResult.error_code,
        definiteFailure: true,
        walletShouldReverse: true,
        reconciliationRequired: false,
      };
    }

    cmuResponseIndicatesAcceptance = true;

    const packageResults = apiResult.packages || [];
    const packageConfirm = confirmReservedPackagesInResponse(
      packageResults,
      reservedAwbs
    );

    if (!packageConfirm.ok) {
      const unclearMessage =
        packageConfirm.reason === "NO_PACKAGE_RESULTS"
          ? "Delhivery response did not include per-package confirmation."
          : `Delhivery did not confirm package waybill ${packageConfirm.waybill || ""}.`.trim();

      await finalizeManifestWithLock(manifest._id, lockOwnerToken, {
        manifestStatus: "reconciliation_required",
        reconciliationRequired: true,
        reconciliationNote:
          "CMU response did not confirm all packages. Verify Delhivery dashboard.",
        lastError: unclearMessage,
        delhiveryResponse: sanitizeDelhiveryResponseForStorage(apiResult.raw),
        masterAwb: reservedAwbs[0].awbNumber,
        childAwbs: reservedAwbs.slice(1).map((r) => r.awbNumber),
        walletReconciliationRequired: true,
        walletReconciliationReason:
          "Wallet debited; CMU response did not confirm all packages.",
      });

      return {
        success: false,
        uncertain: true,
        reconciliationRequired: true,
        walletShouldReconcile: true,
        walletShouldReverse: false,
        error: `${unclearMessage} AWBs kept reserved.`,
        awbNumber: reservedAwbs[0].awbNumber,
        childAwbs: reservedAwbs.slice(1).map((r) => r.awbNumber),
      };
    }

    const expectedWaybills = reservedAwbs.map((r) => r.awbNumber);

    await markDelhiveryAwbsBooked(expectedWaybills, order._id);

    const parsedPickupDate = parseISODateOnly(pickupDate);
    const masterAwb = reservedAwbs[0].awbNumber;
    const childAwbs = reservedAwbs.slice(1).map((r) => r.awbNumber);

    await Shipping.updateOne(
      { orderId: order._id },
      {
        $set: {
          awbNumber: masterAwb,
          courierName: "Delhivery",
          courierId: null,
          serviceType: service,
          pickupDate: parsedPickupDate,
          requestedPickupDate: parsedPickupDate,
          pickupTime,
          pickupInstructions: notes,
          pickupLocation: pickupLocation.facilityName,
          pickupStatus: "Scheduled",
          shippingStatus: "Booked",
          bookedAt: now(),
          totalWeight: order.chargeableWeight || order.weight || 0,
          delhiveryManifestStatus: "success",
          delhiveryShipmentType: type,
          delhiveryMasterAwb: masterAwb,
          delhiveryChildAwbs: childAwbs,
          delhiveryPickupLocationId: pickupLocation._id,
          delhiveryPickupFacilityName: pickupLocation.facilityName,
          delhiveryManifestedAt: now(),
        },
      },
      { upsert: false }
    );

    await finalizeManifestWithLock(manifest._id, lockOwnerToken, {
      manifestStatus: "success",
      manifestedAt: now(),
      masterAwb,
      childAwbs,
      httpStatus: apiResult.http_status,
      lastError: "",
      delhiveryResponse: sanitizeDelhiveryResponseForStorage(apiResult.raw),
      packages: reservedAwbs.map((r, idx) => ({
        waybill: r.awbNumber,
        weightGrams: Number(apiPayload.shipments?.[idx]?.weight) || 0,
        delhiveryStatus: "Success",
      })),
    });

    return {
      success: true,
      awbNumber: masterAwb,
      childAwbs,
      shipmentType: type,
      courier: "Delhivery",
      serviceType: service,
      pickupFacilityName: pickupLocation.facilityName,
    };
  } catch (err) {
    const releaseAwbs = shouldReleaseReservedAwbsOnManifestCatch({
      cmuRequestWasMarked,
      cmuResponseIndicatesAcceptance,
    });

    if (releaseAwbs && reservedAwbs.length) {
      await releaseReservedDelhiveryAwbs(reservedAwbs.map((r) => r.awbId));
    }

    const cmuMayHaveCreated =
      cmuRequestWasMarked || cmuResponseIndicatesAcceptance;

    if (lockOwnerToken && manifest?._id) {
      if (cmuMayHaveCreated) {
        try {
          await finalizeManifestWithLock(manifest._id, lockOwnerToken, {
            manifestStatus: "reconciliation_required",
            reconciliationRequired: true,
            reconciliationNote:
              "In-process failure after CMU may have reached Delhivery.",
            lastError: err.message || RECONCILIATION_MESSAGE,
            masterAwb: reservedAwbs[0]?.awbNumber || "",
            childAwbs: reservedAwbs.slice(1).map((r) => r.awbNumber),
            walletReconciliationRequired: true,
            walletReconciliationReason:
              "Wallet debited; manifestation failed after CMU was sent or accepted.",
          });
        } catch {
          await recordDelhiveryWalletInconsistency({
            manifestId: manifest._id,
            orderId: order._id,
            reason:
              "Wallet debited; CMU may have succeeded but manifest finalize lost lock.",
            walletDebited: true,
          });
        }

        return {
          success: false,
          uncertain: true,
          reconciliationRequired: true,
          walletShouldReconcile: true,
          walletShouldReverse: false,
          error: RECONCILIATION_MESSAGE,
          error_code: err.code,
          awbNumber: reservedAwbs[0]?.awbNumber,
          childAwbs: reservedAwbs.slice(1).map((r) => r.awbNumber),
        };
      }

      try {
        await finalizeManifestWithLock(manifest._id, lockOwnerToken, {
          manifestStatus: "failed",
          lastError: err.message || "Manifestation failed",
        });
      } catch {
        // Lock lost; another worker may own manifest state.
      }
    }

    const preCmuError = !cmuMayHaveCreated;
    return {
      success: false,
      error: err.message || "Delhivery manifestation failed",
      error_code: err.code,
      definiteFailure: preCmuError && err.code !== "LOCK_LOST",
      walletShouldReverse: preCmuError && err.code !== "LOCK_LOST",
      walletShouldReconcile: false,
      inProgress: err.code === "LOCK_LOST",
    };
  }
};

module.exports = {
  manifestDelhiveryCodOrder,
};
