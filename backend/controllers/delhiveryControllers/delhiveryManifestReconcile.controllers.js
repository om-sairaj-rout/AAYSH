const crypto = require("crypto");

const mongoose = require("mongoose");

const Order = require("../../models/upload/order.model");

const DelhiveryShipmentManifest = require("../../models/delhiveryShipmentManifest.model");

const {

  releaseReservedDelhiveryAwbsDetailed,

  countReservedDelhiveryAwbsForOrder,

} = require("../../services/delhivery/delhiveryAwbReservation");

const DelhiveryAwb = require("../../models/delhiveryAwb.model");

const { isUnrestrictedAdmin } = require("../../utils/permissions");

const { RECONCILIATION_MESSAGE } = require("../../services/delhivery/delhiveryManifestLock");

const {

  RECONCILIATION_PHASE,

  isReconciliationManifestState,

  assertOrderManifestCompanyMatch,

  canAcquireReconciliationClaim,

  buildReconciliationClaimFilter,

  verifyReservedAwbsAgainstManifest,

  evaluateAwbReleaseOutcome,

} = require("../../services/delhivery/delhiveryManifestReconcileLogic");



const fetchReservedAwbsForOrder = async (orderId) =>

  DelhiveryAwb.find({

    assignedOrder: orderId,

    status: "reserved",

  })

    .select("_id awbNumber")

    .lean();



const resolveReleaseTargets = async (manifest, orderId) => {

  const reservedAwbs = await fetchReservedAwbsForOrder(orderId);

  const verify = verifyReservedAwbsAgainstManifest(reservedAwbs, manifest);

  if (!verify.ok) {

    return { ok: false, message: verify.message, awbIds: [], awbs: [] };

  }

  return {

    ok: true,

    awbIds: verify.releasableAwbs.map((row) => row._id),

    awbs: verify.releasableAwbs,

  };

};



const markReconciliationFailed = async ({

  manifestId,

  claimToken,

  message,

  pendingAwbIds = [],

  note,

}) => {

  await DelhiveryShipmentManifest.updateOne(

    { _id: manifestId, reconciliationClaimToken: claimToken },

    {

      $set: {

        reconciliationPhase: RECONCILIATION_PHASE.FAILED,

        reconciliationClaimToken: "",

        reconciliationPendingAwbIds: pendingAwbIds,

        reconciliationLastError: String(message || "").slice(0, 500),

        ...(note ? { reconciliationNote: String(note).slice(0, 500) } : {}),

      },

    }

  );

};



/**

 * Manual reconciliation only — does not call Delhivery APIs.

 * Admin confirms no shipment was created on Delhivery before releasing reserved AWBs.

 */

