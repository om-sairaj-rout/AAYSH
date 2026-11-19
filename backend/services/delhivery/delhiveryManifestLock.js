const crypto = require("crypto");

const DelhiveryShipmentManifest = require("../../models/delhiveryShipmentManifest.model");

const {

  releaseReservedDelhiveryAwbsForOrder,

  countReservedDelhiveryAwbsForOrder,

} = require("./delhiveryAwbReservation");



/** In-flight window; expiry does NOT authorize a second CMU if request was sent. */

const LOCK_TTL_MS = 10 * 60 * 1000;



const RECONCILIATION_MESSAGE =

  "Delhivery manifestation requires manual reconciliation. A prior request may have reached Delhivery.";



const LOCK_LOST_MESSAGE = "Lost manifestation lock.";



const throwLockLost = () => {

  const err = new Error(LOCK_LOST_MESSAGE);

  err.code = "LOCK_LOST";

  throw err;

};



const assertLockOwnerUpdate = (result) => {

  if (!result?.modifiedCount) {

    throwLockLost();

  }

  return result;

};



const recoverStaleRunningLock = async (existing) => {

  const lockExpiresAt = existing.lockExpiresAt

    ? new Date(existing.lockExpiresAt).getTime()

    : 0;

  const isExpired = !lockExpiresAt || Date.now() >= lockExpiresAt;



  if (!isExpired) {

    return { inProgress: true, manifest: existing };

  }



  if (!existing.cmuRequestSentAt) {

    const releaseOutcome = await releaseReservedDelhiveryAwbsForOrder(

      existing.orderId

    );

    if (releaseOutcome.reservedRemaining > 0) {

      await DelhiveryShipmentManifest.updateOne(

        {

          _id: existing._id,

          manifestStatus: "running",

          lockOwnerToken: existing.lockOwnerToken,

        },

        {

          $set: {

            lastError:

              "Stale manifestation recovery blocked: reserved Delhivery AWBs could not be released. Manual intervention required.",

            reconciliationRequired: true,

            reconciliationNote:

              "Stale pre-CMU lock; AWB release incomplete. Verify pool before retry.",

          },

        }

      );

      return {

        recoveryBlocked: true,

        safeToRetry: false,

        reconciliationRequired: true,

        message:

          "Stale manifestation could not clear reserved AWBs. Resolve AWB reservations before retry.",

      };

    }



    const cleared = await DelhiveryShipmentManifest.updateOne(

      {

        _id: existing._id,

        manifestStatus: "running",

        lockOwnerToken: existing.lockOwnerToken,

      },

      {

        $set: {

          manifestStatus: "failed",

          lastError:

            "Stale manifestation lock cleared (no CMU request recorded). Reserved AWBs released. Safe to retry.",

          lockOwnerToken: "",

          lockExpiresAt: null,

        },

      }

    );



    if (!cleared.modifiedCount) {

      return { inProgress: true, manifest: existing };

    }



    return { recovered: true, safeToRetry: true, awbsReleased: releaseOutcome.released };

  }



  const updated = await DelhiveryShipmentManifest.updateOne(

    {

      _id: existing._id,

      manifestStatus: "running",

      lockOwnerToken: existing.lockOwnerToken,

    },

    {

      $set: {

        manifestStatus: "reconciliation_required",

        reconciliationRequired: true,

        reconciliationNote:

          "Lock expired after CMU HTTP request was initiated. Verify Delhivery dashboard before retry.",

        lastError: RECONCILIATION_MESSAGE,

        lockOwnerToken: "",

        lockExpiresAt: null,

      },

    }

  );



  if (!updated.modifiedCount) {

    return { inProgress: true, manifest: existing };

  }



  return {

    reconciliationRequired: true,

    manifest: existing,

    message: RECONCILIATION_MESSAGE,

  };

};



