const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Company = require("../models/company.model");
const getCategory = require("./categoryMapper");
const getExpectedHours = require("./tatMapper");
const { resolveInvoiceFields } = require("./invoiceCalculations");
const { resolveInvoiceGeneration } = require("./invoiceGenerationPolicy");
const { parseISODateOnly, now } = require("./dateTime");
const { resolveOrderExternalId } = require("./generateOrderId");
const { resolveOrderWeights } = require("./weightCalculations");
const { parseNoOfBoxes } = require("./parseNoOfBoxes");
const {
  parseDocumentTypes,
  validateHighValueDocuments,
  uploadOrderDocuments,
} = require("./orderDocuments");
const {
  normalizeCreateOrderPayload,
  validateNormalizedCreateOrder,
} = require("./normalizeCreateOrderPayload");
const { enrichNormalizedOrderFromCatalog } = require("./catalogOrderEnrichment");

const { generateUniqueShipmentId } = require("./generateShipmentId");

const generateInvoiceNo = () =>
  `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

/**
 * Create Order + Shipping from a normalized flat body.
 * @returns {{ order, shipping, invoiceFields, generation }}
 */
const createOrderWithShipping = async ({
  body,
  user,
  files = [],
  documentTypes = [],
  options = {},
}) => {
  let normalized = normalizeCreateOrderPayload(body);

  const companyID = String(
    normalized.company_id || user?.companyID || options.companyID || ""
  )
    .trim()
    .toUpperCase();

  if (!companyID) {
    const error = new Error("Company ID is required to create an order");
    error.statusCode = 400;
    throw error;
  }

  normalized = await enrichNormalizedOrderFromCatalog({
    normalized,
    companyID,
  });

  const validationError = validateNormalizedCreateOrder(normalized);
  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const externalOrderId = await resolveOrderExternalId({
    body: {
      order_id: normalized.order_id,
      order_id_mode: normalized.order_id_mode,
      order_id_sequence: normalized.order_id_sequence,
    },
    companyID,
  });

  const generation = await resolveInvoiceGeneration({
    invoiceNo: normalized.invoice_no,
    invoiceValue: normalized.invoice_value,
    orderItems: normalized.orderItems,
    generateInvoiceNo,
  });

  const invoiceFields = resolveInvoiceFields({
    invoiceNo: generation.resolvedInvoiceNo,
    invoiceValue: normalized.invoice_value,
    orderItems: normalized.orderItems,
    shippingCharges: normalized.shipping_charges,
    giftwrapCharges: normalized.giftwrap_charges,
    transactionCharges: normalized.transaction_charges,
  });

  const highValueError = validateHighValueDocuments(
    invoiceFields.invoiceValue,
    documentTypes
  );
  if (highValueError) {
    const error = new Error(highValueError);
    error.statusCode = 400;
    throw error;
  }

  if (files.length > 0 && documentTypes.length !== files.length) {
    const error = new Error(
      "Each uploaded document must have a matching document type"
    );
    error.statusCode = 400;
    throw error;
  }

  const weights = resolveOrderWeights({
    weight: normalized.weight,
    length: normalized.length,
    breadth: normalized.breadth,
    height: normalized.height,
  });

  const noOfBoxes = parseNoOfBoxes(normalized.no_of_boxes);

  const category = getCategory(
    normalized.destinationCity,
    normalized.destinationState
  );
  const serviceType = options.serviceType || "surface";
  const expectedHours = getExpectedHours(category, serviceType);

  let consignorName = String(normalized.consignor_name || "").trim();
  if (!consignorName) {
    consignorName = String(user?.companyName || "").trim();
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

  let order = null;
  let shipping = null;

  try {
    order = await Order.create({
      uploadedBy: user?.id,
      companyID,
      externalOrderId,
      orderDate: normalized.order_date
        ? parseISODateOnly(normalized.order_date) || now()
        : now(),
      consignorName,
      consignorPhone: String(
        normalized.consignor_phone || user?.mobile_number || ""
      ).trim(),
      consigneeName: normalized.consigneeName,
      consigneeLastName: normalized.consigneeLastName,
      address: normalized.address,
      address2: normalized.address2,
      destinationCity: normalized.destinationCity,
      destinationState: normalized.destinationState,
      destinationPincode: normalized.destinationPincode,
      destinationCountry: normalized.destinationCountry,
      consigneeEmail: normalized.consigneeEmail,
      billingPhone: normalized.billingPhone,
      billingAlternatePhone: normalized.billingAlternatePhone,
      paymentMethod: normalized.paymentMethod,
      comment: normalized.comment,
      orderItems: invoiceFields.orderItems,
      subTotal: invoiceFields.subTotal,
      shippingCharges: Number(normalized.shipping_charges || 0),
      giftwrapCharges: Number(normalized.giftwrap_charges || 0),
      transactionCharges: Number(normalized.transaction_charges || 0),
      invoiceNo: invoiceFields.invoiceNo,
      invoiceValue: invoiceFields.invoiceValue,
      invoiceValueProvided: generation.invoiceValueProvided,
      invoiceAutoGenerated: generation.invoiceAutoGenerated,
      totalDiscount: normalized.total_discount || 0,
      weight: weights.actualWeight,
      actualWeight: weights.actualWeight,
      volumetricWeight: weights.volumetricWeight,
      chargeableWeight: weights.chargeableWeight,
      length: Number(normalized.length || 0),
      breadth: Number(normalized.breadth || 0),
      height: Number(normalized.height || 0),
      noOfBoxes,
      category,
      expectedHours,
      isPickupFirst: Boolean(options.isPickupFirst),
      pickupScheduleId: options.pickupScheduleId || null,
      documents: [],
    });

    shipping = await Shipping.create({
      orderId: order._id,
      shipmentId,
      pickupLocation: normalized.pickup_location,
      shippingStatus: "Pending",
      serviceType,
      totalWeight: weights.chargeableWeight,
      shippingCharges: normalized.shipping_charges || 0,
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
  } catch (error) {
    if (shipping?._id) {
      await Shipping.deleteOne({ _id: shipping._id });
    }
    if (order?._id) {
      await Order.deleteOne({ _id: order._id });
    }

    if (error?.code === 11000) {
      const duplicateError = new Error("Duplicate Order ID already exists");
      duplicateError.statusCode = 400;
      throw duplicateError;
    }

    throw error;
  }

  return { order, shipping, invoiceFields, generation, externalOrderId };
};

module.exports = {
  createOrderWithShipping,
  normalizeCreateOrderPayload,
  parseDocumentTypes,
};
