const {
  getPoolStatus,
  listDelhiveryAwbs,
} = require("../../services/delhivery/delhiveryAwbPoolService");
const {
  runBulkFetchAndStore,
  runSingleFetchAndStore,
  maybeAutoReplenish,
} = require("../../services/delhivery/delhiveryAwbReplenishment");
const {
  isAutoReplenishEnabled,
  getReplenishThreshold,
  getReplenishBatchSize,
} = require("../../config/delhiveryAwbConfig");

const getDelhiveryAwbPoolStatus = async (req, res) => {
  try {
    const status = await getPoolStatus();
    return res.json({
      success: true,
      auto_replenish_enabled: isAutoReplenishEnabled(),
      replenish_threshold: getReplenishThreshold(),
      replenish_batch_size: getReplenishBatchSize(),
      ...status,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load Delhivery AWB pool status",
    });
  }
};

const listDelhiveryAwbsController = async (req, res) => {
  try {
    const { status, search, page, per_page } = req.query;
    const result = await listDelhiveryAwbs({
      status,
      search,
      page,
      perPage: per_page,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to list Delhivery AWBs",
    });
  }
};

const bulkFetchDelhiveryAwbs = async (req, res) => {
  try {
    const count = Number(req.body?.count ?? req.query?.count);
    if (!Number.isFinite(count) || count < 1 || count > 10000) {
      return res.status(400).json({
        success: false,
        message: "count must be an integer between 1 and 10000",
      });
    }

    const result = await runBulkFetchAndStore({
      count: Math.floor(count),
      trigger: "manual",
      respectCooldown: true,
    });

    if (result.skipped) {
      return res.status(429).json({ success: false, ...result });
    }

    if (!result.success) {
      const code = result.error_code === "AUTH_ERROR" ? 401 : 502;
      return res.status(code).json({ success: false, ...result });
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Delhivery bulk AWB fetch failed",
    });
  }
};

const singleFetchDelhiveryAwb = async (req, res) => {
  try {
    const result = await runSingleFetchAndStore({ trigger: "manual" });
    if (!result.success) {
      const code = result.error_code === "AUTH_ERROR" ? 401 : 502;
      return res.status(code).json({ success: false, ...result });
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Delhivery single AWB fetch failed",
    });
  }
};

const triggerAutoReplenishNow = async (req, res) => {
  try {
    const result = await maybeAutoReplenish("manual_auto_trigger");
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Auto replenishment check failed",
    });
  }
};

module.exports = {
  getDelhiveryAwbPoolStatus,
  listDelhiveryAwbsController,
  bulkFetchDelhiveryAwbs,
  singleFetchDelhiveryAwb,
  triggerAutoReplenishNow,
};
