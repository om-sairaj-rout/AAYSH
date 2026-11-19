const mongoose = require("mongoose");
const DelhiveryAwb = require("../../models/delhiveryAwb.model");

/**
 * Atomically take one AWB from the shared Delhivery pool for an order.
 * Future COD assignment should call this (not Trackon assignAwbCore).
 * Successful reservation triggers automatic pool replenishment in the background.
 */
const reserveDelhiveryAwbForOrder = async (orderId) => {
  if (!orderId) {
    return { success: false, message: "orderId is required" };
  }

  if (!mongoose.isValidObjectId(orderId)) {
    return { success: false, message: "Invalid orderId" };
  }

  const orderObjectId = new mongoose.Types.ObjectId(orderId);

  const awb = await DelhiveryAwb.findOneAndUpdate(
    { status: "available" },
    {
      $set: {
        status: "reserved",
        assignedOrder: orderObjectId,
      },
    },
    {
      new: true,
      sort: { createdAt: 1 },
    }
  );

  if (!awb) {
    return {
      success: false,
      message: "No Delhivery AWB available in pool",
    };
  }

  return {
    success: true,
    awbNumber: awb.awbNumber,
    awbId: awb._id,
    status: awb.status,
    assignedOrder: awb.assignedOrder,
  };
};

const releaseReservedDelhiveryAwbs = async (awbIds = []) => {
  const detail = await releaseReservedDelhiveryAwbsDetailed(awbIds);
  return {
    released: detail.released,
    matched: detail.matched,
  };
};

/**
 * Release only AWBs that are still reserved. Returns DB-confirmed release counts.
 */
const releaseReservedDelhiveryAwbsDetailed = async (awbIds = []) => {
  if (!awbIds.length) {
    return {
      expected: 0,
      matched: 0,
      released: 0,
      releasedIds: [],
      releasedNumbers: [],
      pendingIds: [],
    };
  }

  const objectIds = awbIds.map((id) =>
    mongoose.Types.ObjectId.isValid(id)
      ? new mongoose.Types.ObjectId(id)
      : id
  );

  const eligible = await DelhiveryAwb.find({
    _id: { $in: objectIds },
    status: "reserved",
  })
    .select("_id awbNumber")
    .lean();

  const expected = eligible.length;
  if (!expected) {
    return {
      expected: awbIds.length,
      matched: 0,
      released: 0,
      releasedIds: [],
      releasedNumbers: [],
      pendingIds: objectIds,
    };
  }

  const result = await DelhiveryAwb.updateMany(
    {
      _id: { $in: eligible.map((row) => row._id) },
      status: "reserved",
    },
    {
      $set: { status: "available" },
      $unset: { assignedOrder: "" },
    }
  );

  const eligibleIds = eligible.map((row) => row._id);
  const confirmedReleased = await DelhiveryAwb.find({
    _id: { $in: eligibleIds },
    status: "available",
  })
    .select("_id awbNumber")
    .lean();

  const releasedIdSet = new Set(confirmedReleased.map((row) => String(row._id)));
  const pendingIds = eligibleIds.filter((id) => !releasedIdSet.has(String(id)));

  return {
    expected: awbIds.length,
    reservedEligible: expected,
    matched: result.matchedCount || 0,
    released: confirmedReleased.length,
    releasedIds: confirmedReleased.map((row) => row._id),
    releasedNumbers: confirmedReleased.map((row) => row.awbNumber),
    pendingIds,
  };
};

const reserveDelhiveryAwbsForOrder = async (orderId, count) => {
  const needed = Math.max(1, Math.floor(Number(count) || 1));
  const reserved = [];

  for (let i = 0; i < needed; i += 1) {
    const row = await reserveDelhiveryAwbForOrder(orderId);
    if (!row.success) {
      await releaseReservedDelhiveryAwbs(reserved.map((r) => r.awbId));
      return {
        success: false,
        message: row.message || "Insufficient Delhivery AWBs in pool",
        reservedCount: reserved.length,
      };
    }
    reserved.push(row);
  }

  return {
    success: true,
    awbs: reserved,
    masterAwb: reserved[0].awbNumber,
    childAwbs: reserved.slice(1).map((r) => r.awbNumber),
  };
};

const countReservedDelhiveryAwbsForOrder = async (orderId) => {
  if (!orderId) return 0;
  const orderObjectId = mongoose.Types.ObjectId.isValid(orderId)
    ? new mongoose.Types.ObjectId(orderId)
    : null;
  if (!orderObjectId) return 0;
  return DelhiveryAwb.countDocuments({
    assignedOrder: orderObjectId,
    status: "reserved",
  });
};

/** Release only AWBs assigned to this order in reserved status. */
const releaseReservedDelhiveryAwbsForOrder = async (orderId) => {
  if (!orderId) {
    return { released: 0, reservedRemaining: 0 };
  }
  const orderObjectId = mongoose.Types.ObjectId.isValid(orderId)
    ? new mongoose.Types.ObjectId(orderId)
    : null;
  if (!orderObjectId) {
    return { released: 0, reservedRemaining: 0 };
  }

  const reserved = await DelhiveryAwb.find({
    assignedOrder: orderObjectId,
    status: "reserved",
  })
    .select("_id")
    .lean();

  const releaseResult = await releaseReservedDelhiveryAwbs(
    reserved.map((row) => row._id)
  );
  const reservedRemaining = await countReservedDelhiveryAwbsForOrder(orderId);

  return {
    released: releaseResult.released || 0,
    reservedRemaining,
  };
};

const markDelhiveryAwbsBooked = async (awbNumbers = [], orderId) => {
  if (!awbNumbers.length) return { updated: 0 };
  const orderObjectId = mongoose.Types.ObjectId.isValid(orderId)
    ? new mongoose.Types.ObjectId(orderId)
    : null;

  const result = await DelhiveryAwb.updateMany(
    {
      awbNumber: { $in: awbNumbers },
      status: "reserved",
    },
    {
      $set: {
        status: "booked",
        ...(orderObjectId ? { assignedOrder: orderObjectId } : {}),
      },
    }
  );

  return { updated: result.modifiedCount || 0 };
};

module.exports = {
  reserveDelhiveryAwbForOrder,
  reserveDelhiveryAwbsForOrder,
  releaseReservedDelhiveryAwbs,
  releaseReservedDelhiveryAwbsDetailed,
  releaseReservedDelhiveryAwbsForOrder,
  countReservedDelhiveryAwbsForOrder,
  markDelhiveryAwbsBooked,
};
