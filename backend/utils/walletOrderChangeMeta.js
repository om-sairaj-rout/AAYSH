const { round2 } = require("./walletService");

const serviceToLabel = (service) => {
  const raw = String(service || "").trim().toLowerCase();
  if (raw === "air") return "AIR";
  if (raw === "prime") return "Prime";
  return "SUR";
};

const formatKg = (value) => `${round2(value)} kg`;

const formatMoneyInr = (value) => `₹${round2(value).toFixed(2)}`;

const buildOrderFieldSnapshots = ({
  order,
  shipping,
  zone,
  serviceType,
  walletChargeAmount,
}) => ({
  externalOrderId: order.externalOrderId || "",
  awbNumber: shipping?.awbNumber || "",
  weight: round2(order.weight || 0),
  chargeableWeight: round2(order.chargeableWeight || 0),
  length: round2(order.length || 0),
  breadth: round2(order.breadth || 0),
  height: round2(order.height || 0),
  odaCharge: round2(order.odaCharge || 0),
  serviceMode: serviceToLabel(serviceType || shipping?.serviceType),
  zone: zone || order.category || "",
  walletChargeAmount: round2(walletChargeAmount ?? order.walletChargeAmount ?? 0),
});

const diffSnapshots = (before, after) => {
  const changes = [];
  const compare = (field, label, format = (v) => String(v)) => {
    const b = before[field];
    const a = after[field];
    if (format(b) !== format(a)) {
      changes.push({
        field,
        label,
        before: format(b),
        after: format(a),
      });
    }
  };

  compare("chargeableWeight", "Chargeable weight", formatKg);
  compare("weight", "Actual weight", formatKg);
  compare("odaCharge", "ODA charge", formatMoneyInr);
  compare("serviceMode", "Courier mode");
  compare("zone", "Zone");
  compare("length", "Length (cm)", (v) => `${round2(v)} cm`);
  compare("breadth", "Breadth (cm)", (v) => `${round2(v)} cm`);
  compare("height", "Height (cm)", (v) => `${round2(v)} cm`);
  compare("walletChargeAmount", "Wallet charge", formatMoneyInr);

  return changes;
};

const buildOrderChangeDescription = ({
  before,
  after,
  fieldChanges,
  additionalDebit = 0,
}) => {
  const parts = [];
  const orderRef = before.externalOrderId || after.externalOrderId;
  const awb = after.awbNumber || before.awbNumber;
  let head = `Order ${orderRef}`;
  if (awb) head += ` (AWB ${awb})`;

  if (fieldChanges.length) {
    parts.push(
      fieldChanges
        .map((c) => `${c.label}: ${c.before} → ${c.after}`)
        .join("; ")
    );
  }

  if (before.walletChargeAmount !== after.walletChargeAmount) {
    parts.push(
      `Charge ${formatMoneyInr(before.walletChargeAmount)} → ${formatMoneyInr(after.walletChargeAmount)}`
    );
  }

  if (additionalDebit > 0) {
    parts.push(`Additional debit ${formatMoneyInr(additionalDebit)}`);
  }

  return `${head}: ${parts.join(". ")}`;
};

module.exports = {
  serviceToLabel,
  buildOrderFieldSnapshots,
  diffSnapshots,
  buildOrderChangeDescription,
};
