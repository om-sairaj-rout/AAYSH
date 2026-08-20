const Order = require("../../models/upload/order.model");
const Shipping = require("../../models/upload/shipping.model");
const Company = require("../../models/company.model");
const getCategory = require("../../utils/categoryMapper");
const getExpectedHours = require("../../utils/tatMapper");
const { resolveInvoiceFields } = require("../../utils/invoiceCalculations");
const { parseISODateOnly, now } = require("../../utils/dateTime");
const { resolveOrderExternalId } = require("../../utils/generateOrderId");
const { resolveOrderWeights } = require("../../utils/weightCalculations");
const { parseNoOfBoxes } = require("../../utils/parseNoOfBoxes");
const {
  parseDocumentTypes,
  validateHighValueDocuments,
  uploadOrderDocuments,
} = require("../../utils/orderDocuments");
const {
  normalizeCreateOrderPayload,
  validateNormalizedCreateOrder,
} = require("../../utils/normalizeCreateOrderPayload");

const generateId = () =>
  Math.floor(10000000 + Math.random() * 90000000).toString();

const generateUniqueShipmentId = async () => {
  let id;
  while (true) {
    id = generateId();
    const exists = await Shipping.exists({ shipmentId: id });
    if (!exists) return id;
  }
};

const generateInvoiceNo = () =>
  `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

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

    const validationError = validateNormalizedCreateOrder(body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    const companyID = String(
      body.company_id || req.user.companyID || ""
    )
      .trim()
      .toUpperCase();

    if (!companyID) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required to create an order",
      });
    }

    let externalOrderId;
    try {
      externalOrderId = await resolveOrderExternalId({
        body: {
          order_id: body.order_id,
          order_id_mode: body.order_id_mode,
          order_id_sequence: body.order_id_sequence,
        },
        companyID,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const existingOrder = await Order.exists({ externalOrderId });
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        error: "Duplicate Order ID already exists",
      });
    }

    const invoiceFields = resolveInvoiceFields({
      invoiceNo: body.invoice_no,
      invoiceValue: body.invoice_value,
      orderItems: body.orderItems,
      shippingCharges: body.shipping_charges,
      giftwrapCharges: body.giftwrap_charges,
      transactionCharges: body.transaction_charges,
      generateInvoiceNo,
    });

    const documentTypes = parseDocumentTypes(
      body.document_types || rawBody.document_types || req.body.document_types
    );
    const files = Array.isArray(req.files) ? req.files : [];

    const highValueError = validateHighValueDocuments(
      invoiceFields.invoiceValue,
      documentTypes
    );
    if (highValueError) {
      return res.status(400).json({
        success: false,
        error: highValueError,
      });
    }

    if (files.length > 0 && documentTypes.length !== files.length) {
      return res.status(400).json({
        success: false,
        error: "Each uploaded document must have a matching document type",
      });
    }

    const weights = resolveOrderWeights({
      weight: body.weight,
      length: body.length,
      breadth: body.breadth,
      height: body.height,
    });

    let noOfBoxes;
    try {
      noOfBoxes = parseNoOfBoxes(body.no_of_boxes);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const category = getCategory(body.destinationCity, body.destinationState);
    const serviceType = "surface";
    const expectedHours = getExpectedHours(category, serviceType);

    let consignorName = String(body.consignor_name || "").trim();
    if (!consignorName) {
      consignorName = String(req.user.companyName || "").trim();
    }

    const [shipmentId, company] = await Promise.all([
      generateUniqueShipmentId(),
      !consignorName && companyID
        ? Company.findOne({ companyID }).select("companyName").lean()
        : Promise.resolve(null),
    ]);

    if (!consignorName && company?.companyName) {
      consignorName = String(company.companyName).trim();
    }

    const order = await Order.create({
      uploadedBy: req.user.id,
      companyID,
      externalOrderId,
      orderDate: body.order_date
        ? parseISODateOnly(body.order_date) || now()
        : now(),
      consignorName,
      consignorPhone: String(
        body.consignor_phone || req.user.mobile_number || ""
      ).trim(),
      consigneeName: body.consigneeName,
      consigneeLastName: body.consigneeLastName,
      address: body.address,
      address2: body.address2,
      destinationCity: body.destinationCity,
      destinationState: body.destinationState,
      destinationPincode: body.destinationPincode,
      destinationCountry: body.destinationCountry,
      consigneeEmail: body.consigneeEmail,
      billingPhone: body.billingPhone,
      billingAlternatePhone: body.billingAlternatePhone,
      paymentMethod: body.paymentMethod,
      comment: body.comment,
      orderItems: invoiceFields.orderItems,
      subTotal: invoiceFields.subTotal,
      shippingCharges: Number(body.shipping_charges || 0),
      giftwrapCharges: Number(body.giftwrap_charges || 0),
      transactionCharges: Number(body.transaction_charges || 0),
      invoiceNo: invoiceFields.invoiceNo,
      invoiceValue: invoiceFields.invoiceValue,
      totalDiscount: body.total_discount || 0,
      weight: weights.actualWeight,
      actualWeight: weights.actualWeight,
      volumetricWeight: weights.volumetricWeight,
      chargeableWeight: weights.chargeableWeight,
      length: Number(body.length || 0),
      breadth: Number(body.breadth || 0),
      height: Number(body.height || 0),
      noOfBoxes,
      category,
      expectedHours,
      documents: [],
    });

    if (files.length > 0) {
      const uploadedDocuments = await uploadOrderDocuments({
        orderId: order._id,
        files,
        documentTypes,
      });
      order.documents = uploadedDocuments;
      await order.save();
    }

    const shipping = await Shipping.create({
      orderId: order._id,
      shipmentId,
      pickupLocation: body.pickup_location,
      shippingStatus: "Pending",
      serviceType,
      totalWeight: weights.chargeableWeight,
      shippingCharges: body.shipping_charges || 0,
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

    return res.status(500).json({
      success: false,
      error: "Failed to create order",
      message: error.message,
    });
  }
};

module.exports = createCustomOrder;
