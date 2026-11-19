const DelhiveryAwb = require("../../models/delhiveryAwb.model");
const { DelhiveryAwbPoolMeta } = require("../../models/delhiveryAwbPoolMeta.model");
const { isValidAwbNumber } = require("./delhiveryWaybillApi");

const MAX_HISTORY = 30;

const countByStatus = async () => {
  const [available, reserved, assigned, used, booked, failed, total] =
    await Promise.all([
      DelhiveryAwb.countDocuments({ status: "available" }),
      DelhiveryAwb.countDocuments({ status: "reserved" }),
      DelhiveryAwb.countDocuments({ status: "assigned" }),
      DelhiveryAwb.countDocuments({ status: "used" }),
      DelhiveryAwb.countDocuments({ status: "booked" }),
      DelhiveryAwb.countDocuments({ status: "failed" }),
      DelhiveryAwb.countDocuments({}),
    ]);

  return {
    available,
    reserved,
    assigned,
    used,
    booked,
    failed,
    total,
    used_or_assigned: assigned + used + booked,
  };
};

const saveWaybillNumbers = async ({
  awbNumbers = [],
  source,
  metadata = null,
}) => {
  const valid = [];
  let invalid = 0;

  awbNumbers.forEach((n) => {
    const trimmed = String(n || "").trim();
    if (isValidAwbNumber(trimmed)) {
      valid.push(trimmed);
    } else {
      invalid += 1;
    }
  });

  const unique = [...new Set(valid)];
  if (!unique.length) {
    return {
      received: awbNumbers.length,
      valid: 0,
      saved: 0,
      duplicates: 0,
      invalid,
    };
  }

  const docs = unique.map((awbNumber) => ({
    awbNumber,
    source,
    status: "available",
    courier: "Delhivery",
    metadata,
  }));

  let saved = 0;
  let duplicates = 0;

  for (const doc of docs) {
    try {
      await DelhiveryAwb.create(doc);
      saved += 1;
    } catch (err) {
      if (err.code === 11000) {
        duplicates += 1;
      } else {
        throw err;
      }
    }
  }

  return {
    received: awbNumbers.length,
    valid: unique.length,
    saved,
    duplicates,
    invalid,
  };
};

const appendFetchHistory = async (entry) => {
  const meta = await DelhiveryAwbPoolMeta.getPoolMeta();
  const history = Array.isArray(meta.fetchHistory) ? [...meta.fetchHistory] : [];
  history.unshift(entry);
  meta.fetchHistory = history.slice(0, MAX_HISTORY);
  await meta.save();
};

const updateReplenishmentMeta = async (patch, historyEntry) => {
  const meta = await DelhiveryAwbPoolMeta.getPoolMeta();
  Object.assign(meta, patch);
  if (historyEntry) {
    const history = Array.isArray(meta.fetchHistory)
      ? [...meta.fetchHistory]
      : [];
    history.unshift(historyEntry);
    meta.fetchHistory = history.slice(0, MAX_HISTORY);
  }
  await meta.save();
  return meta;
};

const listDelhiveryAwbs = async ({
  status,
  search,
  page = 1,
  perPage = 50,
}) => {
  const filter = {};
  if (status && status !== "all") {
    filter.status = status;
  }
  if (search) {
    filter.awbNumber = { $regex: String(search).trim(), $options: "i" };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePerPage = Math.min(200, Math.max(1, Number(perPage) || 50));
  const skip = (safePage - 1) * safePerPage;

  const [rows, total] = await Promise.all([
    DelhiveryAwb.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safePerPage)
      .lean(),
    DelhiveryAwb.countDocuments(filter),
  ]);

  return {
    data: rows,
    pagination: {
      total,
      count: rows.length,
      per_page: safePerPage,
      current_page: safePage,
      total_pages: Math.ceil(total / safePerPage) || 1,
    },
  };
};

const getPoolStatus = async () => {
  const [counts, meta] = await Promise.all([
    countByStatus(),
    DelhiveryAwbPoolMeta.getPoolMeta(),
  ]);

  return {
    counts,
    replenishment: {
      running: Boolean(meta.replenishmentRunning),
      lock_until: meta.replenishmentLockUntil,
      last_status: meta.lastReplenishmentStatus,
      last_at: meta.lastReplenishmentAt,
      last_bulk_request_at: meta.lastBulkRequestAt,
      last_requested: meta.lastRequestedCount,
      last_received: meta.lastReceivedCount,
      last_saved: meta.lastSavedCount,
      last_duplicates: meta.lastDuplicateCount,
      last_invalid: meta.lastInvalidCount,
      last_error: meta.lastError,
      last_trigger: meta.lastTrigger,
    },
    fetch_history: meta.fetchHistory || [],
  };
};

module.exports = {
  countByStatus,
  saveWaybillNumbers,
  appendFetchHistory,
  updateReplenishmentMeta,
  listDelhiveryAwbs,
  getPoolStatus,
};
