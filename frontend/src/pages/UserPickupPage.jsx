import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { pickupOrdersAPI, reschedulePickupAPI} from "../api/shipingAPI";


/* ================= RESCHEDULE PICKUP MODAL ================= */
const ReschedulePickupModal = ({ isOpen, onClose, pickup, onConfirmReschedule }) => {
  const [pickupDate, setPickupDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('Default Warehouse');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (pickup) {
      setPickupDate(pickup.pickupDate ? pickup.pickupDate.split('T')[0] : '');
      setPickupLocation(pickup.pickupLocation || 'Default Warehouse');
      setNotes(pickup.notes || '');
    }
  }, [pickup]);

  if (!isOpen || !pickup) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmReschedule({
      pickupId: pickup._id,
      orderId: pickup.orderId,
      pickupDate,
      pickupLocation,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Reschedule Pickup</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{pickup.externalOrderId || "-"} | AWB: <span className="font-mono text-indigo-600 font-bold">{pickup.awbNumber || 'N/A'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {pickup.pickupStatus === 'Failed' && pickup.failureReason && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">
              <strong className="block font-bold mb-0.5">Previous Failure Reason:</strong>
              {pickup.failureReason}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              New Pickup Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={pickupDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Pickup Location <span className="text-rose-500">*</span>
            </label>
            <select
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="Default Warehouse">Default Warehouse</option>
              <option value="Secondary Warehouse">Secondary Warehouse</option>
              <option value="Store Location">Store Location</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Reschedule Reason / Special Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              placeholder="e.g. Seller wasn't available, rescheduled as requested..."
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              Save & Reschedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= MAIN PICKUP PAGE COMPONENT ================= */
const UserPickupPage = () => {
  const [activeTab, setActiveTab] = useState("Today's Pickups");
  const [searchQuery, setSearchQuery] = useState('');
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

const fetchPickups = async () => {
  try {
    setLoading(true);

    const res = await pickupOrdersAPI();

    setPickups(res.data || []);
  } catch (err) {
    toast.error(err.message);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchPickups();
}, []);

 const today = new Date();
today.setHours(0, 0, 0, 0);

 const counts = {
  today: pickups.filter((p) => {
    if (!p.pickupDate) return false;

    const date = new Date(p.pickupDate);
    date.setHours(0, 0, 0, 0);

    return (
      date.getTime() === today.getTime() &&
      p.pickupStatus !== "Failed"
    );
  }).length,

  future: pickups.filter((p) => {
    if (!p.pickupDate) return false;

    const date = new Date(p.pickupDate);
    date.setHours(0, 0, 0, 0);

    return (
      date > today &&
      p.pickupStatus !== "Failed"
    );
  }).length,

  failed: pickups.filter(
    p => p.pickupStatus === "Failed"
  ).length,

  completed: pickups.filter(
    p => p.pickupStatus === "Completed"
  ).length,
};

  const filteredPickups = pickups.filter((item) => {

  const pickupDay = item.pickupDate
    ? new Date(item.pickupDate)
    : null;

  if (pickupDay) pickupDay.setHours(0,0,0,0);

  let matchesTab = false;

  switch (activeTab) {

    case "Today's Pickups":
      matchesTab =
        pickupDay &&
        pickupDay.getTime() === today.getTime() &&
        item.pickupStatus !== "Failed";
      break;

    case "Future Pickups":
      matchesTab =
        pickupDay &&
        pickupDay > today &&
        item.pickupStatus !== "Failed";
      break;

    case "Failed Pickups":
      matchesTab =
        item.pickupStatus === "Failed";
      break;

    default:
      matchesTab = true;
  }

  const q = searchQuery.toLowerCase();

  const matchesSearch =
    !q ||
    item.orderId?.externalOrderId?.toLowerCase().includes(q) ||
    item.awbNumber?.toLowerCase().includes(q) ||
    item.courierName?.toLowerCase().includes(q);

  return matchesTab && matchesSearch;
});

  const handleOpenReschedule = (pickup) => {
    setSelectedPickup(pickup);
    setIsRescheduleModalOpen(true);
  };

  const handleConfirmReschedule = async (reschedulePayload) => {
  try {
    await reschedulePickupAPI(reschedulePayload);

    toast.success("Pickup rescheduled successfully!");

    fetchPickups();

    setIsRescheduleModalOpen(false);
    setSelectedPickup(null);
  } catch (err) {
    console.error(err);
    toast.error(err.message);
  }
};
  const handleCancelPickup = (pickupId) => {
    if (window.confirm("Are you sure you want to cancel this pickup request?")) {
      setPickups(prev => prev.filter(p => p._id !== pickupId));
      toast.success("Pickup request cancelled");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      <div className="max-w-400 mx-auto space-y-5">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pickup Management</h1>
            <p className="text-xs text-slate-500 mt-1">
              Track, reschedule, and manage daily courier pickup dispatches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPickups}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              🔄 Refresh List
            </button>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Today's Pickups</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{counts.today}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              📦
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Future Pickups</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{counts.future}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
              📅
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Failed Pickups</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{counts.failed}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
              ⚠️
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Completed</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{counts.completed}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
              ✅
            </div>
          </div>
        </div>

        {/* Tab Selection & Search Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {["Today's Pickups", "Future Pickups", "Failed Pickups", "All Pickups"].map((tab) => {
              const isActive = activeTab === tab;
              const count =
                tab === "Today's Pickups" ? counts.today :
                tab === "Future Pickups" ? counts.future :
                tab === "Failed Pickups" ? counts.failed : pickups.length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search Order, AWB, Courier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Order / AWB</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Courier</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Pickup Location</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Pickup Date</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Packages</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Status</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-[13px] font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    Loading pickup schedules...
                  </td>
                </tr>
              ) : filteredPickups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No matching pickup records found.
                  </td>
                </tr>
              ) : (
                filteredPickups.map((pickup) => (
                  <tr key={pickup._id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Order / AWB */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">#{pickup.externalOrderId || "-"}</div>
                      <div className="font-mono text-xs text-indigo-600">{pickup.awbNumber || 'No AWB'}</div>
                    </td>

                    {/* Courier */}
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{pickup.courierName}</div>
                      <div className="text-xs text-slate-400">{pickup.contactPhone}</div>
                    </td>

                    {/* Location */}
                    <td className="p-3.5">
                      <div className="text-slate-800">{pickup.pickupLocation}</div>
                      <div className="text-xs text-slate-400">{pickup.consignorName}</div>
                    </td>

                    {/* Date */}
                    <td className="p-3.5 font-mono text-slate-700">
                      {pickup.pickupDate ? new Date(pickup.pickupDate).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Packages */}
                    <td className="p-3.5 text-center font-bold text-slate-700">
                      {pickup.packagesCount || 1}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5">
<span
  className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
    pickup.pickupStatus === "Completed"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : pickup.pickupStatus === "Failed"
      ? "bg-rose-100 text-rose-800 border-rose-200"
      : pickup.pickupStatus === "Scheduled"
      ? "bg-indigo-100 text-indigo-800 border-indigo-200"
      : "bg-amber-100 text-amber-800 border-amber-200"
  }`}
>
  {pickup.pickupStatus}
</span>

  {pickup.failureReason && (
    <p
      className="text-[11px] text-rose-500 mt-1 max-w-xs truncate"
      title={pickup.failureReason}
    >
      {pickup.failureReason}
    </p>
  )}
</td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenReschedule(pickup)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition-colors"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancelPickup(pickup._id)}
                          className="px-2.5 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Reschedule Pickup Modal */}
      <ReschedulePickupModal
        isOpen={isRescheduleModalOpen}
        onClose={() => { setIsRescheduleModalOpen(false); setSelectedPickup(null); }}
        pickup={selectedPickup}
        onConfirmReschedule={handleConfirmReschedule}
      />
    </div>
  );
};

export default UserPickupPage;