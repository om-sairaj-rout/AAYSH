const { isUnrestrictedAdmin } = require("./permissions");

const formatProductsDesc = (order) => {
  const items = order.orderItems || [];
  if (!items.length) return "Goods";
  return items
    .map((item) => String(item.name || item.sku || "Item").trim())
    .filter(Boolean)
    .join(", ")
    .slice(0, 240);
};

const assertUserCanAccessDelhiveryShipment = (order, user) => {
  if (!order) {
    return { ok: false, message: "Order not found" };
  }
  if (isUnrestrictedAdmin(user)) {
    return { ok: true };
  }
  const orderCompany = String(order.companyID || "")
    .trim()
    .toUpperCase();
  const userCompany = String(user?.companyID || "")
    .trim()
    .toUpperCase();
  if (!orderCompany || !userCompany || orderCompany !== userCompany) {
    return { ok: false, message: "Order is not in your company." };
  }
  return { ok: true };
};

const assertUserCanAccessOrder = (order, user) => {
  if (!order) {
    return { ok: false, message: "Order not found" };
  }
  if (order.isReversePickup) {
    return {
      ok: false,
      message: "Reverse pickup orders use a separate flow.",
    };
  }
  if (String(order.paymentMethod || "").toUpperCase() !== "COD") {
    return { ok: false, message: "Order is not COD." };
  }

  if (isUnrestrictedAdmin(user)) {
    return { ok: true };
  }

  const orderCompany = String(order.companyID || "")
    .trim()
    .toUpperCase();
  const userCompany = String(user?.companyID || "")
    .trim()
    .toUpperCase();

  if (!orderCompany || !userCompany || orderCompany !== userCompany) {
    return { ok: false, message: "Order is not in your company." };
  }

  return { ok: true };
};

const normalizeMpsPackages = ({ order, packages }) => {
  if (!Array.isArray(packages) || packages.length < 2) {
    return null;
  }

  const totalCod = Number(order.invoiceValue);
  const perBox = totalCod / packages.length;

  return packages.map((pkg, index) => {
    const codAmount =
      pkg.codAmount != null ? Number(pkg.codAmount) : perBox;
    return {
      weight: pkg.weight,
      length: pkg.length,
      breadth: pkg.breadth,
      height: pkg.height,
      codAmount,
      boxIndex: index + 1,
    };
  });
};

const splitCodAmountsForMps = (packages, totalCod) => {
  const total = Number(totalCod);
  if (!Number.isFinite(total) || total < 0) return packages;

  const explicitSum = packages.reduce(
    (sum, p) => sum + (p.codAmount != null ? Number(p.codAmount) : 0),
    0
  );

  if (explicitSum > 0 && Math.abs(explicitSum - total) > 0.02) {
    const err = new Error(
      `MPS COD amounts must sum to ${total} (got ${explicitSum}).`
    );
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  if (explicitSum > 0) return packages;

  const each = Number((total / packages.length).toFixed(2));
  let running = 0;
  return packages.map((pkg, idx) => {
    if (idx === packages.length - 1) {
      return { ...pkg, codAmount: Number((total - running).toFixed(2)) };
    }
    running += each;
    return { ...pkg, codAmount: each };
  });
};

const sanitizeDelhiveryResponseForStorage = (raw) => {
  if (!raw || typeof raw !== "object") {
    return { summary: String(raw || "").slice(0, 500) };
  }
  const clone = JSON.parse(JSON.stringify(raw));
  return clone;
};

module.exports = {
  assertUserCanAccessDelhiveryShipment,
  formatProductsDesc,
  assertUserCanAccessOrder,
  normalizeMpsPackages,
  splitCodAmountsForMps,
  sanitizeDelhiveryResponseForStorage,
};