const acquireManifestLock = async (orderId, companyID, externalOrderId) => {

  const reservedPending = await countReservedDelhiveryAwbsForOrder(orderId);

  if (reservedPending > 0) {

    return {

      locked: false,

      duplicate: true,

      inProgress: true,

      message:

        "Delhivery AWBs are still reserved for this order. Complete reconciliation or wait for stale lock recovery before retry.",

    };

  }



  const existing = await DelhiveryShipmentManifest.findOne({ orderId }).lean();



  if (existing?.manifestStatus === "success") {

    return {

      locked: false,

      duplicate: true,

      manifest: existing,

    };

  }



  if (

    existing?.manifestStatus === "uncertain" ||

    existing?.manifestStatus === "reconciliation_required" ||

    existing?.reconciliationRequired

  ) {

    return {

      locked: false,

      uncertain: true,

      reconciliationRequired: true,

      manifest: existing,

      message: existing.lastError || RECONCILIATION_MESSAGE,

      walletShouldReconcile: true,

    };

  }



  if (existing?.manifestStatus === "running") {

    const stale = await recoverStaleRunningLock(existing);

    if (stale.inProgress) {

      return {

        locked: false,

        duplicate: true,

        inProgress: true,

        manifest: existing,

      };

    }

    if (stale.reconciliationRequired || stale.recoveryBlocked) {

      return {

        locked: false,

        uncertain: true,

        reconciliationRequired: true,

        message: stale.message,

        walletShouldReconcile: true,

      };

    }

    if (!stale.safeToRetry) {

      return {

        locked: false,

        duplicate: true,

        inProgress: true,

      };

    }

  }



  const lockOwnerToken = crypto.randomBytes(16).toString("hex");

  const lockExpiresAt = new Date(Date.now() + LOCK_TTL_MS);



  const manifest = await DelhiveryShipmentManifest.findOneAndUpdate(

    {

      orderId,

      manifestStatus: {

        $nin: [

          "success",

          "running",

          "uncertain",

          "reconciliation_required",

        ],

      },

    },

    {

      $set: {

        orderId,

        companyID,

        externalOrderId,

        manifestStatus: "running",

        lockOwnerToken,

        lockExpiresAt,

        cmuRequestSentAt: null,

        idempotencyKey: lockOwnerToken,

        reconciliationRequired: false,

        reconciliationNote: "",

        lastError: "",

      },

      $setOnInsert: {

        shipmentType: "SPS",

        childAwbs: [],

      },

    },

    { upsert: true, new: true }

  );



  if (!manifest || manifest.lockOwnerToken !== lockOwnerToken) {

    return {

      locked: false,

      duplicate: true,

      inProgress: true,

    };

  }



  return { locked: true, manifest, lockOwnerToken };

};



const updateManifestWithLock = async (manifestId, lockOwnerToken, patch) => {

  if (!manifestId || !lockOwnerToken) {

    throwLockLost();

  }

  const result = await DelhiveryShipmentManifest.updateOne(

    { _id: manifestId, lockOwnerToken, manifestStatus: "running" },

    { $set: patch }

  );

  return assertLockOwnerUpdate(result);

};



const finalizeManifestWithLock = async (

  manifestId,

  lockOwnerToken,

  patch,

  allowedFrom = ["running"],

  { strict = true } = {}

) => {

  const result = await DelhiveryShipmentManifest.updateOne(

    {

      _id: manifestId,

      lockOwnerToken,

      manifestStatus: { $in: allowedFrom },

    },

    {

      $set: {

        ...patch,

        lockOwnerToken: "",

        lockExpiresAt: null,

      },

    }

  );

  if (strict) {

    return assertLockOwnerUpdate(result);

  }

  return result;

};



const markCmuRequestSent = async (manifestId, lockOwnerToken) => {

  const result = await DelhiveryShipmentManifest.findOneAndUpdate(

    {

      _id: manifestId,

      lockOwnerToken,

      manifestStatus: "running",

      cmuRequestSentAt: null,

    },

    { $set: { cmuRequestSentAt: new Date() } },

    { new: true }

  );

  return Boolean(result);

};



module.exports = {

  LOCK_TTL_MS,

  RECONCILIATION_MESSAGE,

  LOCK_LOST_MESSAGE,

  acquireManifestLock,

  updateManifestWithLock,

  finalizeManifestWithLock,

  markCmuRequestSent,

  recoverStaleRunningLock,

  assertLockOwnerUpdate,

};


