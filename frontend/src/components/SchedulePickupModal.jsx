import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "../utils/toast";
import { todayISODateOnly } from "../utils/dateTime";
import { createPickupScheduleAPI } from "../api/pickupScheduleAPI";

const formatCompanyAddress = (source = {}) => {
  if (!source || typeof source !== "object") return "";

  const line1 = String(source.address || "").trim();
  const cityState = [source.city, source.state]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
  const pincode = String(source.zip_code || source.zipCode || "").trim();

  return [line1, cityState, pincode].filter(Boolean).join(", ");
};

const resolveCompanySource = (user) => {
  if (!user) return {};
  if (user.company) return user.company;

  return {
    address: user.address || "",
    city: user.city || "",
    state: user.state || "",
    zip_code: user.zip_code || "",
  };
};

const buildDefaultForm = (user) => {
  const company = resolveCompanySource(user);
  const todayStr = todayISODateOnly();

  return {
    pickupDate: todayStr,
    pickupTime: "11:00",
    pickupLocation: formatCompanyAddress(company),
    pickupPincode: String(company.zip_code || company.zipCode || user?.zip_code || "").trim(),
    noOfBoxes: 1,
    preferredServiceType: "surface",
    notes: "",
  };
};

const SchedulePickupModal = ({ isOpen, onClose, onSuccess, user }) => {
  const todayStr = todayISODateOnly();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => buildDefaultForm(user));

  useEffect(() => {
    if (!isOpen) return;
    setForm(buildDefaultForm(user));
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createPickupScheduleAPI({
        ...form,
        noOfBoxes: Number(form.noOfBoxes) || 1,
      });
      toast.success("Pickup scheduled successfully");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to schedule pickup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-900">
              Schedule Pickup
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Arrange pickup before creating an order
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Pickup Date *
            </label>
            <input
              type="date"
              required
              min={todayStr}
              value={form.pickupDate}
              onChange={(e) => setForm({ ...form, pickupDate: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Pickup Time *
            </label>
            <input
              type="time"
              required
              min="11:00"
              max="17:00"
              value={form.pickupTime}
              onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Pickup Address *
            </label>
            <textarea
              required
              rows={2}
              value={form.pickupLocation}
              onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-xs font-semibold resize-none"
              placeholder="Full pickup address"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Prefilled from your company address. You can edit this before scheduling.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              No. of Boxes *
            </label>
            <input
              type="number"
              min={1}
              required
              value={form.noOfBoxes}
              onChange={(e) => setForm({ ...form, noOfBoxes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Service *
            </label>
            <select
              value={form.preferredServiceType}
              onChange={(e) =>
                setForm({ ...form, preferredServiceType: e.target.value })
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-xs font-semibold"
            >
              <option value="surface">Surface</option>
              <option value="air">Air</option>
              <option value="prime">Prime</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-xs font-semibold resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {loading ? "Scheduling..." : "Schedule Pickup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchedulePickupModal;
