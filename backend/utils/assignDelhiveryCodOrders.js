const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Company = require("../models/company.model");
const { parseISODateOnly } = require("./dateTime");
const { calculateOrderWalletCharge } = require("./orderWalletCharge");
const {
  debitForOrder,
  ensureWalletReadyForShipment,
} = require("./walletService");
const { manifestDelhiveryCodOrder } = require("../services/delhivery/manifestDelhiveryCodOrder");
const { buildDelhiveryPackagesFromOrder } = require("./delhiveryOrderShipmentPlan");
const {
  resolveOperatorDelhiveryPickupLocation,
} = require("./resolveOperatorDelhiveryPickupLocation");
const { assertUserCanAccessOrder } = require("./delhiveryShipmentHelpers");
const {
  reverseDelhiveryShipmentDebitIfNeeded,
  recordDelhiveryWalletInconsistency,
} = require("./delhiveryWalletReconciliation");
const {
  resolveDelhiveryManifestWalletAction,
} = require("./delhiveryManifestWalletPolicy");

const buildOrderItemMap = (ordersPayload, user) =>
  new Map(ordersPayload.map((item) => [String(item.orderId), item]));

const assignDelhiveryCodOrders = async (
  {
    serviceType,
    orders = [],
    pickupDate,
    pickupTime = "11:00",
    notes = "",
    delhiveryPickupLocationId,
    shipmentType: shipmentTypeOverride,
    packagesByOrder = {},
  },
  user
) => {
  const operatorCompanyID = String(user?.companyID || "").trim().toUpperCase();
  const pickupResolve = await resolveOperatorDelhiveryPickupLocation({
    pickupLocationId: delhiveryPickupLocationId,
    operatorCompanyID,
  });
  if (!pickupResolve.ok) {
    return {
      success: false,
      message: pickupResolve.message,
      data: orders.map((o) => ({
        orderId: o.orderId,
        error: pickupResolve.message,
      })),
      summary: { total: orders.length, success: 0, failed: orders.length },
    };
  }
  const manifestPickupLocationId = pickupResolve.location._id;

  const orderIds = orders.map((o) => o.orderId);
  const orderDocs = await Order.find({ _id: { $in: orderIds } }).lean();
  const orderMap = new Map(orderDocs.map((o) => [String(o._id), o]));
  const itemMap = buildOrderItemMap(orders, user);

  const companyIds = [
    ...new Set(
      orderDocs
        .map((o) => String(o.companyID || "").trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
  const companyDocs = await Company.find({ companyID: { $in: companyIds } })
    .select("companyID walletEnabled")
    .lean();
  const companyMap = new Map(companyDocs.map((c) => [c.companyID, c]));

  const existingShippings = await Shipping.find({
    orderId: { $in: orderIds },
  })
    .select("orderId awbNumber delhiveryManifestStatus")
    .lean();
  const shippingMap = new Map(
    existingShippings.map((s) => [String(s.orderId), s])
  );

  const updatedOrders = [];

  for (const item of orders) {
    const existingShipping = shippingMap.get(String(item.orderId));
    if (existingShipping?.awbNumber) {
      updatedOrders.push({
        orderId: item.orderId,
        error: "AWB already assigned",
      });
      continue;
    }

    const order = orderMap.get(String(item.orderId));
    const access = assertUserCanAccessOrder(order, user);
    if (!access.ok) {
      updatedOrders.push({
        orderId: item.orderId,
        error: access.message,
      });
      continue;
    }

    const serviceabilityPincode = String(order.destinationPincode || "").trim();
    const company = companyMap.get(String(order.companyID || "").trim().toUpperCase());
    const service = serviceType?.toLowerCase();

    let chargeResult = null;
    let walletDebited = false;

    if (company?.walletEnabled && !order.walletDeductedAt) {
      chargeResult = await calculateOrderWalletCharge(order, service);
      if (!chargeResult.success) {
        updatedOrders.push({
          orderId: order._id,
          orderNumber: order.externalOrderId,
          consigneeName: order.consigneeName,
          destinationPincode: serviceabilityPincode,
          error: chargeResult.message || "Unable to calculate wallet charge",
        });
        continue;
      }

      const walletReady = await ensureWalletReadyForShipment(
        order.companyID,
        chargeResult.amount
      );
      if (!walletReady.ok) {
        updatedOrders.push({
          orderId: order._id,
          orderNumber: order.externalOrderId,
          consigneeName: order.consigneeName,
          destinationPincode: serviceabilityPincode,
          error: walletReady.message,
        });
        continue;
      }

      const debitResult = await debitForOrder({
        companyID: order.companyID,
        orderId: order._id,
        amount: chargeResult.amount,
        description: `Shipment charge for order ${order.externalOrderId} (${service})`,
        createdBy: user?.id || null,
        meta: {
          service,
          zone: chargeResult.zone,
          externalOrderId: order.externalOrderId,
          chargeableWeight: chargeResult.chargeableWeight,
          displayDescription: "Shipment Manifested",
          courier: "Delhivery",
          phase: "pre_manifest",
        },
      });

      if (!debitResult.success) {
        updatedOrders.push({
          orderId: order._id,
          orderNumber: order.externalOrderId,
          consigneeName: order.consigneeName,
          destinationPincode: serviceabilityPincode,
          error: debitResult.message || "Wallet debit failed",
        });
        continue;
      }

      walletDebited = true;
      if (!debitResult.duplicate) {
        await Order.updateOne(
          { _id: order._id },
          {
            walletDeductedAt: new Date(),
            walletChargeAmount: chargeResult.amount,
            walletTransactionId: debitResult.transaction._id,
          }
        );
      }
    }

    const fromOrderPlan = buildDelhiveryPackagesFromOrder(order);
    const shipmentType =
      String(shipmentTypeOverride || fromOrderPlan.shipmentType || "SPS").toUpperCase();
    const packages =
      packagesByOrder[String(order._id)] ||
      item.packages ||
      fromOrderPlan.packages;

    const manifestResult = await manifestDelhiveryCodOrder({
      orderId: order._id,
      user,
      serviceType: service,
      pickupDate,
      pickupTime,
      pickupLocationId: manifestPickupLocationId,
      notes,
      shipmentType,
      packages,
    });

    if (!manifestResult.success) {
      const walletAction = resolveDelhiveryManifestWalletAction(manifestResult);

      if (walletDebited && walletAction.reverse) {
        await reverseDelhiveryShipmentDebitIfNeeded({
          orderId: order._id,
          companyID: order.companyID,
          externalOrderId: order.externalOrderId,
          createdBy: user?.id || null,
        });
      } else if (walletDebited && walletAction.reconcile) {
        const DelhiveryShipmentManifest = require("../models/delhiveryShipmentManifest.model");
        const manifestDoc = await DelhiveryShipmentManifest.findOne({
          orderId: order._id,
        }).select("_id");
        await recordDelhiveryWalletInconsistency({
          manifestId: manifestDoc?._id,
          orderId: order._id,
          reason:
            manifestResult.error ||
            "Wallet debited before manifestation; outcome uncertain. Manual wallet/shipment reconciliation required.",
          walletDebited: true,
        });
      }

      updatedOrders.push({
        orderId: order._id,
        orderNumber: order.externalOrderId,
        mongoOrderId: order._id,
        consigneeName: order.consigneeName,
        destinationPincode: serviceabilityPincode,
        error: manifestResult.error,
        uncertain: manifestResult.uncertain,
        reconciliationRequired: manifestResult.reconciliationRequired,
      });
      continue;
    }

    updatedOrders.push({
      orderId: order.externalOrderId,
      mongoOrderId: order._id,
      consigneeName: order.consigneeName,
      destinationPincode: serviceabilityPincode,
      awbNumber: manifestResult.awbNumber,
      childAwbs: manifestResult.childAwbs || [],
      courier: "Delhivery",
      serviceType: service,
      shipmentType: manifestResult.shipmentType,
      delhiveryPickupFacility: manifestResult.pickupFacilityName,
      delhiveryManifestStatus: "success",
    });
  }

  const successCount = updatedOrders.filter((o) => o.awbNumber).length;
  const failedCount = updatedOrders.filter((o) => o.error).length;
  const firstError = updatedOrders.find((o) => o.error)?.error;

  return {
    success: successCount > 0,
    message:
      successCount > 0
        ? "Delhivery COD shipment assignment completed"
        : firstError ||
          "No COD orders could be manifested with Delhivery.",
    data: updatedOrders,
    summary: {
      total: updatedOrders.length,
      success: successCount,
      failed: failedCount,
    },
  };
};

module.exports = {
  assignDelhiveryCodOrders,
};