const adminReleaseDelhiveryManifestReconciliation = async (req, res) => {

  try {

    if (!isUnrestrictedAdmin(req.user)) {

      return res.status(403).json({

        success: false,

        message: "Forbidden",

      });

    }



    const { orderId } = req.params;

    const { confirmed_no_shipment, note } = req.body || {};



    if (confirmed_no_shipment !== true) {

      return res.status(400).json({

        success: false,

        message:

          "Set confirmed_no_shipment: true after verifying Delhivery has no active shipment for this order.",

      });

    }



    const reconciliationNote = String(note || "").trim();

    if (!reconciliationNote) {

      return res.status(400).json({

        success: false,

        message: "A non-empty reconciliation note is required.",

      });

    }



    if (!mongoose.isValidObjectId(orderId)) {

      return res.status(400).json({

        success: false,

        message: "Invalid orderId",

      });

    }



    const order = await Order.findById(orderId)

      .select("companyID externalOrderId")

      .lean();

    if (!order) {

      return res.status(404).json({

        success: false,

        message: "Order not found",

      });

    }



    const manifest = await DelhiveryShipmentManifest.findOne({ orderId });

    if (!manifest) {

      return res.status(404).json({

        success: false,

        message: "Manifest record not found",

      });

    }



    const companyCheck = assertOrderManifestCompanyMatch(order, manifest);

    if (!companyCheck.ok) {

      return res.status(400).json({

        success: false,

        message: companyCheck.message,

      });

    }



    if (!isReconciliationManifestState(manifest)) {

      return res.status(400).json({

        success: false,

        message: "Order is not in a reconciliation-required manifest state.",

      });

    }



    const claimCheck = canAcquireReconciliationClaim(manifest);

    if (!claimCheck.ok) {

      const message =

        claimCheck.reason === "CLAIM_ACTIVE"

          ? "Reconciliation is in progress by another administrator. Retry when the claim is stale or after it fails."

          : claimCheck.reason === "ALREADY_COMPLETED"

            ? "Reconciliation has already been completed for this manifest."

            : "Reconciliation cannot be started for this manifest.";

      return res.status(409).json({ success: false, message });

    }



    const targets = await resolveReleaseTargets(manifest, orderId);

    if (!targets.ok) {

      return res.status(400).json({ success: false, message: targets.message });

    }



    const reservedRemainingBefore = await countReservedDelhiveryAwbsForOrder(

      orderId

    );

    if (!targets.awbIds.length) {

      if (reservedRemainingBefore === 0) {

        const reconciledAt = new Date();

        await DelhiveryShipmentManifest.updateOne(

          { _id: manifest._id },

          {

            $set: {

              reconciliationPhase: RECONCILIATION_PHASE.COMPLETED,

              reconciliationClaimToken: "",

              reconciliationPendingAwbIds: [],

              reconciliationLastError: "",

              reconciledAt,

              reconciledBy: req.user?.id || null,

              manifestStatus: "failed",

              reconciliationRequired: false,

              reconciliationNote: reconciliationNote.slice(0, 500),

              lastError: `Manual reconciliation: no reserved AWBs remained. ${RECONCILIATION_MESSAGE}`,

              lockOwnerToken: "",

            },

          }

        );

        return res.json({

          success: true,

          message: "Reconciliation completed; no reserved AWBs remained.",

          released_awbs: [],

          released_count: 0,

          reconciledAt,

        });

      }

      return res.status(400).json({

        success: false,

        message: "No reserved Delhivery AWBs found for this order.",

      });

    }



    const claimToken = crypto.randomBytes(16).toString("hex");

    const claimedAt = new Date();

    const claimedBy = req.user?.id || null;



    const claim = await DelhiveryShipmentManifest.findOneAndUpdate(

      buildReconciliationClaimFilter(manifest._id),

      {

        $set: {

          reconciliationPhase: RECONCILIATION_PHASE.IN_PROGRESS,

          reconciliationClaimToken: claimToken,

          reconciliationClaimedAt: claimedAt,

          reconciliationClaimedBy: claimedBy,

          reconciliationLastError: "",

        },

      },

      { new: true }

    );



    if (!claim) {

      return res.status(409).json({

        success: false,

        message:

          "Reconciliation already in progress or completed for this manifest.",

      });

    }



    try {

      const releaseDetail = await releaseReservedDelhiveryAwbsDetailed(

        targets.awbIds

      );



      const outcome = evaluateAwbReleaseOutcome({

        expectedCount: releaseDetail.reservedEligible,

        releasedCount: releaseDetail.released,

        releasedNumbers: releaseDetail.releasedNumbers,

      });



      const reservedRemainingAfter = await countReservedDelhiveryAwbsForOrder(

        orderId

      );

      const remainingDocs = reservedRemainingAfter

        ? await fetchReservedAwbsForOrder(orderId)

        : [];



      const fullyReleased =

        outcome.complete &&

        releaseDetail.released === releaseDetail.reservedEligible &&

        reservedRemainingAfter === 0;



      if (!fullyReleased) {

        const failureMessage =

          reservedRemainingAfter > 0

            ? outcome.message ||

              `Partial AWB release: ${releaseDetail.released} released; ${reservedRemainingAfter} still reserved.`

            : outcome.message ||

              "AWB release did not complete. No AWBs were confirmed released.";



        await markReconciliationFailed({

          manifestId: manifest._id,

          claimToken,

          message: failureMessage,

          pendingAwbIds: remainingDocs.map((row) => row._id),

          note: reconciliationNote,

        });



        return res.status(releaseDetail.released > 0 ? 502 : 500).json({

          success: false,

          reconciliationPhase: RECONCILIATION_PHASE.FAILED,

          message: failureMessage,

          released_count: releaseDetail.released,

          released_awbs: releaseDetail.releasedNumbers,

          reserved_remaining: reservedRemainingAfter,

          retryable: true,

        });

      }



      const reconciledAt = new Date();

      const finalized = await DelhiveryShipmentManifest.updateOne(

        {

          _id: manifest._id,

          reconciliationClaimToken: claimToken,

        },

        {

          $set: {

            reconciliationPhase: RECONCILIATION_PHASE.COMPLETED,

            reconciliationClaimToken: "",

            reconciliationPendingAwbIds: [],

            reconciliationLastError: "",

            reconciledAt,

            reconciledBy: claimedBy,

            manifestStatus: "failed",

            reconciliationRequired: false,

            reconciliationNote: reconciliationNote.slice(0, 500),

            lastError: `Manual reconciliation: reserved AWBs released. ${RECONCILIATION_MESSAGE}`,

            lockOwnerToken: "",

          },

        }

      );



      if (!finalized.modifiedCount) {

        return res.status(409).json({

          success: false,

          message:

            "Reconciliation claim was lost before completion. Retry if AWBs remain reserved.",

        });

      }



      return res.json({

        success: true,

        message:

          "Reserved AWBs released after manual confirmation. You may retry manifestation with new AWBs if appropriate.",

        released_awbs: releaseDetail.releasedNumbers,

        released_count: releaseDetail.released,

        reconciledAt,

        reconciliationPhase: RECONCILIATION_PHASE.COMPLETED,

      });

    } catch (releaseErr) {

      const remainingDocs = await fetchReservedAwbsForOrder(orderId);

      await markReconciliationFailed({

        manifestId: manifest._id,

        claimToken,

        message:

          releaseErr.message ||

          "AWB release failed during reconciliation. Retry reconciliation.",

        pendingAwbIds: remainingDocs.map((row) => row._id),

        note: reconciliationNote,

      });



      return res.status(500).json({

        success: false,

        reconciliationPhase: RECONCILIATION_PHASE.FAILED,

        message:

          releaseErr.message ||

          "AWB release failed during reconciliation. Retry reconciliation.",

        retryable: true,

      });

    }

  } catch (err) {

    console.error(err);

    return res.status(500).json({

      success: false,

      message: err.message || "Reconciliation action failed",

    });

  }

};



module.exports = {

  adminReleaseDelhiveryManifestReconciliation,

  resolveReleaseTargets,

  markReconciliationFailed,

};


