import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    getAdminPickupsAPI,
    completePickupAPI,
    failPickupAPI,
} from "../api/shipingAPI";
import { formatDisplayDate } from "../utils/dateTime";

/* ================= SINGLE FAIL PICKUP REASON MODAL ================= */
const FailPickupModal = ({ isOpen, onClose, pickup, onConfirmFail }) => {
  const [failureReason, setFailureReason] = useState('Premises Closed');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !pickup) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = failureReason === 'Other' ? customReason : failureReason;
    if (!finalReason) {
      toast.validation('Please specify a failure reason');
      return;
    }
    onConfirmFail(pickup._id, finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Mark Pickup as Failed</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{pickup.externalOrderId || pickup.orderId} | AWB: <span className="font-mono text-indigo-600 font-bold">{pickup.awbNumber || 'N/A'}</span>
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
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Failure Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer"
            >
              <option value="Premises Closed">Premises Closed</option>
              <option value="Shipment Not Ready">Shipment Not Ready / Unpacked</option>
              <option value="Contact Person Unavailable">Contact Person / Seller Unavailable</option>
              <option value="Vehicle Issue / Courier Delay">Vehicle Issue / Courier Delay</option>
              <option value="Incorrect Address / Location">Incorrect Address / Location</option>
              <option value="Other">Other / Custom Reason</option>
            </select>
          </div>

          {failureReason === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Custom Reason Details
              </label>
              <textarea
                rows={3}
                value={customReason}
                placeholder="Type specific failure reason..."
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
              />
            </div>
          )}

          {/* Actions */}
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              Confirm Failure
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= BULK FAIL PICKUP REASON MODAL ================= */
const BulkFailPickupModal = ({ isOpen, onClose, selectedCount, onConfirmBulkFail }) => {
  const [failureReason, setFailureReason] = useState('Premises Closed');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = failureReason === 'Other' ? customReason : failureReason;
    if (!finalReason) {
      toast.validation('Please specify a failure reason');
      return;
    }
    onConfirmBulkFail(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Bulk Mark Pickups as Failed</h3>
            <p className="text-xs text-rose-600 font-semibold mt-0.5">
              Applying failure status to {selectedCount} selected pickups
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
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Failure Reason for All Selected <span className="text-rose-500">*</span>
            </label>
            <select
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer"
            >
              <option value="Premises Closed">Premises Closed</option>
              <option value="Shipment Not Ready">Shipment Not Ready / Unpacked</option>
              <option value="Contact Person Unavailable">Contact Person / Seller Unavailable</option>
              <option value="Vehicle Issue / Courier Delay">Vehicle Issue / Courier Delay</option>
              <option value="Incorrect Address / Location">Incorrect Address / Location</option>
              <option value="Other">Other / Custom Reason</option>
            </select>
          </div>

          {failureReason === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Custom Reason Details
              </label>
              <textarea
                rows={3}
                value={customReason}
                placeholder="Type specific failure reason for bulk update..."
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
              />
            </div>
          )}

          {/* Actions */}
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
            >
              Confirm Bulk Failure ({selectedCount})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ADMIN_TAB_TO_QUERY = {
  "Today's Pickups": "today",
  "Future Pickups": "future",
  "Failed Pickups": "failed",
  "Completed Pickups": "completed",
  "All Pickups": "all",
};

/* ================= MAIN ADMIN PICKUP PAGE COMPONENT ================= */
const AdminPickupPage = () => {
  const [activeTab, setActiveTab] = useState("All Pickups");
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [companiesList, setCompaniesList] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [counts, setCounts] = useState({
    today: 0,
    future: 0,
    failed: 0,
    completed: 0,
    scheduled: 0,
    all: 0,
  });
  const [selectedPickupIds, setSelectedPickupIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

  // Modal States
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);
  const [isBulkFailModalOpen, setIsBulkFailModalOpen] = useState(false);

  const [refreshToken, setRefreshToken] = useState(0);

  const isTodayTab = activeTab === "Today's Pickups";

  useEffect(() => {
    getAdminPickupsAPI({ tab: "all", userId: "ALL", page: 1, perPage: 1 })
      .then((res) => {
        if (Array.isArray(res.users) && res.users.length > 0) {
          setCompaniesList(res.users);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPickups = async () => {
      try {
        setLoading(true);

        const res = await getAdminPickupsAPI({
          tab: ADMIN_TAB_TO_QUERY[activeTab] || "all",
          search: searchQuery.trim() || undefined,
          userId: selectedCompany,
          page: currentPage,
          perPage,
        });

        if (cancelled) return;

        setPickups(res.data || []);
        setCounts(res.counts || {});
        setPagination(res.meta?.pagination || { total: 0, total_pages: 1 });

        if (Array.isArray(res.users) && res.users.length > 0) {
          setCompaniesList(res.users);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPickups();

    return () => {
      cancelled = true;
    };
  }, [activeTab, searchQuery, selectedCompany, currentPage, perPage, refreshToken]);

  const refreshPickups = () => setRefreshToken((token) => token + 1);

  const getStatus = (item) => item.pickupStatus || item.status;

  const filteredPickups = pickups;
  const totalPages = pagination.total_pages || 1;
  const totalPickups = pagination.total || 0;

  const selectablePickups = filteredPickups.filter(
    (p) =>
      p.pickupStatus !== "Completed" &&
      p.pickupStatus !== "Failed"
  );

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
  if (e.target.checked) {
    setSelectedPickupIds(selectablePickups.map(p => p._id));
  } else {
    setSelectedPickupIds([]);
  }
};

  const handleSelectRow = (id) => {
    if (selectedPickupIds.includes(id)) {
      setSelectedPickupIds(selectedPickupIds.filter(item => item !== id));
    } else {
      setSelectedPickupIds([...selectedPickupIds, id]);
    }
  };

  // Admin Action: Complete Pickup
  const handleCompletePickup = async (pickupId) => {
    try {
        await completePickupAPI(pickupId);

        toast.success("Pickup completed");

        refreshPickups();

    } catch (err) {
        toast.error(err.message);
    }
  };

  // Admin Action: Single Fail Modal
  const handleOpenFailModal = (pickup) => {
    setSelectedPickup(pickup);
    setIsFailModalOpen(true);
  };

  const handleConfirmFail = async (pickupId, reason) => {
    try {
        await failPickupAPI(
            pickupId,
            reason
        );

        toast.success("Pickup marked failed");

        refreshPickups();

        setIsFailModalOpen(false);
        setSelectedPickup(null);

    } catch (err) {
        toast.error(err.message);
    }
  };

  // Bulk Action: Complete
  const handleBulkComplete = async () => {
    try {
      await Promise.all(
        selectedPickupIds.map(id => completePickupAPI(id))
      );

      toast.success(`${selectedPickupIds.length} pickups completed`);

      setSelectedPickupIds([]);

      refreshPickups();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Bulk Action: Fail
  const handleConfirmBulkFail = async (reason) => {
    try {
      await Promise.all(
        selectedPickupIds.map(id => failPickupAPI(id, reason))
      );

      toast.success(`${selectedPickupIds.length} pickups marked as failed`);

      setIsBulkFailModalOpen(false);

      setSelectedPickupIds([]);

      refreshPickups();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      <div className="max-w-400 mx-auto space-y-5">
        
        {/* Header & User Selector Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Admin Pickup Control</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                Admin Privilege
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select a company to view their pickups, or manage all seller dispatches
            </p>
          </div>

          {/* User Selection Dropdown & Bulk Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 pl-2">Company:</span>
              <select
                value={selectedCompany}
                onChange={(e) => {
                  const companyId = e.target.value;
                  setSelectedCompany(companyId);
                  setCurrentPage(1);
                  setSelectedPickupIds([]);
                  if (companyId !== "ALL") {
                    setActiveTab("All Pickups");
                  }
                }}
                className="bg-white text-xs font-bold text-slate-800 py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[200px]"
              >
                <option value="ALL">All Companies</option>
                {companiesList.map((company) => (
                  <option key={String(company.id)} value={String(company.id)}>
                    {company.name || company.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk actions only available in Today's Pickups tab */}
            {isTodayTab && selectedPickupIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkComplete}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  ✓ Complete ({selectedPickupIds.length})
                </button>
                <button
                  onClick={() => setIsBulkFailModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  ✕ Fail ({selectedPickupIds.length})
                </button>
              </div>
            )}
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

        {/* Tab Selection & Search Header with Status-based Badge Counts */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {["Today's Pickups", "Future Pickups", "Failed Pickups", "Completed Pickups", "All Pickups"].map((tab) => {
              const isActive = activeTab === tab;
              const count =
                tab === "Today's Pickups" ? counts.today :
                tab === "Future Pickups" ? counts.future :
                tab === "Failed Pickups" ? counts.failed :
                tab === "Completed Pickups" ? counts.completed :
                counts.all ?? totalPickups;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                    setSelectedPickupIds([]);
                  }}
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
              placeholder="Search by Order ID, AWB, Company, or Courier..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {/* Show Checkbox Column Header ONLY in Today's Pickups */}
                {isTodayTab && (
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                       checked={
    selectablePickups.length > 0 &&
    selectedPickupIds.length === selectablePickups.length
  }
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Order / AWB</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Courier</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Seller & Location</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Pickup Date</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Status</th>
                {/* Show Admin Actions Header ONLY in Today's Pickups */}
                {isTodayTab && (
                  <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase text-right">Admin Actions</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-[13px] font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={isTodayTab ? 7 : 5} className="p-8 text-center text-slate-400 font-medium">
                    Loading admin pickup database...
                  </td>
                </tr>
              ) : filteredPickups.length === 0 ? (
                <tr>
                  <td colSpan={isTodayTab ? 7 : 5} className="p-8 text-center text-slate-400 font-medium">
                    {selectedCompany !== "ALL"
                      ? `No pickups found for this company in "${activeTab}". Try the "All Pickups" or "Completed Pickups" tab.`
                      : "No matching pickup records found."}
                  </td>
                </tr>
              ) : (
                filteredPickups.map((pickup) => {
                  const isChecked = selectedPickupIds.includes(pickup._id);
                  const currentStatus = getStatus(pickup);
                  const isTerminalStatus = currentStatus === 'Completed' || currentStatus === 'Failed';

                  return (
                    <tr key={pickup._id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-indigo-50/20' : ''}`}>
                      
                      {/* Checkbox - ONLY in Today's Pickups */}
                      {isTodayTab && (
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            disabled={
    pickup.pickupStatus === "Completed" ||
    pickup.pickupStatus === "Failed"
  }
                            checked={isChecked}
                            onChange={() => handleSelectRow(pickup._id)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Order / AWB */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">#{pickup.externalOrderId || pickup.orderId}</div>
                        <div className="font-mono text-xs text-indigo-600 font-semibold">{pickup.awbNumber || 'No AWB'}</div>
                      </td>

                      {/* Courier */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{pickup.courierName}</div>
                        <div className="text-xs text-slate-400">{pickup.contactPhone}</div>
                      </td>

                      {/* Seller & Location */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{pickup.userId?.companyName}</div>
                        <div className="text-xs text-slate-500">{pickup.pickupLocation}</div>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 font-mono text-slate-700 flex flex-col">
                        <span>
                          {formatDisplayDate(pickup.pickupDate)}
                        </span>
                        <span>
                          {pickup.pickupTime || 'N/A'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          currentStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          currentStatus === 'Failed' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          currentStatus === 'Future' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {currentStatus || 'Scheduled'}
                        </span>
                        {pickup.failureReason && (
                          <p className="text-[11px] text-rose-500 mt-1 max-w-xs truncate" title={pickup.failureReason}>
                            Reason: {pickup.failureReason}
                          </p>
                        )}
                      </td>

                      {/* Admin Controls - ONLY in Today's Pickups */}
                      {isTodayTab && (
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {!isTerminalStatus ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleCompletePickup(pickup._id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg transition-colors"
                              >
                                ✓ Complete
                              </button>

                              <button
                                onClick={() => handleOpenFailModal(pickup)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors"
                              >
                                ✕ Fail
                              </button>
                            </div>
                          ) : null}
                        </td>
                      )}

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-100 p-4 rounded-xl gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-gray-200 text-slate-700 font-bold text-xs rounded-lg py-1.5 px-2.5"
            >
              <option value={20}>20</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs text-slate-400">
              Page {currentPage} of {totalPages} ({totalPickups} pickups)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-slate-400 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPickups === 0}
              className="p-2 rounded-lg border border-gray-200 text-slate-400 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Single Fail Modal */}
      <FailPickupModal
        isOpen={isFailModalOpen}
        onClose={() => { setIsFailModalOpen(false); setSelectedPickup(null); }}
        pickup={selectedPickup}
        onConfirmFail={handleConfirmFail}
      />

      {/* Bulk Fail Modal */}
      <BulkFailPickupModal
        isOpen={isBulkFailModalOpen}
        onClose={() => setIsBulkFailModalOpen(false)}
        selectedCount={selectedPickupIds.length}
        onConfirmBulkFail={handleConfirmBulkFail}
      />
    </div>
  );
};

export default AdminPickupPage;