const {
  createOrderWithShipping,
  normalizeCreateOrderPayload,
  parseDocumentTypes,
} = require("../../utils/createOrderWithShipping");

const parseCreateOrderBody = (req) => {
  if (req.body?.data) {
    try {
      return typeof req.body.data === "string"
        ? JSON.parse(req.body.data)
        : req.body.data;
    } catch {
      throw new Error("Invalid order payload JSON");
    }
  }
  return req.body || {};
};

const createCustomOrder = async (req, res) => {
  try {
    const rawBody = parseCreateOrderBody(req);
    const body = normalizeCreateOrderPayload(rawBody);

    const documentTypes = parseDocumentTypes(
      body.document_types || rawBody.document_types || req.body.document_types
    );
    const files = Array.isArray(req.files) ? req.files : [];

    const { order, shipping, invoiceFields } = await createOrderWithShipping({
      body: rawBody,
      user: req.user,
      files,
      documentTypes,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order_id: order.externalOrderId,
      shipment_id: shipping.shipmentId,
      status: "NEW",
      awb_code: null,
      courier_name: null,
      billing_phone: order.billingPhone,
      invoice_no: order.invoiceNo,
      invoice_value: order.invoiceValue,
      chargeable_weight: order.chargeableWeight,
      no_of_boxes: order.noOfBoxes,
      documents_count: order.documents?.length || 0,
      destination_pincode: order.destinationPincode,
      consignee_name: `${order.consigneeName} ${order.consigneeLastName}`.trim(),
    });
  } catch (error) {
    console.error(error);

    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Duplicate Order ID already exists",
      });
    }

    if (error.statusCode === 400 || error.statusCode === 409) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create order",
    });
  }
};

module.exports = createCustomOrder;
