import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

/* ================= SINGLE FAIL PICKUP REASON MODAL ================= */
const FailPickupModal = ({ isOpen, onClose, pickup, onConfirmFail }) => {
  const [failureReason, setFailureReason] = useState('Premises Closed');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !pickup) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = failureReason === 'Other' ? customReason : failureReason;
    if (!finalReason) {
      toast.error('Please specify a failure reason');
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
      toast.error('Please specify a failure reason');
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

/* ================= RESCHEDULE PICKUP MODAL ================= */
const AdminRescheduleModal = ({ isOpen, onClose, pickup, onConfirmReschedule }) => {
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
      pickupDate,
      pickupLocation,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Admin Reschedule Pickup</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{pickup.externalOrderId || pickup.orderId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              Admin Override Notes / Reason
            </label>
            <textarea
              rows={3}
              value={notes}
              placeholder="e.g. Admin rescheduled due to seller request..."
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

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
              Update Pickup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ================= MAIN ADMIN PICKUP PAGE COMPONENT ================= */
const AdminPickupPage = () => {
  const [activeTab, setActiveTab] = useState("Today's Pickups");
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('ALL'); // User filter state
  const [usersList, setUsersList] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [selectedPickupIds, setSelectedPickupIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);
  const [isBulkFailModalOpen, setIsBulkFailModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  // Mock Data Fetching (Replace with backend Admin API calls)
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];

      // Users List for filter
      const mockUsers = [
        { id: 'usr_1', name: 'Reboot Threads HQ', email: 'hq@rebootthreads.com' },
        { id: 'usr_2', name: 'Reboot Threads South', email: 'south@rebootthreads.com' },
        { id: 'usr_3', name: 'Apex Logistics Seller', email: 'seller@apex.com' },
      ];

      // Pickups List
      const mockPickups = [
        {
          _id: 'p1',
          userId: 'usr_1',
          orderId: 'ord_101',
          externalOrderId: 'EXT-8821',
          awbNumber: 'AWB9920102',
          courierName: 'Delhivery Surface',
          consignorName: 'Reboot Threads HQ',
          pickupLocation: 'Default Warehouse',
          pickupDate: todayStr,
          status: 'Scheduled',
          packagesCount: 3,
          contactPhone: '+91 9876543210'
        },
        {
          _id: 'p2',
          userId: 'usr_2',
          orderId: 'ord_102',
          externalOrderId: 'EXT-8822',
          awbNumber: 'AWB9920103',
          courierName: 'Bluedart Express',
          consignorName: 'Reboot Threads South',
          pickupLocation: 'Secondary Warehouse',
          pickupDate: todayStr,
          status: 'Failed',
          failureReason: 'Premises closed during pickup attempt',
          packagesCount: 1,
          contactPhone: '+91 9876543211'
        },
        {
          _id: 'p3',
          userId: 'usr_1',
          orderId: 'ord_103',
          externalOrderId: 'EXT-8823',
          awbNumber: 'AWB9920104',
          courierName: 'Shadowfax',
          consignorName: 'Reboot Threads HQ',
          pickupLocation: 'Default Warehouse',
          pickupDate: '2026-08-05',
          status: 'Future',
          packagesCount: 5,
          contactPhone: '+91 9876543212'
        },
        {
          _id: 'p4',
          userId: 'usr_1',
          orderId: 'ord_104',
          externalOrderId: 'EXT-8824',
          awbNumber: 'AWB9920105',
          courierName: 'Xpressbees',
          consignorName: 'Reboot Threads HQ',
          pickupLocation: 'Default Warehouse',
          pickupDate: todayStr,
          status: 'Completed',
          packagesCount: 2,
          contactPhone: '+91 9876543210'
        }
      ];

      setUsersList(mockUsers);
      setPickups(mockPickups);
      setLoading(false);
    }, 300);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. First filter pickups by selected User
  const userFilteredPickups = pickups.filter(p => {
    if (selectedUser === 'ALL') return true;
    return p.userId === selectedUser;
  });

  // Metrics computation (derived from user-filtered pickups)
  const counts = {
    today: userFilteredPickups.filter(p => p.pickupDate === todayStr && p.status !== 'Failed').length,
    future: userFilteredPickups.filter(p => p.pickupDate > todayStr && p.status !== 'Failed').length,
    failed: userFilteredPickups.filter(p => p.status === 'Failed').length,
    completed: userFilteredPickups.filter(p => p.status === 'Completed').length,
  };

  // 2. Further filter by Active Tab & Search Query
  const filteredPickups = userFilteredPickups.filter((item) => {
    let matchesTab = false;
    if (activeTab === "Today's Pickups") {
      matchesTab = item.pickupDate === todayStr && item.status !== 'Failed';
    } else if (activeTab === "Future Pickups") {
      matchesTab = item.pickupDate > todayStr && item.status !== 'Failed';
    } else if (activeTab === "Failed Pickups") {
      matchesTab = item.status === 'Failed';
    } else if (activeTab === "All Pickups") {
      matchesTab = true;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.externalOrderId?.toLowerCase().includes(q) ||
      item.awbNumber?.toLowerCase().includes(q) ||
      item.consignorName?.toLowerCase().includes(q) ||
      item.courierName?.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPickupIds(filteredPickups.map(p => p._id));
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
  const handleCompletePickup = (pickupId) => {
    setPickups(prev =>
      prev.map(p => (p._id === pickupId ? { ...p, status: 'Completed', failureReason: null } : p))
    );
    toast.success("Pickup marked as Completed");
  };

  // Admin Action: Single Fail Modal
  const handleOpenFailModal = (pickup) => {
    setSelectedPickup(pickup);
    setIsFailModalOpen(true);
  };

  const handleConfirmFail = (pickupId, reason) => {
    setPickups(prev =>
      prev.map(p => (p._id === pickupId ? { ...p, status: 'Failed', failureReason: reason } : p))
    );
    toast.error("Pickup marked as Failed");
    setIsFailModalOpen(false);
    setSelectedPickup(null);
  };

  // Admin Action: Reschedule
  const handleConfirmReschedule = (payload) => {
    setPickups(prev =>
      prev.map(p => {
        if (p._id === payload.pickupId) {
          return {
            ...p,
            pickupDate: payload.pickupDate,
            pickupLocation: payload.pickupLocation,
            notes: payload.notes,
            status: payload.pickupDate === todayStr ? 'Scheduled' : 'Future',
            failureReason: null
          };
        }
        return p;
      })
    );
    toast.success("Pickup rescheduled by Admin");
    setIsRescheduleModalOpen(false);
    setSelectedPickup(null);
  };

  // Bulk Action: Complete
  const handleBulkComplete = () => {
    setPickups(prev =>
      prev.map(p => (selectedPickupIds.includes(p._id) ? { ...p, status: 'Completed', failureReason: null } : p))
    );
    toast.success(`Marked ${selectedPickupIds.length} pickups as Completed`);
    setSelectedPickupIds([]);
  };

  // Bulk Action: Fail
  const handleConfirmBulkFail = (reason) => {
    setPickups(prev =>
      prev.map(p => (selectedPickupIds.includes(p._id) ? { ...p, status: 'Failed', failureReason: reason } : p))
    );
    toast.error(`Marked ${selectedPickupIds.length} pickups as Failed`);
    setIsBulkFailModalOpen(false);
    setSelectedPickupIds([]);
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
              Select a user to view their specific pickups, or manage all seller dispatches
            </p>
          </div>

          {/* User Selection Dropdown & Bulk Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 pl-2">Filter User:</span>
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setSelectedPickupIds([]); }}
                className="bg-white text-xs font-bold text-slate-800 py-1.5 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="ALL">All Users / Sellers</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {selectedPickupIds.length > 0 && (
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

        {/* Tab Selection & Search Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {["Today's Pickups", "Future Pickups", "Failed Pickups", "All Pickups"].map((tab) => {
              const isActive = activeTab === tab;
              const count =
                tab === "Today's Pickups" ? counts.today :
                tab === "Future Pickups" ? counts.future :
                tab === "Failed Pickups" ? counts.failed : userFilteredPickups.length;

              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedPickupIds([]); }}
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
              placeholder="Search Order, AWB, Seller..."
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
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={filteredPickups.length > 0 && selectedPickupIds.length === filteredPickups.length}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Order / AWB</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Courier</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Seller & Location</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Pickup Date</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase">Status</th>
                <th className="p-3.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase text-right">Admin Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-[13px] font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    Loading admin pickup database...
                  </td>
                </tr>
              ) : filteredPickups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No matching pickup records found.
                  </td>
                </tr>
              ) : (
                filteredPickups.map((pickup) => {
                  const isChecked = selectedPickupIds.includes(pickup._id);

                  return (
                    <tr key={pickup._id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-indigo-50/20' : ''}`}>
                      
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(pickup._id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

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
                        <div className="font-bold text-slate-800">{pickup.consignorName}</div>
                        <div className="text-xs text-slate-500">{pickup.pickupLocation}</div>
                      </td>

                      {/* Date */}
                      <td className="p-3.5 font-mono text-slate-700">
                        {pickup.pickupDate ? new Date(pickup.pickupDate).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          pickup.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          pickup.status === 'Failed' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          pickup.status === 'Future' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {pickup.status}
                        </span>
                        {pickup.failureReason && (
                          <p className="text-[11px] text-rose-500 mt-1 max-w-xs truncate" title={pickup.failureReason}>
                            Reason: {pickup.failureReason}
                          </p>
                        )}
                      </td>

                      {/* Admin Controls */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {pickup.status !== 'Completed' && (
                            <button
                              onClick={() => handleCompletePickup(pickup._id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg transition-colors"
                            >
                              ✓ Complete
                            </button>
                          )}

                          {pickup.status !== 'Failed' && (
                            <button
                              onClick={() => handleOpenFailModal(pickup)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors"
                            >
                              ✕ Fail
                            </button>
                          )}

                          <button
                            onClick={() => { setSelectedPickup(pickup); setIsRescheduleModalOpen(true); }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                          >
                            Reschedule
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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

      {/* Admin Reschedule Modal */}
      <AdminRescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => { setIsRescheduleModalOpen(false); setSelectedPickup(null); }}
        pickup={selectedPickup}
        onConfirmReschedule={handleConfirmReschedule}
      />
    </div>
  );
};

export default AdminPickupPage;