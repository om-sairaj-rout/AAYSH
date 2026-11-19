const mongoose = require("mongoose");
const { applyCompanyOrderFilter } = require("../../utils/companyScope");
const Order = require("../../models/upload/order.model");
const { assertUserCanAccessDelhiveryShipment } = require("../../utils/delhiveryShipmentHelpers");
const {
  listDelhiveryShipmentDocumentOptions,
  fetchDelhiveryShipmentDocument,
} = require("../../services/delhivery/delhiveryDocument.service");

const loadOrderForDocument = async (req, orderId) => {
  if (!mongoose.isValidObjectId(orderId)) {
    return { error: { status: 400, message: "Invalid orderId" } };
  }
  const filter = applyCompanyOrderFilter(req, { _id: orderId });
  const order = await Order.findOne(filter).lean();
  if (!order) {
    return { error: { status: 404, message: "Order not found" } };
  }
  const access = assertUserCanAccessDelhiveryShipment(order, req.user);
  if (!access.ok) {
    return { error: { status: 403, message: access.message } };
  }
  return { order };
};

const getDelhiveryShipmentDocumentOptions = async (req, res) => {
  try {
    const loaded = await loadOrderForDocument(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const result = await listDelhiveryShipmentDocumentOptions({
      orderId: loaded.order._id,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Could not load Delhivery document options",
    });
  }
};

const downloadDelhiveryShipmentDocument = async (req, res) => {
  try {
    const loaded = await loadOrderForDocument(req, req.params.orderId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        message: loaded.error.message,
      });
    }

    const docType = req.query.doc_type;
    const waybill = req.query.waybill;

    const result = await fetchDelhiveryShipmentDocument({
      orderId: loaded.order._id,
      docType,
      waybill,
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message,
        error_code: result.error_code,
      });
    }

    const payload = result.result;

    if (payload.delivery === "binary") {
      res.setHeader(
        "Content-Type",
        payload.contentType || "application/octet-stream"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${payload.filename || `${result.docType}.bin`}"`
      );
      return res.status(200).send(payload.data);
    }

    if (payload.delivery === "base64") {
      const buf = Buffer.from(payload.base64, "base64");
      res.setHeader("Content-Type", payload.contentType || "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${payload.filename || `${result.docType}.bin`}"`
      );
      return res.status(200).send(buf);
    }

    if (payload.delivery === "url") {
      return res.json({
        success: true,
        data: {
          delivery: "url",
          url: payload.url,
          docType: result.docType,
          waybill: result.waybill,
        },
      });
    }

    return res.status(502).json({
      success: false,
      message: "Unsupported Delhivery document response format.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Delhivery document fetch failed",
    });
  }
};

module.exports = {
  getDelhiveryShipmentDocumentOptions,
  downloadDelhiveryShipmentDocument,
};