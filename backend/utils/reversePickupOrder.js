const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Company = require("../models/company.model");
const getCategory = require("./categoryMapper");
const getExpectedHours = require("./tatMapper");
const { now, parseISODateOnly } = require("./dateTime");

const generateId = () =>
  Math.floor(10000000 + Math.random() * 90000000).toString();

const generateUniqueShipmentId = async () => {
  let id;
  while (true) {
    id = generateId();
    const exists = await Shipping.findOne({ shipmentId: id });
    if (!exists) return id;
  }
};

const generateInvoiceNo = () =>
  `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

const buildPickupLocation = (request) => {
  const parts = [
    request.fromAddress,
    request.fromAddress2,
    request.fromCity,
    request.fromState,
    request.fromPincode,
  ].filter(Boolean);
  return parts.join(", ");
};

const createOrderFromReversePickup = async (request, user) => {
  const externalOrderId = `REV-${Date.now()}`;
  const shipmentId = await generateUniqueShipmentId();
  const category = getCategory(request.toCity, request.toState);
  const serviceType = request.assignedServiceType || request.preferredServiceType || "surface";
  const expectedHours = getExpectedHours(category, serviceType);
  const itemName =
    request.itemDescription?.trim() ||
    `Reverse Pickup${request.originalAwbNumber ? ` (${request.originalAwbNumber})` : ""}`;
  const remarks = request.remarks || request.notes || "";

  let consignorName = user?.companyName || "";
  if (request.companyID) {
    const company = await Company.findOne({ companyID: request.companyID })
      .select("companyName")
      .lean();
    if (company?.companyName) {
      consignorName = company.companyName;
    }
  }

  const pickupLocation = buildPickupLocation(request);

  const order = await Order.create({
    uploadedBy: request.requestedBy,
    companyID: request.companyID,
    externalOrderId,
    orderDate: now(),
    consignorName,
    consignorPhone: String(request.toPhone || user?.mobile_number || "").trim(),
    consigneeName: request.fromName,
    consigneeLastName: "",
    address: request.toAddress,
    address2: "",
    destinationCity: request.toCity,
    destinationState: request.toState,
    destinationPincode: String(request.toPincode),
    destinationCountry: request.toCountry || "India",
    consigneeEmail: request.fromEmail || "",
    billingPhone: request.fromPhone,
    paymentMethod: request.paymentMethod || "Prepaid",
    comment: [
      `Reverse pickup: ${request.requestId}`,
      request.originalAwbNumber ? `Original AWB: ${request.originalAwbNumber}` : "",
      remarks,
    ]
      .filter(Boolean)
      .join(" | "),
    orderItems: [
      {
        name: itemName,
        sku: request.requestId,
        units: request.pieces || 1,
        sellingPrice: request.invoiceValue || 0,
        discount: 0,
        tax: 0,
        hsn: "",
      },
    ],
    qty: request.pieces || 1,
    noOfBoxes: request.pieces || 1,
    subTotal: request.invoiceValue || 0,
    invoiceNo: generateInvoiceNo(),
    invoiceValue: request.invoiceValue || 0,
    weight: request.weight || 0,
    length: request.length || 0,
    breadth: request.breadth || 0,
    height: request.height || 0,
    category,
    expectedHours,
    isReversePickup: true,
    pickupPincode: String(request.fromPincode).trim(),
    reversePickupId: request._id,
  });

  await Shipping.create({
    orderId: order._id,
    shipmentId,
    pickupLocation,
    shippingStatus: "Pending",
    serviceType,
    totalWeight: request.weight || 0,
    pickupDate: request.pickupDate,
    pickupTime: request.pickupTime || "11:00",
    pickupInstructions: remarks,
  });

  return { order, pickupLocation };
};

module.exports = {
  buildPickupLocation,
  createOrderFromReversePickup,
};
