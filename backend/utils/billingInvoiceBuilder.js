const Order = require("../models/upload/order.model");
const Shipping = require("../models/upload/shipping.model");
const Company = require("../models/company.model");
const PincodeServiceability = require("../models/upload/serviceability.model");
const {
  calculateFinalOrderRate,
  resolveZoneForOrder,
  round2,
} = require("./calculateFinalOrderRate");
const { getCompanyRateProfile } = require("./resolveCompanyRateSlabs");
const { recalculateInvoiceTotals } = require("./billingInvoiceTotals");
const { resolveStateCode } = require("./indianStateCodes");

const buildCompactInvoiceNumber = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
  const seq = String(now.getTime()).slice(-4);
  return `AIR/${fy}/${seq}`;
};

const formatBookingDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

const formatServiceCode = (service) => {
  const normalized = String(service || "surface").trim().toLowerCase();
  if (normalized === "air" || normalized === "prime") return "AIR";
  return "SUF";
};

const parseAwbList = (input = "") => {
  const raw = String(input || "");
  const tokens = raw
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(tokens)];
};

const buildBillingInvoice = async ({ companyID, awbNumbers = [] }) => {
  const normalizedCompanyID = String(companyID || "").trim().toUpperCase();
  if (!normalizedCompanyID) {
    return { success: false, message: "Company ID is required." };
  }

  const awbs = Array.isArray(awbNumbers)
    ? [...new Set(awbNumbers.map((a) => String(a).trim()).filter(Boolean))]
    : parseAwbList(awbNumbers);

  if (!awbs.length) {
    return { success: false, message: "At least one AWB number is required." };
  }

  const company = await Company.findOne({ companyID: normalizedCompanyID })
    .select("companyID companyName gstin address city state zip_code")
    .lean();

  if (!company) {
    return { success: false, message: "Company not found." };
  }

  const profile = await getCompanyRateProfile(normalizedCompanyID);

  const shippings = await Shipping.find({
    awbNumber: { $in: awbs },
  }).lean();

  const shippingByAwb = new Map(
    shippings.map((row) => [String(row.awbNumber).trim(), row])
  );

  const orderIds = shippings.map((row) => row.orderId).filter(Boolean);
  const orders = await Order.find({ _id: { $in: orderIds } }).lean();
  const orderById = new Map(orders.map((row) => [String(row._id), row]));

  const lines = [];
  const errors = [];

  for (const awb of awbs) {
    const shipping = shippingByAwb.get(awb);
    if (!shipping) {
      errors.push({ awb, message: "AWB not found" });
      continue;
    }

    const order = orderById.get(String(shipping.orderId));
    if (!order) {
      errors.push({ awb, message: "Order not found for AWB" });
      continue;
    }

    if (String(order.companyID || "").toUpperCase() !== normalizedCompanyID) {
      errors.push({
        awb,
        message: `Order belongs to company ${order.companyID}, not ${normalizedCompanyID}`,
      });
      continue;
    }

    const zoneInfo = await resolveZoneForOrder({
      zone: order.category,
      order,
      PincodeServiceability,
    });

    if (!zoneInfo.zone) {
      errors.push({ awb, message: "Unable to resolve destination zone" });
      continue;
    }

    const orderInvoiceValue = Number(order.invoiceValue);
    if (!Number.isFinite(orderInvoiceValue) || orderInvoiceValue < 0) {
      errors.push({
        awb,
        message: "Order is missing a valid invoice value",
      });
      continue;
    }

    const rateResult = await calculateFinalOrderRate({
      companyID: normalizedCompanyID,
      service: shipping.serviceType || "surface",
      weight: order.chargeableWeight || order.weight,
      length: order.length,
      breadth: order.breadth,
      height: order.height,
      zone: zoneInfo.zone,
      paymentMethod: order.paymentMethod,
      invoiceValue: orderInvoiceValue,
      profile,
      deferFuelSurcharge: true,
    });

    if (!rateResult.success) {
      errors.push({ awb, message: rateResult.message });
      continue;
    }

    const breakdown = {
      ...rateResult.breakdown,
      fuelSurcharge: 0,
      finalRate: rateResult.breakdown.subtotalBeforeFuel,
    };

    lines.push({
      awbNumber: awb,
      orderId: order.externalOrderId,
      consigneeName: order.consigneeName,
      destinationPincode: order.destinationPincode,
      destinationCity: order.destinationCity,
      destinationState: order.destinationState,
      destination: String(order.destinationCity || "").trim().toUpperCase(),
      bookingDate: formatBookingDate(order.orderDate),
      paymentMethod: order.paymentMethod,
      invoiceValue: round2(order.invoiceValue),
      service: rateResult.service,
      mode: formatServiceCode(rateResult.service),
      zone: rateResult.zone,
      chargeableWeight: rateResult.chargeableWeight,
      pcs: Number(order.noOfBoxes) > 0 ? Number(order.noOfBoxes) : 1,
      noOfBoxes: Number(order.noOfBoxes) > 0 ? Number(order.noOfBoxes) : 1,
      amount: round2(breakdown.weightSlabRate),
      docketChg: round2(breakdown.docCharge + breakdown.codCharge),
      docChg: round2(breakdown.docCharge + breakdown.codCharge),
      rovChg: round2(breakdown.rovCharge),
      odaChg: 0,
      courierName: shipping.courierName || "",
      shipmentId: shipping.shipmentId,
      breakdown,
      slab: rateResult.slab,
    });
  }

  const companyForInvoice = {
    ...company,
    stateCode: resolveStateCode(company.state),
  };

  const invoiceDraft = recalculateInvoiceTotals({
    company: companyForInvoice,
    profile,
    awbCount: awbs.length,
    lineCount: lines.length,
    errorCount: errors.length,
    lines,
    errors,
    invoiceMeta: {
      invoiceNumber: buildCompactInvoiceNumber(),
      invoiceDate: new Date().toISOString().slice(0, 10),
      billPeriodFrom: "",
      billPeriodTo: "",
      billPeriod: "",
      remarks: "",
      cgstPercent: 9,
      sgstPercent: 9,
      preparedBy: "",
    },
    generatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    ...invoiceDraft,
  };
};

module.exports = {
  parseAwbList,
  buildBillingInvoice,
};
