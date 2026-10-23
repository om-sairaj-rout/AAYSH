import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Wallet, IndianRupee, Plus, Minus, Download } from "lucide-react";
import { toast } from "../utils/toast";
import { hasGlobalDataAccess } from "../utils/permissions";
import { getCompanies } from "../api/companyAPI";
import {
  getWalletOverviewAPI,
  getWalletTransactionsAPI,
  getWalletRechargesAPI,
  initiateWalletRechargeAPI,
  verifyWalletRechargeAPI,
  cancelWalletRechargeAPI,
  adminAdjustWalletAPI,
} from "../api/walletAPI";
import { loadRazorpayCheckout } from "../utils/razorpayCheckout";
import RechargeWalletModal from "../components/RechargeWalletModal";

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const defaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
};

const ADMIN_REASON_OPTIONS = [
  { value: "manual_credit", label: "Manual wallet credit" },
  { value: "payment_adjustment", label: "Payment adjustment" },
  { value: "order_charge_correction", label: "Order charge correction" },
  { value: "weight_correction", label: "Weight correction" },
  { value: "oda_correction", label: "ODA charge correction" },
  { value: "refund_adjustment", label: "Refund adjustment" },
  { value: "penalty_charge", label: "Penalty or additional charge" },
  { value: "other", label: "Other" },
];

const formatRechargeDateParts = (value) => {
  if (!value) return { time: "—", date: "—" };
  const d = new Date(value);
  const time = d.toLocaleString("en-IN", { hour: "numeric", minute: "2-digit" });
  const date = d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return { time, date };
};

const formatDateRangeLabel = (from, to) => {
  const fmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };
  return `${fmt(from)} to ${fmt(to)}`;
};

const rechargeStatusLabel = (status) => {
  if (status === "completed") return "Success";
  if (status === "failed") return "Failed";
  if (status === "pending") return "Pending";
  if (status === "cancelled") return "Cancelled";
  return status || "—";
};

