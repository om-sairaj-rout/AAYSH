import { useEffect, useState } from "react";

const ReschedulePickupScheduleModal = ({ isOpen, onClose, schedule, onConfirm }) => {
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("11:00");
  const [pickupLocation, setPickupLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (schedule) {
      setPickupDate(schedule.pickupDate ? schedule.pickupDate.split("T")[0] : "");
      setPickupTime(schedule.pickupTime || "11:00");
      setPickupLocation(schedule.pickupLocation || "");
      setNotes(schedule.notes || "");
    }
  }, [schedule]);

  if (!isOpen || !schedule) return null;

  return (
    <div className="modal-overlay overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Reschedule Pickup</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Schedule {schedule.scheduleId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm({ pickupDate, pickupTime, pickupLocation, notes });
          }}
          className="p-6 space-y-4"
        >
          <input
            type="date"
            required
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold"
          />
          <input
            type="time"
            required
            min="11:00"
            max="17:00"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold"
          />
          <textarea
            required
            rows={2}
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold resize-none"
            placeholder="Pickup address"
          />
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold resize-none"
            placeholder="Notes"
          />
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
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReschedulePickupScheduleModal;
