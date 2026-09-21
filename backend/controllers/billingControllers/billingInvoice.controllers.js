const {
  buildBillingInvoice,
  parseAwbList,
} = require("../../utils/billingInvoiceBuilder");
const { buildPdfBuffer, buildExcelBuffer } = require("../../utils/billingInvoiceExport");
const { recalculateInvoiceTotals } = require("../../utils/billingInvoiceTotals");
const { resolveStateCode } = require("../../utils/indianStateCodes");
const BillingInvoiceRecord = require("../../models/billingInvoiceRecord.model");
const {
  resolveBillingMonthFromMeta,
  prepareInvoiceSnapshot,
} = require("../../utils/billingInvoicePersist");

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

const resolveInvoicePayload = async (body) => {
  if (body?.invoice && Array.isArray(body.invoice.lines)) {
    const invoice = applyCompanyStateCode(recalculateInvoiceTotals(body.invoice));
    return { success: true, ...invoice };
  }

  const { companyID, awbNumbers, awbText } = body;
  const awbs = awbNumbers?.length
    ? awbNumbers
    : parseAwbList(awbText || "");

  const built = await buildBillingInvoice({ companyID, awbNumbers: awbs });
  if (!built.success) {
    return built;
  }
  return built;
};

const previewBillingInvoice = async (req, res) => {
  try {
    const invoice = await resolveInvoicePayload(req.body);

    if (!invoice.success) {
      return res.status(400).json({ success: false, message: invoice.message });
    }

    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const exportBillingInvoicePdf = async (req, res) => {
  try {
    const invoice = await resolveInvoicePayload(req.body);

    if (!invoice.success) {
      return res.status(400).json({ success: false, message: invoice.message });
    }

    if (!invoice.lines.length) {
      return res.status(400).json({
        success: false,
        message: "No billable AWBs found for export.",
        errors: invoice.errors,
      });
    }

    const buffer = await buildPdfBuffer(invoice);
    const filename = `tax-invoice-${invoice.company.companyID}-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const exportBillingInvoiceExcel = async (req, res) => {
  try {
    const invoice = await resolveInvoicePayload(req.body);

    if (!invoice.success) {
      return res.status(400).json({ success: false, message: invoice.message });
    }

    if (!invoice.lines.length) {
      return res.status(400).json({
        success: false,
        message: "No billable AWBs found for export.",
        errors: invoice.errors,
      });
    }

    const buffer = buildExcelBuffer(invoice);
    const filename = `tax-invoice-${invoice.company.companyID}-${Date.now()}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const saveBillingInvoice = async (req, res) => {
  try {
    const { companyID, invoice: rawInvoice } = req.body;

    if (!rawInvoice?.lines?.length) {
      return res.status(400).json({
        success: false,
        message: "Invoice must include at least one line before saving.",
      });
    }

    const snapshot = prepareInvoiceSnapshot(rawInvoice, companyID);
    const invoiceNumber = String(snapshot.invoiceMeta?.invoiceNumber || "").trim();
    if (!invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: "Invoice number is required before saving.",
      });
    }

    const invoiceDateRaw = snapshot.invoiceMeta?.invoiceDate;
    const billingMonth = resolveBillingMonthFromMeta(snapshot.invoiceMeta || {});
    if (!billingMonth) {
      return res.status(400).json({
        success: false,
        message:
          "Set Bill Period (From/To) or Invoice Date so the billing month can be determined.",
      });
    }

    const invoiceDate = new Date(invoiceDateRaw);
    if (Number.isNaN(invoiceDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "A valid invoice date is required before saving.",
      });
    }

    const normalizedCompanyID = String(snapshot.company?.companyID || companyID || "").trim();
    if (!normalizedCompanyID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required before saving.",
      });
    }

    const existing = await BillingInvoiceRecord.findOne({ invoiceNumber }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This invoice number is already saved. Invoice numbers cannot be duplicated.",
        data: { id: existing._id },
      });
    }

    const meta = snapshot.invoiceMeta || {};

    const record = await BillingInvoiceRecord.create({
      invoiceNumber,
      companyID: normalizedCompanyID,
      companyName: snapshot.company?.companyName || "",
      invoiceDate,
      billingMonth,
      billPeriodFrom: String(meta.billPeriodFrom || "").trim(),
      billPeriodTo: String(meta.billPeriodTo || "").trim(),
      billAmount: Number(snapshot.totals?.billAmount || 0),
      lineCount: snapshot.lines?.length || 0,
      invoiceSnapshot: snapshot,
      savedBy: req.user?.id,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: record._id,
        invoiceNumber: record.invoiceNumber,
        companyID: record.companyID,
        companyName: record.companyName,
        invoiceDate: record.invoiceDate,
        billingMonth: record.billingMonth,
        billPeriodFrom: record.billPeriodFrom,
        billPeriodTo: record.billPeriodTo,
        billAmount: record.billAmount,
        lineCount: record.lineCount,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This invoice number is already saved. Invoice numbers cannot be duplicated.",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const listBillingInvoiceHistory = async (req, res) => {
  try {
    const month = String(req.query.month || "").trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Query parameter month is required (YYYY-MM billing period month).",
      });
    }

    const records = await BillingInvoiceRecord.find({ billingMonth: month })
      .sort({ invoiceDate: -1, createdAt: -1 })
      .select(
        "invoiceNumber companyID companyName invoiceDate billingMonth billPeriodFrom billPeriodTo billAmount lineCount createdAt"
      )
      .lean();

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const exportSavedBillingInvoicePdf = async (req, res) => {
  try {
    const record = await BillingInvoiceRecord.findById(req.params.id).lean();
    if (!record?.invoiceSnapshot) {
      return res.status(404).json({ success: false, message: "Saved invoice not found." });
    }

    const buffer = await buildPdfBuffer(record.invoiceSnapshot);
    const safeNo = String(record.invoiceNumber).replace(/[^\w.-]+/g, "_");
    const filename = `tax-invoice-${record.companyID}-${safeNo}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const exportSavedBillingInvoiceExcel = async (req, res) => {
  try {
    const record = await BillingInvoiceRecord.findById(req.params.id).lean();
    if (!record?.invoiceSnapshot) {
      return res.status(404).json({ success: false, message: "Saved invoice not found." });
    }

    const buffer = buildExcelBuffer(record.invoiceSnapshot);
    const safeNo = String(record.invoiceNumber).replace(/[^\w.-]+/g, "_");
    const filename = `tax-invoice-${record.companyID}-${safeNo}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  previewBillingInvoice,
  exportBillingInvoicePdf,
  exportBillingInvoiceExcel,
  saveBillingInvoice,
  listBillingInvoiceHistory,
  exportSavedBillingInvoicePdf,
  exportSavedBillingInvoiceExcel,
};
