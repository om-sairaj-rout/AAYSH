import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "../utils/toast";
import {
  checkDelhiveryNdrEligibility,
  submitDelhiveryNdrAction,
  refreshDelhiveryUplStatus,
  listDelhiveryNdrHistory,
} from "../api/delhiveryAPI";

const isBeforeNinePmIst = () => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
    return hour < 21;
  } catch {
    return false;
  }
};

export default function DelhiveryNdrActions({ orderId, enabled, waybillOptions = [] }) {
  const [waybill, setWaybill] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState("");
  const [eligibility, setEligibility] = useState(null);
  const [history, setHistory] = useState([]);
  const [confirmAction, setConfirmAction] = useState("");
  const [ackBefore9, setAckBefore9] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!enabled || !orderId) return;
    try {
      const res = await listDelhiveryNdrHistory(orderId);
      setHistory(res.data || []);
    } catch {
      setHistory([]);
    }
  }, [enabled, orderId]);

  useEffect(() => {
    setWaybill(waybillOptions[0] || "");
    setEligibility(null);
    setConfirmAction("");
    loadHistory();
  }, [orderId, waybillOptions, loadHistory]);

  if (!enabled) return null;

  const onCheckEligibility = async () => {
    if (!waybill || checking) return;
    setChecking(true);
    setEligibility(null);
  setConfirmAction("");
    try {
      const res = await checkDelhiveryNdrEligibility(orderId, waybill);
      setEligibility(res.data || null);
    } catch (err) {
      toast.error(err.message || "Could not check NDR eligibility");
    } finally {
      setChecking(false);
    }
  };

  const onSubmit = async (action) => {
    if (!waybill || submitting) return;
    if (isBeforeNinePmIst() && !ackBefore9) {
      toast.warn("Delhivery recommends submitting after 9 PM IST. Confirm to proceed.");
      setConfirmAction(action);
      return;
    }
    if (confirmAction !== action) {
      setConfirmAction(action);
      return;
    }

    setSubmitting(action);
    try {
      const res = await submitDelhiveryNdrAction(orderId, {
        waybill,
        action,
        acknowledge_before_nine_pm: ackBefore9,
      });
      toast.success(res.data?.message || "NDR submitted");
      await loadHistory();
      setConfirmAction("");
    } catch (err) {
      toast.error(err.message || "NDR submission failed");
      if (err.uncertain) toast.warn("Request marked uncertain. Refresh UPL status.");
      await loadHistory();
    } finally {
      setSubmitting("");
    }
  };

  const onRefreshUpl = async (uplId) => {
    if (!uplId) return;
    try {
      await refreshDelhiveryUplStatus(uplId);
      toast.success("UPL status refreshed");
      await loadHistory();
    } catch (err) {
      toast.error(err.message || "Could not refresh UPL status");
    }
  };

  const isMps = waybillOptions.length > 1;

  return (
    <div className="border border-violet-100 rounded-xl overflow-hidden bg-violet-50/20">
      <div className="bg-violet-50 px-4 py-2.5 border-b border-violet-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-violet-900">
          Delhivery NDR actions (admin manual)
        </h4>
        <p className="text-[11px] text-violet-800/80 mt-0.5">
          Manual only — nothing is submitted automatically.
        </p>
      </div>

      <div className="p-4 space-y-3 text-sm">
        {isMps && (
          <label className="block text-xs font-semibold text-slate-600">
            Package AWB
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 bg-white"
              value={waybill}
              onChange={(e) => setWaybill(e.target.value)}
            >
              {waybillOptions.map((wb) => (
                <option key={wb} value={wb}>
                  {wb}
                </option>
              ))}
            </select>
          </label>
        )}

        {!isMps && waybill && (
          <p className="text-xs text-slate-600">
            AWB: <span className="font-mono font-semibold">{waybill}</span>
          </p>
        )}

        <button
          type="button"
          onClick={onCheckEligibility}
          disabled={!waybill || checking}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
        >
          {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Check NDR eligibility
        </button>

        {isBeforeNinePmIst() && (
          <label className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg p-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Delhivery recommends submitting after 9 PM IST.
              <label className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ackBefore9}
                  onChange={(e) => setAckBefore9(e.target.checked)}
                />
                I understand and want to proceed before 9 PM IST
              </label>
            </span>
          </label>
        )}

        {eligibility && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs space-y-1">
            <p>
              <strong>Status:</strong> {eligibility.delhiveryStatus || "—"}
            </p>
            <p>
              <strong>NSL:</strong> {eligibility.nslCode || "—"}
            </p>
            <p>
              <strong>Attempts:</strong>{" "}
              {eligibility.attemptCount == null ? "—" : eligibility.attemptCount}
            </p>
            <p>
              <strong>Eligible:</strong>{" "}
              {(eligibility.eligibleActions || []).join(", ") || "None"}
            </p>
            {eligibility.ineligibleReason && (
              <p className="text-rose-700">{eligibility.ineligibleReason}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {(eligibility.eligibleActions || []).map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={Boolean(submitting)}
                  onClick={() => onSubmit(action)}
                  className="rounded-lg bg-violet-700 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {submitting === action
                    ? "Submitting…"
                    : confirmAction === action
                      ? `Confirm ${action}`
                      : `Submit ${action}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-600">Previous NDR requests</h5>
            {history.map((row) => (
              <div
                key={row._id}
                className="rounded border border-slate-200 bg-white p-2 text-xs flex justify-between gap-2"
              >
                <div>
                  <p className="font-mono">{row.waybill}</p>
                  <p>
                    {row.action} · {row.requestStatus} · UPL {row.uplId || "—"}
                  </p>
                </div>
                {row.uplId && (
                  <button
                    type="button"
                    onClick={() => onRefreshUpl(row.uplId)}
                    className="inline-flex items-center gap-1 text-violet-700 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh UPL
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}