import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "../utils/toast";
import { completePickupScheduleAPI } from "../api/pickupScheduleAPI";

const EMPTY_ITEM = { name: "", sku: "", units: 1, selling_price: 0 };

const CompletePickupScheduleModal = ({ isOpen, onClose, schedule, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    billing_customer_name: "",
    billing_phone: "",
    billing_address: "",
    billing_address_2: "",
    billing_city: "",
    billing_state: "",
    billing_pincode: "",
    payment_method: "Prepaid",
    order_items: [{ ...EMPTY_ITEM }],
    invoice_value: "",
    comment: "",
  });

  if (!isOpen || !schedule) return null;

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.order_items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, order_items: items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      order_items: [...prev.order_items, { ...EMPTY_ITEM }],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      order_items: prev.order_items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        pickup_location: schedule.pickupLocation,
        weight: schedule.weight,
        no_of_boxes: schedule.noOfBoxes,
        billing_customer_name: form.billing_customer_name,
        billing_phone: form.billing_phone,
        billing_address: form.billing_address,
        billing_address_2: form.billing_address_2,
        billing_city: form.billing_city,
        billing_state: form.billing_state,
        billing_pincode: form.billing_pincode,
        payment_method: form.payment_method,
        comment: form.comment,
        invoice_value: form.invoice_value ? Number(form.invoice_value) : undefined,
        order_items: form.order_items.map((item) => ({
          name: item.name,
          sku: item.sku,
          units: Number(item.units) || 1,
          selling_price: Number(item.selling_price) || 0,
        })),
      };

      const res = await completePickupScheduleAPI(schedule._id, payload);
      if (res.awbAssigned) {
        toast.success(res.message || "Order created and AWB assigned");
      } else {
        toast.success(
          res.message ||
            "Order created. AWB assignment failed — edit and ship from All Orders when ready."
        );
        if (res.awbFailureReason) {
          toast.warning(res.awbFailureReason);
        }
      }
      onSuccess?.(res);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to complete pickup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-100 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-900">
              Complete Pickup — {schedule.scheduleId}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {schedule.pickupLocation} · {schedule.weight} kg · {schedule.noOfBoxes} box(es)
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Customer Name *
              </label>
              <input
                required
                value={form.billing_customer_name}
                onChange={(e) =>
                  setForm({ ...form, billing_customer_name: e.target.value })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Phone *
              </label>
              <input
                required
                value={form.billing_phone}
                onChange={(e) => setForm({ ...form, billing_phone: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Delivery Address *
            </label>
            <input
              required
              value={form.billing_address}
              onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs mb-2"
            />
            <input
              value={form.billing_address_2}
              onChange={(e) => setForm({ ...form, billing_address_2: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              placeholder="Address line 2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              placeholder="City *"
              value={form.billing_city}
              onChange={(e) => setForm({ ...form, billing_city: e.target.value })}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
            <input
              required
              placeholder="State *"
              value={form.billing_state}
              onChange={(e) => setForm({ ...form, billing_state: e.target.value })}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
            <input
              required
              placeholder="Pincode *"
              value={form.billing_pincode}
              onChange={(e) => setForm({ ...form, billing_pincode: e.target.value })}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Payment *
              </label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="Prepaid">Prepaid</option>
                <option value="COD">COD</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Invoice Value
              </label>
              <input
                type="number"
                min={0}
                value={form.invoice_value}
                onChange={(e) => setForm({ ...form, invoice_value: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">
                Order Items *
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-bold text-indigo-600 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.order_items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    required
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    className="col-span-5 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.units}
                    onChange={(e) => updateItem(index, "units", e.target.value)}
                    className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Price"
                    value={item.selling_price}
                    onChange={(e) => updateItem(index, "selling_price", e.target.value)}
                    className="col-span-4 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                  {form.order_items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="col-span-1 text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {loading ? "Creating order..." : "Create Order & Assign AWB"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompletePickupScheduleModal;
