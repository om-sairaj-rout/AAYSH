import { useEffect, useState } from "react";
import { toast } from "../utils/toast";
import {
  fetchDelhiveryEditEligibility,
  submitDelhiveryShipmentEdit,
} from "../api/delhiveryAPI";

const fieldClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30";

export default function EditDelhiveryShipmentModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState("");
  const [delhiveryStatus, setDelhiveryStatus] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentModeChange, setPaymentModeChange] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    alternatePhone: "",
    address: "",
    products_desc: "",
    weightKg: "",
    length: "",
    breadth: "",
    height: "",
    paymentMethod: "",
    codAmount: "",
  });
  const [note, setNote] = useState("");
  const [resumeOperationId, setResumeOperationId] = useState(null);
  const [incompleteOperation, setIncompleteOperation] = useState(null);

  useEffect(() => {
    if (!isOpen || !order?._id) return;

    const load = async () => {
      setLoading(true);
      setShowConfirm(false);
      try {
        const res = await fetchDelhiveryEditEligibility(order._id);
        const data = res.data || {};
        const current = data.current || {};
        setEligible(Boolean(data.editable));
        setEligibilityReason(data.reason || "");
        setDelhiveryStatus(data.delhiveryStatus || "");
        setIncompleteOperation(data.incompleteOperation || null);
        setResumeOperationId(data.incompleteOperation?.operationId || null);
        setForm({
          name: current.name || "",
          phone: current.phone || "",
          alternatePhone: current.alternatePhone || "",
          address: current.address || "",
          products_desc: current.products_desc || "",
          weightKg: current.weightKg ?? "",
          length: current.length ?? "",
          breadth: current.breadth ?? "",
          height: current.height ?? "",
          paymentMethod: current.paymentMethod || "",
          codAmount: current.codAmount ?? "",
        });
        setPaymentModeChange(false);
      } catch (err) {
        setEligible(false);
        setEligibilityReason(err.message || "Could not load edit eligibility.");
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, order?._id]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!eligible || submitting) return;

    const changes = {};
    const keys = [
      "name",
      "phone",
      "alternatePhone",
      "address",
      "products_desc",
      "weightKg",
      "length",
      "breadth",
      "height",
    ];
    for (const key of keys) {
      if (form[key] !== "" && form[key] != null) {
        changes[key] = form[key];
      }
    }

    if (paymentModeChange) {
      changes.paymentMethod = form.paymentMethod;
      if (String(form.paymentMethod).toUpperCase() === "COD") {
        changes.codAmount = Number(form.codAmount);
      }
    }

    setSubmitting(true);
    try {
      await submitDelhiveryShipmentEdit(order._id, {
        changes,
        payment_mode_change: paymentModeChange,
        confirm: true,
        note,
        resume_operation_id: resumeOperationId,
      });
      toast.success("Delhivery shipment updated");
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err.uncertain) {
        toast.error(
          err.message ||
            "Update result is uncertain. Verify on Delhivery before retrying."
        );
      } else {
        toast.error(err.message || "Delhivery edit failed");
      }
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const paymentMethod = String(form.paymentMethod || "").toUpperCase();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Delhivery shipment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              AWB {order.shipping?.awbNumber}
              {delhiveryStatus ? ` · Delhivery status: ${delhiveryStatus}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading && (
            <p className="text-sm text-slate-500">Checking Delhivery edit eligibility…</p>
          )}

          {!loading && incompleteOperation?.requiresRecovery && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              Incomplete Delhivery edit detected. Recovery will retry only failed or
              uncertain AWBs.{" "}
              {incompleteOperation.waybills
                ?.map((w) => `${w.waybill}: ${w.status}`)
                .join(" · ")}
            </p>
          )}

          {!loading && !eligible && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {eligibilityReason || "This shipment cannot be edited right now."}
            </p>
          )}

          {!loading && eligible && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-600">
                  Consignee name
                  <input
                    className={fieldClass}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Phone
                  <input
                    className={fieldClass}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                  Delivery address
                  <input
                    className={fieldClass}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                  Product description
                  <input
                    className={fieldClass}
                    value={form.products_desc}
                    onChange={(e) =>
                      setForm({ ...form, products_desc: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Weight (kg)
                  <input
                    type="number"
                    step="0.01"
                    className={fieldClass}
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Length (cm)
                  <input
                    type="number"
                    className={fieldClass}
                    value={form.length}
                    onChange={(e) => setForm({ ...form, length: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Width (cm)
                  <input
                    type="number"
                    className={fieldClass}
                    value={form.breadth}
                    onChange={(e) => setForm({ ...form, breadth: e.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Height (cm)
                  <input
                    type="number"
                    className={fieldClass}
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                  />
                </label>
              </div>

              <div className="border border-slate-100 rounded-xl p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={paymentModeChange}
                    onChange={(e) => setPaymentModeChange(e.target.checked)}
                  />
                  Change payment mode (COD ↔ Prepaid only)
                </label>
                {paymentModeChange && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                      New payment mode
                      <select
                        className={fieldClass}
                        value={paymentMethod === "COD" ? "Prepaid" : "COD"}
                        onChange={(e) =>
                          setForm({ ...form, paymentMethod: e.target.value })
                        }
                      >
                        <option value="Prepaid">Prepaid</option>
                        <option value="COD">COD</option>
                      </select>
                    </label>
                    {paymentMethod !== "COD" && (
                      <label className="text-xs font-semibold text-slate-600">
                        COD amount
                        <input
                          type="number"
                          className={fieldClass}
                          value={form.codAmount}
                          onChange={(e) =>
                            setForm({ ...form, codAmount: e.target.value })
                          }
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              <label className="text-xs font-semibold text-slate-600 block">
                Note (optional)
                <input
                  className={fieldClass}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>

              {!showConfirm ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 text-white font-semibold text-sm hover:bg-cyan-700 disabled:opacity-50"
                >
                  Review & confirm
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    Confirm submission to Delhivery? Local order data updates only after Delhivery accepts the change.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600"
                      onClick={() => setShowConfirm(false)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmit}
                      className="flex-1 py-2 rounded-xl bg-cyan-600 text-white font-semibold disabled:opacity-50"
                    >
                      {submitting ? "Submitting…" : "Confirm & submit"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
