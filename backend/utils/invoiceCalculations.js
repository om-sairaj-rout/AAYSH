const getItemLineTotal = (item = {}) => {
  const qty = Number(item.units || 1);
  const price = Number(item.sellingPrice ?? item.selling_price ?? 0);
  const discount = Number(item.discount || 0);
  const tax = Number(item.tax || 0);

  const taxable = price * qty - discount;
  const gst = taxable * (tax / 100);

  return taxable + gst;
};

const calculateItemsSubTotal = (orderItems = []) =>
  Number(
    orderItems
      .reduce((sum, item) => sum + getItemLineTotal(item), 0)
      .toFixed(2)
  );

const calculateInvoiceValue = ({
  orderItems = [],
  shippingCharges = 0,
  giftwrapCharges = 0,
  transactionCharges = 0,
}) =>
  Number(
    (
      calculateItemsSubTotal(orderItems) +
      Number(shippingCharges || 0) +
      Number(giftwrapCharges || 0) +
      Number(transactionCharges || 0)
    ).toFixed(2)
  );

const normalizeOrderItems = (orderItems = []) =>
  (Array.isArray(orderItems) ? orderItems : []).map((item) => ({
    name: String(item.name || "").trim(),
    sku: String(item.sku || "").trim(),
    units: Number(item.units) > 0 ? Number(item.units) : 1,
    sellingPrice: Number(item.selling_price ?? item.sellingPrice ?? 0),
    discount: Number(item.discount || 0),
    tax: Number(item.tax || 0),
    hsn: String(item.hsn || "").trim(),
  }));

const resolveInvoiceFields = ({
  invoiceNo,
  invoiceValue,
  orderItems = [],
  shippingCharges = 0,
  giftwrapCharges = 0,
  transactionCharges = 0,
  generateInvoiceNo,
}) => {
  const normalizedItems = normalizeOrderItems(orderItems);
  const providedInvoiceNo = String(invoiceNo || "").trim();
  const providedInvoiceValue =
    invoiceValue !== undefined &&
    invoiceValue !== null &&
    String(invoiceValue).trim() !== ""
      ? Number(invoiceValue)
      : null;

  const resolvedInvoiceNo =
    providedInvoiceNo || (typeof generateInvoiceNo === "function" ? generateInvoiceNo() : "");

  const calculatedInvoiceValue = calculateInvoiceValue({
    orderItems: normalizedItems,
    shippingCharges,
    giftwrapCharges,
    transactionCharges,
  });

  const resolvedInvoiceValue =
    providedInvoiceValue !== null && Number.isFinite(providedInvoiceValue)
      ? Number(providedInvoiceValue.toFixed(2))
      : calculatedInvoiceValue;

  return {
    orderItems: normalizedItems,
    invoiceNo: resolvedInvoiceNo,
    invoiceValue: resolvedInvoiceValue,
    subTotal: calculateItemsSubTotal(normalizedItems),
    invoiceValueProvided: providedInvoiceValue !== null,
  };
};

module.exports = {
  getItemLineTotal,
  calculateItemsSubTotal,
  calculateInvoiceValue,
  normalizeOrderItems,
  resolveInvoiceFields,
};
