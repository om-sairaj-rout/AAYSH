import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Search,
  IndianRupee,
  Upload,
  Save,
  History,
} from "lucide-react";
import { getCompanies } from "../api/companyAPI";
import {
  previewBillingInvoiceAPI,
  exportBillingInvoicePdfAPI,
  exportBillingInvoiceExcelAPI,
  saveBillingInvoiceAPI,
  listBillingInvoiceHistoryAPI,
  downloadSavedBillingInvoicePdfAPI,
  downloadSavedBillingInvoiceExcelAPI,
} from "../api/billingAPI";
import { toast } from "../utils/toast";
import { useSelector } from "react-redux";
import { canAccess } from "../utils/permissions";
import {
  parseAwbsFromUploadFile,
  updateInvoiceLine,
  updateLineChargeField,
  recalculateInvoiceTotals,
} from "../utils/billingInvoiceHelpers";
import { resolveStateCode } from "../utils/indianStateCodes";

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const cellInput =
  "w-full min-w-[4.5rem] rounded-lg border border-slate-200 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500/30";

const currentBillingMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const InvoiceGenerationPage = () => {
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "update", "write");
  const fileInputRef = useRef(null);

  const [companies, setCompanies] = useState([]);
  const [companyID, setCompanyID] = useState("");
  const [awbText, setAwbText] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [uploadingAwbs, setUploadingAwbs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(currentBillingMonth);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExporting, setHistoryExporting] = useState("");

  const loadHistory = async (month) => {
    try {
      setHistoryLoading(true);
      const res = await listBillingInvoiceHistoryAPI(month);
      setHistoryRows(res.data || []);
    } catch (error) {
      setHistoryRows([]);
      toast.error(error.message || "Failed to load invoice history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(historyMonth);
  }, [historyMonth]);

  useEffect(() => {
    getCompanies()
      .then((res) => {
        const list = res.companies || res.data?.companies || res.data || [];
        setCompanies(Array.isArray(list) ? list : []);
      })
      .catch((error) => toast.error(error.message || "Failed to load companies"));
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.companyID === companyID),
    [companies, companyID]
  );

  const exportPayload = useMemo(() => {
    if (!companyID) return null;
    if (invoice?.lines?.length) {
      return { companyID, invoice };
    }
    return { companyID, awbText };
  }, [companyID, invoice, awbText]);

  const handlePreview = async () => {
    if (!companyID) {
      toast.validation("Select a company");
      return;
    }
    if (!String(awbText || "").trim()) {
      toast.validation("Enter or upload at least one AWB number");
      return;
    }

    try {
      setLoading(true);
      const res = await previewBillingInvoiceAPI({ companyID, awbText });
      setInvoice(res.data);
      if (!res.data?.lines?.length) {
        toast.warning("No billable AWBs found. Check errors below.");
      } else {
        toast.success(`Calculated ${res.data.lines.length} AWB(s). You can edit fields before download.`);
      }
    } catch (error) {
      setInvoice(null);
      toast.error(error.message || "Failed to calculate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleAwbFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploadingAwbs(true);
      const awbs = await parseAwbsFromUploadFile(file);
      if (!awbs.length) {
        toast.validation("No AWB numbers found in file");
        return;
      }
      setAwbText(awbs.join("\n"));
      setInvoice(null);
      toast.success(`Loaded ${awbs.length} AWB(s) from file`);
    } catch (error) {
      toast.error(error.message || "Failed to read AWB file");
    } finally {
      setUploadingAwbs(false);
    }
  };

  const updateMeta = (field, value) => {
    setInvoice((prev) =>
      prev
        ? {
            ...prev,
            invoiceMeta: { ...(prev.invoiceMeta || {}), [field]: value },
          }
        : prev
    );
  };

  const updateCompanyField = (field, value) => {
    setInvoice((prev) => {
      if (!prev) return prev;
      const company = { ...(prev.company || {}), [field]: value };
      if (field === "state") {
        company.stateCode = resolveStateCode(value);
      }
      return { ...prev, company };
    });
  };

  const handleExportPdf = async () => {
    if (!exportPayload?.invoice?.lines?.length) {
      toast.validation("Run preview first with at least one valid AWB");
      return;
    }
    try {
      setExporting("pdf");
      await exportBillingInvoicePdfAPI(exportPayload);
      toast.success("PDF invoice downloaded");
    } catch (error) {
      toast.error(error.message || "PDF export failed");
    } finally {
      setExporting("");
    }
  };

  const handleSaveInvoice = async () => {
    if (!exportPayload?.invoice?.lines?.length) {
      toast.validation("Run preview first with at least one valid AWB");
      return;
    }
    if (!exportPayload.invoice.invoiceMeta?.invoiceNumber?.trim()) {
      toast.validation("Invoice number is required before saving");
      return;
    }
    try {
      setSaving(true);
      const res = await saveBillingInvoiceAPI(exportPayload);
      toast.success("Invoice saved to history");
      const savedMonth = res.data?.billingMonth;
      if (savedMonth && savedMonth !== historyMonth) {
        setHistoryMonth(savedMonth);
      } else {
        loadHistory(historyMonth);
      }
    } catch (error) {
      toast.error(error.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleHistoryPdf = async (id) => {
    try {
      setHistoryExporting(`pdf-${id}`);
      await downloadSavedBillingInvoicePdfAPI(id);
    } catch (error) {
      toast.error(error.message || "PDF download failed");
    } finally {
      setHistoryExporting("");
    }
  };

  const handleHistoryExcel = async (id) => {
    try {
      setHistoryExporting(`excel-${id}`);
      await downloadSavedBillingInvoiceExcelAPI(id);
    } catch (error) {
      toast.error(error.message || "Excel download failed");
    } finally {
      setHistoryExporting("");
    }
  };

  const handleExportExcel = async () => {
    if (!exportPayload?.invoice?.lines?.length) {
      toast.validation("Run preview first with at least one valid AWB");
      return;
    }
    try {
      setExporting("excel");
      await exportBillingInvoiceExcelAPI(exportPayload);
      toast.success("Excel invoice downloaded");
    } catch (error) {
      toast.error(error.message || "Excel export failed");
    } finally {
      setExporting("");
    }
  };

  const setFuelSurcharge = (value) => {
    setInvoice((prev) =>
      recalculateInvoiceTotals({
        ...prev,
        totals: {
          ...(prev.totals || {}),
          fuelSurcharge: Number(value) || 0,
          fuelSurchargeManual: true,
        },
      })
    );
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2B4B]">Invoice Generation</h1>
        <p className="text-sm text-slate-500 mt-1">
          Select a company, paste or upload AWB numbers, preview and edit the tax invoice, then download PDF (reference freight-bill layout).
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Company
          </label>
          <select
            value={companyID}
            onChange={(e) => {
              setCompanyID(e.target.value);
              setInvoice(null);
            }}
            className={inputClass}
          >
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.companyID} value={company.companyID}>
                {company.companyName} ({company.companyID})
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="block text-xs font-bold text-slate-500 uppercase">
              AWB Numbers
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.xlsx,.xls"
                className="hidden"
                onChange={handleAwbFile}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAwbs}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <Upload size={14} />
                {uploadingAwbs ? "Reading..." : "Upload file"}
              </button>
            </div>
          </div>
          <textarea
            rows={5}
            value={awbText}
            onChange={(e) => setAwbText(e.target.value)}
            placeholder="Paste AWBs separated by comma, space, or new line — or upload .txt / .csv / .xlsx"
            className={inputClass}
          />
        </div>
        <div className="lg:col-span-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            <Search size={16} />
            {loading ? "Calculating..." : "Preview Invoice"}
          </button>
          {canWrite && (
            <>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                <FileText size={16} />
                {exporting === "pdf" ? "Exporting..." : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                <FileSpreadsheet size={16} />
                {exporting === "excel" ? "Exporting..." : "Download Excel"}
              </button>
              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Invoice"}
              </button>
            </>
          )}
        </div>
      </div>

      {invoice && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1B2B4B]">TAX INVOICE</h2>
                <p className="text-xs text-slate-500">
                  Air Express Courier header/footer are fixed on PDF. Edit Bill To and line items below.
                </p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div>AWBs requested: {invoice.awbCount}</div>
                <div>Billable lines: {invoice.lineCount}</div>
                <div>Errors: {invoice.errorCount}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="md:col-span-3 text-xs font-bold text-slate-600 uppercase">
                Bill To
              </div>
              <div>
                <label className="text-xs text-slate-500">Bill To (name)</label>
                <input
                  className={inputClass}
                  value={invoice.company?.companyName || ""}
                  onChange={(e) => updateCompanyField("companyName", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Company ID</label>
                <input
                  className={inputClass}
                  value={invoice.company?.companyID || ""}
                  onChange={(e) => updateCompanyField("companyID", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500">Address</label>
                <input
                  className={inputClass}
                  value={invoice.company?.address || ""}
                  onChange={(e) => updateCompanyField("address", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">State</label>
                <input
                  className={inputClass}
                  value={invoice.company?.state || ""}
                  onChange={(e) => updateCompanyField("state", e.target.value)}
                  placeholder="e.g. UTTAR PRADESH"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  State code (auto): {invoice.company?.stateCode || "—"}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Invoice No</label>
                <input
                  className={inputClass}
                  value={invoice.invoiceMeta?.invoiceNumber || ""}
                  onChange={(e) => updateMeta("invoiceNumber", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Invoice Date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={invoice.invoiceMeta?.invoiceDate || ""}
                  onChange={(e) => updateMeta("invoiceDate", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Bill Period From</label>
                <input
                  className={inputClass}
                  placeholder="01/08"
                  value={invoice.invoiceMeta?.billPeriodFrom || ""}
                  onChange={(e) => updateMeta("billPeriodFrom", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Bill Period To</label>
                <input
                  className={inputClass}
                  placeholder="31/08"
                  value={invoice.invoiceMeta?.billPeriodTo || ""}
                  onChange={(e) => updateMeta("billPeriodTo", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500">Remarks</label>
                <input
                  className={inputClass}
                  value={invoice.invoiceMeta?.remarks || ""}
                  onChange={(e) => updateMeta("remarks", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Freight (AMOUNT) Total</div>
                <div className="font-bold">{formatMoney(invoice.totals?.freightSubtotal)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Fuel Surcharge (invoice)</div>
                <input
                  type="number"
                  className={inputClass}
                  value={invoice.totals?.fuelSurcharge ?? ""}
                  onChange={(e) => setFuelSurcharge(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Auto: {invoice.totals?.fuelSurchargePercent ?? 0}% on freight
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">CGST / SGST</div>
                <div className="font-bold">
                  {formatMoney(invoice.totals?.cgstAmount)} /{" "}
                  {formatMoney(invoice.totals?.sgstAmount)}
                </div>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3 border border-indigo-100">
                <div className="text-xs text-indigo-700 flex items-center gap-1">
                  <IndianRupee size={12} /> Bill Amount
                </div>
                <div className="font-bold text-indigo-900 text-lg">
                  {formatMoney(invoice.totals?.billAmount)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-2 py-2 font-bold">SR.</th>
                  <th className="px-2 py-2 font-bold">AWB</th>
                  <th className="px-2 py-2 font-bold">DATE</th>
                  <th className="px-2 py-2 font-bold">DES</th>
                  <th className="px-2 py-2 font-bold">MODE</th>
                  <th className="px-2 py-2 font-bold">PCS</th>
                  <th className="px-2 py-2 font-bold">ROV</th>
                  <th className="px-2 py-2 font-bold">DOC</th>
                  <th className="px-2 py-2 font-bold">ODA</th>
                  <th className="px-2 py-2 font-bold">WEIGHT</th>
                  <th className="px-2 py-2 font-bold">AMT</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lines || []).map((line, index) => (
                  <tr key={`${line.awbNumber}-${index}`} className="border-t border-slate-100 align-top">
                    <td className="px-2 py-2">{index + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        className={cellInput}
                        value={line.awbNumber || ""}
                        onChange={(e) =>
                          setInvoice((prev) => updateInvoiceLine(prev, index, { awbNumber: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={cellInput}
                        value={line.bookingDate || ""}
                        onChange={(e) =>
                          setInvoice((prev) => updateInvoiceLine(prev, index, { bookingDate: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={cellInput}
                        value={line.destination || ""}
                        onChange={(e) =>
                          setInvoice((prev) =>
                            updateInvoiceLine(prev, index, { destination: e.target.value })
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={cellInput}
                        value={line.mode || ""}
                        onChange={(e) =>
                          setInvoice((prev) => updateInvoiceLine(prev, index, { mode: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className={cellInput}
                        value={line.pcs ?? line.noOfBoxes ?? ""}
                        onChange={(e) =>
                          setInvoice((prev) =>
                            updateInvoiceLine(prev, index, {
                              pcs: Number(e.target.value) || 1,
                              noOfBoxes: Number(e.target.value) || 1,
                            })
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className={cellInput}
                        value={line.rovChg ?? ""}
                        onChange={(e) =>
                          setInvoice((prev) =>
                            updateLineChargeField(prev, index, "rovChg", e.target.value)
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className={cellInput}
                        value={line.docChg ?? line.docketChg ?? ""}
                        onChange={(e) =>
                          setInvoice((prev) =>
                            updateLineChargeField(prev, index, "docChg", e.target.value)
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className={cellInput}
                        value={line.odaChg ?? 0}
                        onChange={(e) =>
                          setInvoice((prev) =>
                            updateLineChargeField(prev, index, "odaChg", e.target.value)
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className={cellInput}
                        value={line.chargeableWeight ?? ""}
                        onChange={(e) =>
                          setInvoice((prev) =>
                            updateInvoiceLine(prev, index, {
                              chargeableWeight: Number(e.target.value) || 0,
                            })
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className={cellInput}
                        value={line.amount ?? ""}
                        onChange={(e) =>
                          setInvoice((prev) =>
                            updateLineChargeField(prev, index, "amount", e.target.value)
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invoice.errors?.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-rose-800 mb-2">Errors</h3>
              <ul className="text-sm text-rose-700 space-y-1">
                {invoice.errors.map((err) => (
                  <li key={`${err.awb}-${err.message}`}>
                    <strong>{err.awb}</strong>: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History size={18} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-[#1B2B4B]">Saved Invoice History</h2>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Billing period month
            </label>
            <input
              type="month"
              className={inputClass}
              value={historyMonth}
              onChange={(e) => setHistoryMonth(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Filter by the invoice&apos;s billing period month (from Bill Period To, or From if To is
          empty). Saved PDF/Excel use the stored snapshot, not live order rates.
        </p>
        {historyLoading ? (
          <p className="text-sm text-slate-500">Loading history...</p>
        ) : historyRows.length === 0 ? (
          <p className="text-sm text-slate-500">No saved invoices for this billing period month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-bold">Invoice No.</th>
                  <th className="px-3 py-2 font-bold">Company</th>
                  <th className="px-3 py-2 font-bold">Bill period</th>
                  <th className="px-3 py-2 font-bold">Invoice date</th>
                  <th className="px-3 py-2 font-bold">Lines</th>
                  <th className="px-3 py-2 font-bold">Bill Amount</th>
                  <th className="px-3 py-2 font-bold">Saved</th>
                  <th className="px-3 py-2 font-bold">Download</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row) => (
                  <tr key={row._id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{row.invoiceNumber}</td>
                    <td className="px-3 py-2">
                      <div>{row.companyName || row.companyID}</div>
                      <div className="text-xs text-slate-500">{row.companyID}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.billPeriodFrom || row.billPeriodTo
                        ? `${row.billPeriodFrom || "—"} – ${row.billPeriodTo || "—"}`
                        : row.billingMonth || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.invoiceDate
                        ? new Date(row.invoiceDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{row.lineCount}</td>
                    <td className="px-3 py-2 font-medium">{formatMoney(row.billAmount)}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleHistoryPdf(row._id)}
                          disabled={Boolean(historyExporting)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                        >
                          <FileText size={12} />
                          {historyExporting === `pdf-${row._id}` ? "..." : "PDF"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHistoryExcel(row._id)}
                          disabled={Boolean(historyExporting)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                        >
                          <FileSpreadsheet size={12} />
                          {historyExporting === `excel-${row._id}` ? "..." : "Excel"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceGenerationPage;
