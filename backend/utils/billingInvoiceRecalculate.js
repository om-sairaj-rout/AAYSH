const {
  calculateFinalOrderRate,
  round2,
} = require("./calculateFinalOrderRate");
const { getCompanyRateProfile } = require("./resolveCompanyRateSlabs");
const { recalculateInvoiceTotals } = require("./billingInvoiceTotals");
const { normalizeService } = require("./rateCalculator");

const modeToService = (mode, fallback = "surface") => {
  const raw = String(mode || "").trim().toUpperCase();
  if (raw === "AIR") return "air";
  if (raw === "PRIME") return "prime";
  if (raw) return normalizeService(raw);
  return normalizeService(fallback);
};

const createMissingAwbLine = (awbNumber) => ({
  awbNumber,
  missingAwb: true,
  orderId: "",
  destination: "",
  bookingDate: "",
  mode: "",
  service: "",
  zone: "",
  pcs: 0,
  noOfBoxes: 0,
  rovChg: 0,
  docChg: 0,
  docketChg: 0,
  odaChg: 0,
  chargeableWeight: 0,
  amount: 0,
  paymentMethod: "",
  invoiceValue: 0,
  breakdown: {
    weightSlabRate: 0,
    docCharge: 0,
    codCharge: 0,
    rovCharge: 0,
    odaCharge: 0,
    fuelSurcharge: 0,
  },
});

const recalculateBillingLineFromRates = async ({
  line,
  companyID,
  profile,
}) => {
  if (line?.missingAwb) {
    return { ...line };
  }

  const normalizedCompanyID = String(companyID || "").trim().toUpperCase();
  if (!normalizedCompanyID || !line?.zone) {
    return { ...line };
  }

  const preservedOda = Number(line.odaChg ?? line.breakdown?.odaCharge ?? 0) || 0;

  const rateResult = await calculateFinalOrderRate({
    companyID: normalizedCompanyID,
    service: line.service || modeToService(line.mode, "surface"),
    weight: line.chargeableWeight,
    length: line.length || 0,
    breadth: line.breadth || 0,
    height: line.height || 0,
    zone: line.zone,
    paymentMethod: line.paymentMethod || "COD",
    invoiceValue: line.invoiceValue ?? line.breakdown?.invoiceValue ?? 0,
    profile,
    deferFuelSurcharge: true,
  });

  if (!rateResult.success) {
    return { ...line };
  }

  const breakdown = {
    ...rateResult.breakdown,
    fuelSurcharge: 0,
    odaCharge: preservedOda,
  };

  return {
    ...line,
    service: rateResult.service,
    zone: rateResult.zone,
    chargeableWeight: rateResult.chargeableWeight,
    amount: round2(breakdown.weightSlabRate),
    docChg: round2(breakdown.docCharge + breakdown.codCharge),
    docketChg: round2(breakdown.docCharge + breakdown.codCharge),
    rovChg: round2(breakdown.rovCharge),
    odaChg: preservedOda,
    breakdown,
    slab: rateResult.slab,
  };
};

const recalculateInvoiceLinesFromRates = async (invoice) => {
  const companyID =
    invoice.company?.companyID || invoice.companyID || "";
  const profile =
    invoice.profile || (companyID ? await getCompanyRateProfile(companyID) : null);

  const lines = [];
  for (const line of invoice.lines || []) {
    lines.push(
      await recalculateBillingLineFromRates({
        line,
        companyID,
        profile,
      })
    );
  }

  return recalculateInvoiceTotals({
    ...invoice,
    profile,
    lines,
  });
};

module.exports = {
  createMissingAwbLine,
  recalculateBillingLineFromRates,
  recalculateInvoiceLinesFromRates,
  modeToService,
};