const WalletPage = () => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = hasGlobalDataAccess(user);

  const [companies, setCompanies] = useState([]);
  const [companyID, setCompanyID] = useState("");
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [rchPage, setRchPage] = useState(1);
  const [txPagination, setTxPagination] = useState({ pages: 1, total: 0 });
  const [rchPagination, setRchPagination] = useState({ pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false);
  const [adminAmount, setAdminAmount] = useState("");
  const [adminReasonKey, setAdminReasonKey] = useState("manual_credit");
  const [adminCustomReason, setAdminCustomReason] = useState("");
  const [adminDirection, setAdminDirection] = useState("credit");
  const [adminOrderId, setAdminOrderId] = useState("");
  const [adminAwb, setAdminAwb] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [rchSearch, setRchSearch] = useState("");
  const [txType, setTxType] = useState("");
  const [txLimit, setTxLimit] = useState(25);
  const [rchLimit, setRchLimit] = useState(25);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [rchDateRange, setRchDateRange] = useState(defaultDateRange);
  const [mismatchRow, setMismatchRow] = useState(null);

  const effectiveCompanyID = useMemo(
    () => (isAdmin ? companyID : user?.companyID || ""),
    [isAdmin, companyID, user?.companyID]
  );

  useEffect(() => {
    if (!isAdmin) {
      setCompanyID(user?.companyID || "");
      return;
    }
    getCompanies()
      .then((res) => {
        const list = res.companies || [];
        setCompanies(list);
        if (!companyID && user?.companyID) setCompanyID(user.companyID);
        else if (!companyID && list.length > 0) setCompanyID(list[0].companyID);
      })
      .catch(() => setCompanies([]));
  }, [isAdmin, user?.companyID]);

  const loadOverview = async () => {
    if (!effectiveCompanyID) return;
    const res = await getWalletOverviewAPI(isAdmin ? effectiveCompanyID : undefined);
    setOverview(res.data);
  };

  const loadTransactions = async (page = txPage) => {
    if (!effectiveCompanyID) return;
    const res = await getWalletTransactionsAPI({
      companyID: isAdmin ? effectiveCompanyID : undefined,
      page,
      limit: txLimit,
      type: txType || undefined,
      fromDate: dateRange.from,
      toDate: dateRange.to,
      search: txSearch || undefined,
    });
    setTransactions(res.data?.rows || []);
    setTxPagination(res.data?.pagination || { pages: 1, total: 0 });
  };

  const loadRecharges = async (page = rchPage) => {
    if (!effectiveCompanyID) return;
    const res = await getWalletRechargesAPI({
      companyID: isAdmin ? effectiveCompanyID : undefined,
      page,
      limit: rchLimit,
      fromDate: rchDateRange.from,
      toDate: rchDateRange.to,
      search: rchSearch || undefined,
    });
    setRecharges(res.data?.rows || []);
    setRchPagination(res.data?.pagination || { pages: 1, total: 0 });
  };

  const refreshAll = async () => {
    if (!effectiveCompanyID) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      await loadOverview();
      await loadTransactions(txPage);
      await loadRecharges(rchPage);
    } catch (error) {
      toast.error(error.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [effectiveCompanyID]);

  useEffect(() => {
    if (effectiveCompanyID) loadTransactions(txPage);
  }, [txPage, effectiveCompanyID, txLimit, txType, dateRange, txSearch]);

  useEffect(() => {
    if (effectiveCompanyID) loadRecharges(rchPage);
  }, [rchPage, effectiveCompanyID, rchLimit, rchDateRange, rchSearch]);

  const handleRecharge = async (amountInput) => {
    const amount = Number(amountInput);
    if (!amount || amount < 500) {
      toast.validation("Minimum recharge amount is ₹500");
      return;
    }
    try {
      setRechargeSubmitting(true);
      const initRes = await initiateWalletRechargeAPI({
        amount,
        notes: "",
        companyID: isAdmin ? effectiveCompanyID : undefined,
      });
      const checkout = initRes.data;
      if (!checkout?.keyId || !checkout?.razorpayOrderId) {
        throw new Error("Invalid payment session from server");
      }

      const Razorpay = await loadRazorpayCheckout();
      const pendingRechargeId = checkout.rechargeId;

      const options = {
        key: checkout.keyId,
        amount: checkout.amountPaise,
        currency: checkout.currency || "INR",
        name: "AAYSH Express",
        description: "Wallet recharge",
        order_id: checkout.razorpayOrderId,
        prefill: {
          name: user?.companyName || "",
          email: user?.email || "",
          contact: user?.mobile_number || user?.mobile || "",
        },
        theme: { color: "#1B2B4B" },
        handler: async (response) => {
          try {
            await verifyWalletRechargeAPI({
              rechargeId: pendingRechargeId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              companyID: isAdmin ? effectiveCompanyID : undefined,
            });
            toast.success("Wallet recharged successfully");
            setRechargeModalOpen(false);
            setActiveTab("recharges");
            setRchPage(1);
            await refreshAll();
          } catch (verifyError) {
            toast.error(verifyError.message || "Payment verification failed");
            await loadRecharges(rchPage);
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await cancelWalletRechargeAPI({
                rechargeId: pendingRechargeId,
                companyID: isAdmin ? effectiveCompanyID : undefined,
              });
              await loadRecharges(rchPage);
            } catch {
              /* ignore */
            }
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.on("payment.failed", async () => {
        toast.error("Payment failed. You can try again from Recharges.");
        await loadRecharges(rchPage);
      });
      rzp.open();
    } catch (error) {
      toast.error(error.message || "Failed to initiate recharge");
    } finally {
      setRechargeSubmitting(false);
    }
  };

  const handleAdminAdjust = async () => {
    const amount = Number(adminAmount);
    if (!amount || amount <= 0) {
      toast.validation("Enter a valid amount");
      return;
    }
    if (!adminReasonKey) {
      toast.validation("Select a reason for this adjustment");
      return;
    }
    if (adminReasonKey === "other" && !String(adminCustomReason || "").trim()) {
      toast.validation("Enter a custom reason when Other is selected");
      return;
    }
    try {
      await adminAdjustWalletAPI({
        companyID: effectiveCompanyID,
        amount,
        direction: adminDirection,
        reasonKey: adminReasonKey,
        customReason: adminCustomReason,
        shipmentDetails: {
          externalOrderId: adminOrderId,
          awbNumber: adminAwb,
        },
      });
      toast.success("Wallet updated");
      setAdminAmount("");
      setAdminCustomReason("");
      setAdminOrderId("");
      setAdminAwb("");
      await refreshAll();
    } catch (error) {
      toast.error(error.message || "Failed to update wallet");
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

  const downloadLedger = () => {
    const header = [
      "Date",
      "Transaction",
      "Order ID",
      "AWB",
      "Description",
      "Credit",
      "Debit",
      "Balance After",
    ];
    const lines = transactions.map((row) => [
      formatDate(row.createdAt),
      row.transactionCode || row._id,
      row.externalOrderId || "",
      row.awbNumber || "",
      row.displayDescription || row.description || "",
      row.type === "credit" ? row.amount : "",
      row.type === "debit" ? row.amount : "",
      row.balanceAfter,
    ]);
    const csv = [header, ...lines]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet-ledger-${effectiveCompanyID || "company"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B] flex items-center gap-2">
            <Wallet className="text-indigo-600" size={26} />
            Wallet
            <button type="button" className="text-xs font-semibold text-indigo-600 ml-1">
              Learn More
            </button>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Balance, recharges, and shipment charge history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadLedger}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-[#1B2B4B] bg-white hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <Download size={16} />
            Download Ledger
          </button>
          <button
            type="button"
            onClick={() => setRechargeModalOpen(true)}
            disabled={overview?.razorpayConfigured === false}
            className="px-4 py-2 rounded-xl bg-[#1B2B4B] text-white text-sm font-semibold hover:bg-[#152238] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Recharge Wallet
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="max-w-md space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Company</label>
            <select
              className={inputClass}
              value={companyID}
              onChange={(e) => {
                setCompanyID(e.target.value);
                setTxPage(1);
                setRchPage(1);
              }}
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.companyID} value={c.companyID}>
                  {c.companyName} ({c.companyID})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!effectiveCompanyID ? (
        <p className="text-sm text-slate-500">Select a company to view wallet details.</p>
      ) : loading && !overview ? (
        <p className="text-sm text-slate-500">Loading wallet...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Current Balance</p>
              <p className="text-3xl font-black text-emerald-600 mt-2">
                {formatMoney(overview?.balance)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Total Credit</p>
              <p className="text-2xl font-bold text-slate-700 mt-2">
                {formatMoney(overview?.totalCredit)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Total Debit</p>
              <p className="text-2xl font-bold text-slate-700 mt-2">
                {formatMoney(overview?.totalDebit)}
              </p>
            </div>
          </div>

          {overview?.walletEnabled === false && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              Wallet is disabled for this company. Enable it in admin company settings to deduct
              shipment charges from the wallet.
            </p>
          )}

          {overview?.razorpayConfigured === false && (
            <p className="text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              Online wallet recharge is not available yet: Razorpay API keys are missing on the
              server. An administrator must add <strong>RAZORPAY_KEY_ID</strong> and{" "}
              <strong>RAZORPAY_KEY_SECRET</strong> to <code className="text-xs">backend/.env</code>{" "}
              (Test mode keys from Razorpay Dashboard), then restart the backend.
            </p>
          )}

          {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 lg:col-span-2 max-w-xl">
                <h2 className="text-sm font-bold text-[#1B2B4B]">Admin adjustment</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminDirection("credit")}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border ${
                      adminDirection === "credit"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <Plus size={14} className="inline mr-1" />
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminDirection("debit")}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border ${
                      adminDirection === "debit"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <Minus size={14} className="inline mr-1" />
                    Deduct
                  </button>
                </div>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="Amount (₹)"
                  value={adminAmount}
                  onChange={(e) => setAdminAmount(e.target.value)}
                />
                <select
                  className={inputClass}
                  value={adminReasonKey}
                  onChange={(e) => setAdminReasonKey(e.target.value)}
                >
                  {ADMIN_REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {adminReasonKey === "other" && (
                  <input
                    className={inputClass}
                    placeholder="Custom reason (required)"
                    value={adminCustomReason}
                    onChange={(e) => setAdminCustomReason(e.target.value)}
                  />
                )}
                <p className="text-[10px] font-bold text-slate-400 uppercase pt-1">
                  Optional shipment details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    className={inputClass}
                    placeholder="Order ID"
                    value={adminOrderId}
                    onChange={(e) => setAdminOrderId(e.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="AWB number"
                    value={adminAwb}
                    onChange={(e) => setAdminAwb(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAdminAdjust}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold"
                >
                  Apply adjustment
                </button>
              </div>
          </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("transactions")}
                className={`flex-1 py-3 text-sm font-bold ${
                  activeTab === "transactions"
                    ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/40"
                    : "text-slate-500"
                }`}
              >
                Transactions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recharges")}
                className={`flex-1 py-3 text-sm font-bold ${
                  activeTab === "recharges"
                    ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/40"
                    : "text-slate-500"
                }`}
              >
                Recharges
              </button>
            </div>

            {activeTab === "transactions" ? (
              <div>
                <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-end bg-[#FAFBFC]">
                  <div className="min-w-[140px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Search</label>
                    <input
                      className={inputClass}
                      placeholder="AWB or transaction ID"
                      value={txSearch}
                      onChange={(e) => {
                        setTxSearch(e.target.value);
                        setTxPage(1);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">From</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={dateRange.from}
                      onChange={(e) =>
                        setDateRange((p) => ({ ...p, from: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">To</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={dateRange.to}
                      onChange={(e) =>
                        setDateRange((p) => ({ ...p, to: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                    <select
                      className={inputClass}
                      value={txType}
                      onChange={(e) => {
                        setTxType(e.target.value);
                        setTxPage(1);
                      }}
                    >
                      <option value="">All</option>
                      <option value="credit">Credit</option>
                      <option value="debit">Debit</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">Transaction Details</th>
                      <th className="px-4 py-3 font-bold">Account Details</th>
                      <th className="px-4 py-3 font-bold">Order ID</th>
                      <th className="px-4 py-3 font-bold">AWB / LRN</th>
                      <th className="px-4 py-3 font-bold">Weight &amp; Zone</th>
                      <th className="px-4 py-3 font-bold">Description</th>
                      <th className="px-4 py-3 font-bold text-right">Credit</th>
                      <th className="px-4 py-3 font-bold text-right">Debit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                          No transactions yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((row) => (
                        <tr key={row._id} className="border-t border-slate-100 align-top">
                          <td className="px-4 py-3">
                            <p className="text-indigo-600 font-semibold text-xs">
                              {row.transactionCode}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">{formatDate(row.createdAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 text-xs">
                              {row.companyName || overview?.companyName || "—"}
                            </p>
                            <p className="text-[11px] text-slate-400">—</p>
                          </td>
                          <td className="px-4 py-3 text-xs">{row.externalOrderId || "—"}</td>
                          <td className="px-4 py-3 text-xs font-mono">{row.awbNumber || "—"}</td>
                          <td className="px-4 py-3 text-xs">
                            <p>{row.weightLabel}</p>
                            <p className="text-slate-400">{row.zoneLabel}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-700">
                            <p>{row.displayDescription || row.description || "—"}</p>
                            {(row.category === "admin_credit" ||
                              row.category === "admin_debit") &&
                              (row.externalOrderId || row.awbNumber || row.meta?.zone) && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {[
                                    row.externalOrderId || row.meta?.externalOrderId,
                                    row.awbNumber || row.meta?.awbNumber,
                                    row.zoneLabel !== "—" ? row.zoneLabel : row.meta?.zone,
                                    row.meta?.serviceMode,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            {Array.isArray(row.fieldChanges) && row.fieldChanges.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setMismatchRow(row)}
                                className="text-[11px] text-indigo-600 font-semibold mt-1 hover:underline"
                              >
                                View Mismatch Details
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-semibold text-xs">
                            {row.type === "credit" ? `+${formatMoney(row.amount)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600 font-semibold text-xs">
                            {row.type === "debit" ? `-${formatMoney(row.amount)}` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
                <Pagination
                  page={txPage}
                  pages={txPagination.pages}
                  total={txPagination.total}
                  limit={txLimit}
                  onChange={setTxPage}
                  onLimitChange={(n) => {
                    setTxLimit(n);
                    setTxPage(1);
                  }}
                />
              </div>
            ) : (
              <div>
                <div className="p-4 border-b border-slate-100 bg-[#FAFBFC] overflow-x-auto">
                  <div className="flex flex-nowrap items-center gap-3 min-w-[720px] max-w-full">
                    <input
                      className={`${inputClass} flex-1 min-w-[200px] max-w-[280px] shrink-0`}
                      placeholder="Search by transaction ID"
                      value={rchSearch}
                      onChange={(e) => {
                        setRchSearch(e.target.value);
                        setRchPage(1);
                      }}
                    />
                    <span
                      className="text-xs font-semibold text-white bg-[#1B2B4B] rounded-lg px-3 py-2 whitespace-nowrap shrink-0"
                      title="Selected date range"
                    >
                      Date Range : {formatDateRangeLabel(rchDateRange.from, rchDateRange.to)}
                    </span>
                    <label className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                        From
                      </span>
                      <input
                        type="date"
                        className={`${inputClass} w-[140px] py-2`}
                        value={rchDateRange.from}
                        onChange={(e) => {
                          setRchDateRange((p) => ({ ...p, from: e.target.value }));
                          setRchPage(1);
                        }}
                      />
                    </label>
                    <label className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                        To
                      </span>
                      <input
                        type="date"
                        className={`${inputClass} w-[140px] py-2`}
                        value={rchDateRange.to}
                        onChange={(e) => {
                          setRchDateRange((p) => ({ ...p, to: e.target.value }));
                          setRchPage(1);
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">Transaction ID</th>
                      <th className="px-4 py-3 font-bold">Transaction Date</th>
                      <th className="px-4 py-3 font-bold">Bank&apos;s Transaction ID</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold text-right">Transaction Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recharges.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No recharge records yet.
                        </td>
                      </tr>
                    ) : (
                      recharges.map((row) => {
                        const { time, date } = formatRechargeDateParts(
                          row.completedAt || row.createdAt
                        );
                        const statusLabel = rechargeStatusLabel(row.status);
                        const statusClass =
                          statusLabel === "Success"
                            ? "bg-emerald-50 text-emerald-700"
                            : statusLabel === "Failed"
                              ? "bg-rose-50 text-rose-700"
                              : statusLabel === "Pending"
                                ? "bg-amber-50 text-amber-700"
                                : statusLabel === "Cancelled"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-slate-50 text-slate-600";
                        return (
                        <tr key={row._id} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                            {row.transactionCode}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            <p>{time}</p>
                            <p className="text-slate-400">{date}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {row.bankTransactionId || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800">
                            {formatMoney(row.amount).replace("₹", "₹ ")}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                </div>
                <Pagination
                  page={rchPage}
                  pages={rchPagination.pages}
                  total={rchPagination.total}
                  limit={rchLimit}
                  onChange={setRchPage}
                  onLimitChange={(n) => {
                    setRchLimit(n);
                    setRchPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}

      <RechargeWalletModal
        open={rechargeModalOpen}
        onClose={() => !rechargeSubmitting && setRechargeModalOpen(false)}
        onProceed={handleRecharge}
        disabled={overview?.razorpayConfigured === false}
        loading={rechargeSubmitting}
      />

      {mismatchRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#1B2B4B]">Mismatch details</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {mismatchRow.transactionCode} · Order {mismatchRow.externalOrderId || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMismatchRow(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                Close
              </button>
            </div>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Field</th>
                    <th className="text-left px-3 py-2">Before</th>
                    <th className="text-left px-3 py-2">After</th>
                  </tr>
                </thead>
                <tbody>
                  {(mismatchRow.fieldChanges || []).map((change) => (
                    <tr key={change.field} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{change.label}</td>
                      <td className="px-3 py-2 text-slate-600">{change.before}</td>
                      <td className="px-3 py-2 text-slate-900">{change.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Pagination = ({ page, pages, total = 0, limit = 25, onChange, onLimitChange }) => {
  if (!pages) return null;
  const start = total ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
      <span className="text-slate-500 text-xs">
        Showing {start} – {end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <select
          className="text-xs border border-slate-200 rounded-lg px-2 py-1"
          value={limit}
          onChange={(e) => onLimitChange?.(Number(e.target.value))}
        >
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>Show {n}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 text-xs"
        >
          Prev
        </button>
        <span className="text-slate-500 text-xs">{page} / {pages}</span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 text-xs"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default WalletPage;
