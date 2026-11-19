import { useEffect, useState } from "react";
import { toast } from "../utils/toast";
import {
  fetchDelhiveryCancelEligibility,
  submitDelhiveryShipmentCancel,
} from "../api/delhiveryAPI";

export default function CancelDelhiveryShipmentModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelable, setCancelable] = useState(false);
  const [reason, setReason] = useState("");
  const [delhiveryStatus, setDelhiveryStatus] = useState("");
  const [waybills, setWaybills] = useState([]);
  const [note, setNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [resumeOperationId, setResumeOperationId] = useState(null);

  useEffect(() => {
    if (!isOpen || !order?._id) return;

    const load = async () => {
      setLoading(true);
      setShowConfirm(false);
      try {
        const res = await fetchDelhiveryCancelEligibility(order._id);
        const data = res.data || {};
        setCancelable(Boolean(data.cancelable));
        setReason(data.reason || "");
        setDelhiveryStatus(data.delhiveryStatus || "");
        setWaybills(data.waybills || []);
        setResumeOperationId(data.incompleteOperation?.operationId || null);
      } catch (err) {
        setCancelable(false);
        setReason(err.message || "Could not load cancellation eligibility.");
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, order?._id]);

  if (!isOpen) return null;

  const awbDisplay = waybills.length ? waybills.join(", ") : order?.shipping?.awbNumber;

  const handleSubmit = async () => {
    if (!cancelable || submitting) return;
    setSubmitting(true);
    try {
      await submitDelhiveryShipmentCancel(order._id, {
        confirm: true,
        note,
        resume_operation_id: resumeOperationId || undefined,
      });
      toast.success(
        "Delhivery cancellation recorded. Tracking may show UD, RT, or CN."
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "Cancellation failed");
      if (err.uncertain) {
        toast.warn("Cancellation outcome is uncertain. Check Delhivery tracking.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Cancel Delhivery Shipment</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-500">Checking Delhivery eligibility…</p>
          ) : (
            <>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900">
                Cancellation is sent to Delhivery. After cancellation, tracking may remain
                Manifested (UD), move In Transit (RT), or show Canceled (CN) for RVP — per
                Delhivery rules.
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-slate-500">AWB</dt>
                <dd className="font-semibold text-slate-800">{awbDisplay}</dd>
                <dt className="text-slate-500">Delhivery status</dt>
                <dd className="font-semibold text-slate-800">
                  {delhiveryStatus || "—"}
                </dd>
              </dl>

              {!cancelable && (
                <p className="text-sm text-rose-700 font-medium">{reason}</p>
              )}

              {cancelable && (
                <>
                  <label className="block text-xs font-bold text-slate-600">
                    Note (optional)
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={500}
                    />
                  </label>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600"
          >
            Close
          </button>
          {cancelable && !showConfirm && (
            <button
              type="button"
              disabled={loading || submitting}
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Continue
            </button>
          )}
          {cancelable && showConfirm && (
            <button
              type="button"
              disabled={loading || submitting}
              onClick={handleSubmit}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50"
            >
              {submitting ? "Cancelling…" : "Confirm cancellation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}