import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "../utils/toast";
import { useConfirm } from "./ConfirmDialog";
import { formatDisplayDate } from "../utils/dateTime";
import {
  getPickupSchedulesAPI,
  cancelPickupScheduleAPI,
  reschedulePickupScheduleAPI,
} from "../api/pickupScheduleAPI";
import SchedulePickupModal from "./SchedulePickupModal";
import CompletePickupScheduleModal from "./CompletePickupScheduleModal";

const SCHEDULE_TABS = [
  { label: "Scheduled", key: "scheduled" },
  { label: "Today", key: "today" },
  { label: "Future", key: "future" },
  { label: "Completed", key: "completed" },
  { label: "Cancelled", key: "cancelled" },
  { label: "All", key: "all" },
];

const RescheduleScheduleModal = ({ isOpen, onClose, schedule, onConfirm }) => {
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
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-black uppercase">Reschedule Pickup</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm({
              pickupDate,
              pickupTime,
              pickupLocation,
              notes,
            });
          }}
          className="space-y-3"
        >
          <input
            type="date"
            required
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="time"
            required
            min="11:00"
            max="17:00"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="text"
            required
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-xs"
          />
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-xs resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-xl text-xs font-bold">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PickupSchedulePanel = ({ canWrite, isAdmin = false }) => {
  const { user } = useSelector((state) => state.auth);
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState("scheduled");
  const [searchQuery, setSearchQuery] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [completeSchedule, setCompleteSchedule] = useState(null);
  const [rescheduleSchedule, setRescheduleSchedule] = useState(null);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await getPickupSchedulesAPI({
        tab: activeTab,
        search: searchQuery.trim() || undefined,
        page: currentPage,
        perPage,
      });
      setSchedules(res.data || []);
      setCounts(res.counts || {});
      setPagination(res.meta?.pagination || { total: 0, total_pages: 1 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [activeTab, searchQuery, currentPage, perPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, perPage]);

  const handleCancel = async (id) => {
    const ok = await confirm({
      title: "Cancel scheduled pickup",
      message: "Cancel this pickup schedule?",
      confirmLabel: "Cancel pickup",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await cancelPickupScheduleAPI(id);
      toast.success("Pickup schedule cancelled");
      fetchSchedules();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReschedule = async (payload) => {
    try {
      await reschedulePickupScheduleAPI(rescheduleSchedule._id, payload);
      toast.success("Pickup rescheduled");
      setRescheduleSchedule(null);
      fetchSchedules();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100">
        <div>
          <h2 className="text-sm font-black uppercase text-slate-800">
            Pickup-First Schedules
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Schedule pickups before creating orders
          </p>
        </div>
        {canWrite && !isAdmin && (
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
          >
            + Schedule Pickup
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl border border-slate-100">
        {SCHEDULE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              activeTab === tab.key
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {tab.label} ({counts[tab.key] ?? 0})
          </button>
        ))}
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-100">
        <input
          type="text"
          placeholder="Search schedule ID, location, order ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase">
            <tr>
              <th className="p-3">Schedule ID</th>
              <th className="p-3">Pickup</th>
              <th className="p-3">Packages</th>
              <th className="p-3">Service</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No pickup schedules found
                </td>
              </tr>
            ) : (
              schedules.map((row) => (
                <tr key={row._id} className="hover:bg-slate-50/50">
                  <td className="p-3 font-mono font-bold text-indigo-700">
                    {row.scheduleId}
                    {row.externalOrderId && (
                      <div className="text-slate-500 font-sans font-medium mt-0.5">
                        Order #{row.externalOrderId}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-semibold">{formatDisplayDate(row.pickupDate)}</div>
                    <div className="text-slate-500">{row.pickupTime}</div>
                    <div className="text-slate-600 mt-1 max-w-xs truncate" title={row.pickupLocation}>
                      {row.pickupLocation}
                    </div>
                  </td>
                  <td className="p-3">
                    {row.noOfBoxes} box · {row.weight} kg
                  </td>
                  <td className="p-3 capitalize">{row.preferredServiceType}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        row.status === "scheduled"
                          ? "bg-amber-100 text-amber-800"
                          : row.status === "completed"
                          ? row.awbAssigned
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {row.status === "completed" && !row.awbAssigned
                        ? "Order created"
                        : row.status}
                    </span>
                    {row.awbFailureReason && (
                      <p className="text-[10px] text-rose-500 mt-1 max-w-[180px] truncate" title={row.awbFailureReason}>
                        {row.awbFailureReason}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    {row.status === "scheduled" && canWrite && (
                      <>
                        {(isAdmin || canWrite) && (
                          <button
                            type="button"
                            onClick={() => setCompleteSchedule(row)}
                            className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setRescheduleSchedule(row)}
                          className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(row._id)}
                          className="px-2 py-1 text-rose-600 text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl">
        <span className="text-xs text-slate-400">
          Page {currentPage} of {pagination.total_pages || 1}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-2 border rounded-lg disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={currentPage >= (pagination.total_pages || 1)}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-2 border rounded-lg disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <SchedulePickupModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={fetchSchedules}
        user={user}
      />

      <CompletePickupScheduleModal
        isOpen={Boolean(completeSchedule)}
        schedule={completeSchedule}
        onClose={() => setCompleteSchedule(null)}
        onSuccess={fetchSchedules}
      />

      <RescheduleScheduleModal
        isOpen={Boolean(rescheduleSchedule)}
        schedule={rescheduleSchedule}
        onClose={() => setRescheduleSchedule(null)}
        onConfirm={handleReschedule}
      />
    </div>
  );
};

export default PickupSchedulePanel;
