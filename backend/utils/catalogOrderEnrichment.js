const Product = require("../models/product.model");
const { calculateInvoiceValue } = require("./invoiceCalculations");
const { hasItemPrice } = require("./invoiceGenerationPolicy");

const hasProvidedInvoiceValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const itemNeedsCatalogPrice = (item) =>
  Number(item.selling_price ?? item.sellingPrice ?? 0) <= 0;

const buildCatalogSkuMap = (products = []) => {
  const map = new Map();
  for (const product of products) {
    const key = String(product.sku || "").trim().toUpperCase();
    if (key && !map.has(key)) {
      map.set(key, product);
    }
  }
  return map;
};

const enrichOrderItemsFromCatalog = async (companyID, orderItems = []) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return orderItems;
  }

  const normalizedCompanyID = String(companyID || "").trim().toUpperCase();
  if (!normalizedCompanyID) {
    return orderItems;
  }

  const rawSkus = orderItems
    .map((item) => String(item.sku || "").trim())
    .filter(Boolean);

  if (!rawSkus.length) {
    return orderItems;
  }

  const skuVariants = [
    ...new Set(rawSkus.flatMap((sku) => [sku, sku.toUpperCase(), sku.toLowerCase()])),
  ];

  const products = await Product.find({
    companyID: normalizedCompanyID,
    isActive: { $ne: false },
    sku: { $in: skuVariants },
  })
    .select("sku name sellingPrice discount tax hsn")
    .lean();

  const catalogBySku = buildCatalogSkuMap(products);

  return orderItems.map((item) => {
    if (!itemNeedsCatalogPrice(item)) {
      return item;
    }

    const skuKey = String(item.sku || "").trim().toUpperCase();
    const catalog = skuKey ? catalogBySku.get(skuKey) : null;
    if (!catalog) {
      return item;
    }

    return {
      ...item,
      name: String(item.name || item.title || catalog.name || "").trim(),
      selling_price: Number(catalog.sellingPrice ?? 0),
      discount:
        item.discount !== undefined && item.discount !== null && item.discount !== ""
          ? Number(item.discount)
          : Number(catalog.discount ?? 0),
      tax:
        item.tax !== undefined && item.tax !== null && item.tax !== ""
          ? Number(item.tax)
          : Number(catalog.tax ?? 0),
      hsn: String(item.hsn || catalog.hsn || "").trim(),
    };
  });
};

/**
 * When invoice_value is omitted, enrich line items from the company product catalog (by SKU)
 * and derive invoice_value the same way as the UI order form.
 */
const enrichNormalizedOrderFromCatalog = async ({ normalized, companyID }) => {
  const next = {
    ...normalized,
    orderItems: Array.isArray(normalized.orderItems)
      ? [...normalized.orderItems]
      : [],
  };

  if (hasProvidedInvoiceValue(next.invoice_value)) {
    return next;
  }

  next.orderItems = await enrichOrderItemsFromCatalog(companyID, next.orderItems);

  const computed = calculateInvoiceValue({
    orderItems: next.orderItems,
    shippingCharges: next.shipping_charges,
    giftwrapCharges: next.giftwrap_charges,
    transactionCharges: next.transaction_charges,
  });

  if (hasItemPrice(next.orderItems) && Number.isFinite(computed) && computed >= 0) {
    next.invoice_value = computed;
  }

  return next;
};

module.exports = {
  enrichOrderItemsFromCatalog,
  enrichNormalizedOrderFromCatalog,
  hasProvidedInvoiceValue,
};
