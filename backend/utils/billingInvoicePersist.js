const { recalculateInvoiceTotals } = require("./billingInvoiceTotals");
const { resolveStateCode } = require("./indianStateCodes");

const monthFromIsoDate = (invoiceDate) => {
  const raw = String(invoiceDate || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  const date = new Date(invoiceDate);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

/** @deprecated use resolveBillingMonthFromMeta */
const normalizeBillingMonth = monthFromIsoDate;

const fallbackYearFromMeta = (meta) => {
  const fromInvoice = String(meta?.invoiceDate || "").slice(0, 4);
  if (/^\d{4}$/.test(fromInvoice)) return fromInvoice;
  return String(new Date().getFullYear());
};

const billingMonthFromPeriodToken = (value, fallbackYear) => {
  const token = String(value || "").trim();
  if (!token) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token.slice(0, 7);
  if (/^\d{4}-\d{2}$/.test(token)) return token;

  const dmy = token.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const mm = String(dmy[2]).padStart(2, "0");
    return `${dmy[3]}-${mm}`;
  }

  const dm = token.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (dm && fallbackYear) {
    const mm = String(dm[2]).padStart(2, "0");
    return `${fallbackYear}-${mm}`;
  }

  return "";
};

/**
 * Billing month for history search — derived from bill period (end date preferred),
 * not invoice date.
 */
const resolveBillingMonthFromMeta = (meta = {}) => {
  const fallbackYear = fallbackYearFromMeta(meta);

  const fromEnd = billingMonthFromPeriodToken(meta.billPeriodTo, fallbackYear);
  if (fromEnd) return fromEnd;

  const fromStart = billingMonthFromPeriodToken(meta.billPeriodFrom, fallbackYear);
  if (fromStart) return fromStart;

  const periodText = String(meta.billPeriod || "").trim();
  if (periodText) {
    const segments = periodText.split(/\s+to\s+/i).map((part) => part.trim()).filter(Boolean);
    if (segments.length) {
      const endMonth = billingMonthFromPeriodToken(
        segments[segments.length - 1],
        fallbackYear
      );
      if (endMonth) return endMonth;
      const startMonth = billingMonthFromPeriodToken(segments[0], fallbackYear);
      if (startMonth) return startMonth;
    }
  }

  return monthFromIsoDate(meta.invoiceDate);
};

const applyCompanyStateCode = (invoice) => {
  if (!invoice?.company) return invoice;
  return {
    ...invoice,
    company: {
      ...invoice.company,
      stateCode: resolveStateCode(invoice.company.state) || invoice.company.stateCode || "",
    },
  };
};

const normalizeLineOda = (line) => ({
  ...line,
  odaChg: Number(line.odaChg ?? line.breakdown?.odaCharge ?? 0) || 0,
  breakdown: {
    ...(line.breakdown || {}),
    odaCharge: Number(line.odaChg ?? line.breakdown?.odaCharge ?? 0) || 0,
  },
});

const prepareInvoiceSnapshot = (invoice, companyID) => {
  const withCompany = {
    ...invoice,
    company: {
      ...(invoice.company || {}),
      companyID: invoice.company?.companyID || companyID || "",
    },
    lines: (invoice.lines || []).map(normalizeLineOda),
  };

  const calculated = recalculateInvoiceTotals(applyCompanyStateCode(withCompany));
  const { success, ...snapshot } = calculated;
  return snapshot;
};

module.exports = {
  normalizeBillingMonth,
  resolveBillingMonthFromMeta,
  prepareInvoiceSnapshot,
};
