import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getOrders } from '../api/ordersAPI';
import { getCompanies } from '../api/companyAPI';
import { getDashboardData } from '../api/dashboardAPI';
import SelectCourier from './SelectCourier'; 
import OrderResponse from './OrderResponse';
import { shipOrdersAPI } from '../api/shipingAPI';
import { toast } from 'react-hot-toast';
import OrderTracker from '../components/OrderTracker';
import OrdersAnalyticsPanel from '../components/OrdersAnalyticsPanel';
import {
  formatDisplayDate,
  todayISODateOnly,
} from '../utils/dateTime';
import { useLatestRequestId } from '../utils/useLatestRequestId';

const SEARCH_TYPES = {
  orderId: {
    label: 'Order ID',
    apiType: 'order_id',
    placeholder: 'Enter order ID',
    prefix: '#',
  },
  phone: {
    label: 'Phone',
    apiType: 'phone',
    placeholder: '10-digit mobile number',
  },
  customer: {
    label: 'Customer',
    apiType: 'customer',
    placeholder: 'Customer name',
  },
  awb: {
    label: 'AWB',
    apiType: 'awb',
    placeholder: 'AWB number',
  },
};

const buildOrderSearchParams = (searchType, searchQuery) => {
  const term = String(searchQuery || '').trim();
  if (!term) {
    return { search: undefined, searchType: undefined };
  }

  const config = SEARCH_TYPES[searchType] || SEARCH_TYPES.orderId;

  return {
    search: config.prefix ? `${config.prefix}${term.replace(/^#+/, '')}` : term,
    searchType: config.apiType,
  };
};

const isSearchActive = (searchType, searchQuery) =>
  Boolean(String(searchQuery || '').trim());


/* ================= COPY BUTTON UI COMPONENT ================= */
const CopyButton = ({ text, label, e }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (evt) => {
    if (evt) evt.stopPropagation();
    if (!text || text === '-') {
      toast.error(`No ${label} available to copy`);
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded border border-slate-200 hover:border-indigo-200 transition-all duration-150 active:scale-95 shrink-0"
      title={`Copy ${label}`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-emerald-600">Copied</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

/* ================= SCHEDULE PICKUP MODAL ================= */
const SchedulePickupModal = ({ isOpen, onClose, selectedCourier, ordersCount, onFinalSubmit, defaultPickupLocation }) => {
  const todayStr = todayISODateOnly();
  
  const [pickupDate, setPickupDate] = useState(todayStr);
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupTime, setPickupTime] = useState('11:00');
  const [notes, setNotes] = useState('');

  // Helper to format Date object into HH:mm format
  const getFormattedTime = (dateObj) => {
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Compute dynamic min time for native <input type="time" />
  const getMinTime = () => {
    if (pickupDate === todayStr) {
      const now = new Date();
      const nowFormatted = getFormattedTime(now);
      // If current time is past 11:00 AM, use current time; otherwise fallback to 11:00
      return nowFormatted > '11:00' ? nowFormatted : '11:00';
    }
    return '11:00';
  };

  useEffect(() => {
    if (isOpen) {
      setPickupLocation(defaultPickupLocation || '');
    }
  }, [isOpen, defaultPickupLocation]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const now = new Date();
    const isToday = pickupDate === todayStr;

    const [hours, minutes] = pickupTime.split(':').map(Number);
    const selectedMinutes = hours * 60 + minutes;

    const startLimit = 11 * 60; // 11:00 AM
    const endLimit = 17 * 60;   // 5:00 PM
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Check if same-day scheduling is attempted after 5:00 PM
    if (isToday && currentMinutes >= endLimit) {
      toast.error('Pickups for today are closed as it is past 5:00 PM. Please select a future date.');
      return;
    }

    // 2. Check general 11:00 AM to 5:00 PM boundary
    if (selectedMinutes < startLimit || selectedMinutes > endLimit) {
      toast.error('Pickup time must be between 11:00 AM and 5:00 PM.');
      return;
    }

    // 3. Check if time is in the past for today
    if (isToday && selectedMinutes <= currentMinutes) {
      toast.error('Pickup time must be later than the current time.');
      return;
    }

    onFinalSubmit({
      pickupDate,
      pickupLocation,
      pickupTime,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Schedule Pickup</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Courier: <span className="font-semibold text-indigo-600">{selectedCourier?.courierName || 'Selected Courier'}</span> ({ordersCount} order{ordersCount > 1 ? 's' : ''})
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
              Pickup Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={pickupDate}
              min={todayStr}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Pickup Location <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="Enter pickup location"
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-600 uppercase">
                Pickup Time <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                11:00 AM - 5:00 PM
              </span>
            </div>
            <input
              type="time"
              required
              min={getMinTime()}
              max="17:00"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Select a future time window between 11:00 AM and 5:00 PM today or on a future date.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Notes / Special Instructions
            </label>
            <textarea
              rows={3}
              value={notes}
              placeholder="e.g. Handle with care, pick up near gate #2..."
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
              Confirm & Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


/* ================= ORDER DETAILS & TRACKING MODAL ================= */
const OrderDetailsModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const awbNumber = order.shipping?.awbNumber;
  const currentStatus = order.shipping?.shippingStatus || 'Pending';
  const trackingHistory = order.shipping?.trackingHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800">
                Order #{order.externalOrderId || "undefined"}
              </h3>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                currentStatus === 'Delivered' ? 'bg-green-100 text-green-800 border-green-200' :
                ['In Transit', 'Shipped', 'Out For Delivery'].includes(currentStatus) ? 'bg-blue-100 text-blue-800 border-blue-200' :
                currentStatus === 'Booked' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                ['Cancelled', 'RTO', 'Returned'].includes(currentStatus) ? 'bg-rose-100 text-rose-800 border-rose-200' :
                'bg-orange-100 text-orange-800 border-orange-200'
              }`}>
                {currentStatus}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {order.paymentMethod || 'COD'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Order Date: {formatDisplayDate(order.orderDate)} | Pickup Date: {formatDisplayDate(order.shipping?.pickupDate)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <OrderTracker 
            awbNumber={awbNumber}
            currentStatus={currentStatus}
            trackingHistory={trackingHistory}
            courierName={order.shipping?.courierName}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Consignor (Sender)</h4>
              <p className="text-sm font-semibold text-slate-800">{order.consignorName || 'N/A'}</p>
              <p className="text-xs text-slate-500">Pickup Location: {order.shipping?.pickupLocation || 'Default Warehouse'}</p>
            </div>

            <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Consignee (Receiver)</h4>
              <p className="text-sm font-semibold text-slate-800">
                {`${order.consigneeName || ''} ${order.consigneeLastName || ''}`.trim() || 'N/A'}
              </p>
              <p className="text-xs text-slate-600">
                {order.address} {order.address2 ? `, ${order.address2}` : ''}
              </p>
              <p className="text-xs text-slate-600">
                {order.destinationCity ? `${order.destinationCity}, ` : ''}
                {order.destinationState || ''} {order.destinationPincode ? `- ${order.destinationPincode}` : ''}, {order.destinationCountry || 'India'}
              </p>
              <div className="text-xs font-medium text-slate-700 mt-1 space-y-0.5">
                <p>📞 {order.billingPhone || order.contactNo || 'N/A'} {order.billingAlternatePhone ? `/ ${order.billingAlternatePhone}` : ''}</p>
                {order.consigneeEmail && <p>✉️ {order.consigneeEmail}</p>}
              </div>
            </div>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Order Items</h4>
              <span className="text-xs font-semibold text-slate-500">Total Items: {order.qty || 1}</span>
            </div>
            
            {order.orderItems && order.orderItems.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {order.orderItems.map((item, idx) => (
                  <div key={idx} className="p-3 text-xs flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name || `Item #${idx + 1}`}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.sku ? `SKU: ${item.sku}` : ''} {item.hsn ? `| HSN: ${item.hsn}` : ''}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-700">₹{item.sellingPrice || 0} x {item.units || 1}</p>
                      {(item.discount > 0 || item.tax > 0) && (
                        <p className="text-[10px] text-slate-400">
                          Disc: ₹{item.discount} | Tax: {item.tax}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-400 italic">No itemized details recorded.</div>
            )}

            <div className="border-t border-slate-100 bg-slate-50/50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Invoice Value</span>
                <span className="font-mono font-bold text-slate-900">₹{order.invoiceValue || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Subtotal</span>
                <span className="font-mono font-bold text-slate-700">₹{order.subTotal || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Shipping Charges</span>
                <span className="font-mono font-bold text-slate-700">₹{order.shippingCharges || 0}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Package Weight & Box</span>
                <span className="font-mono font-bold text-slate-700">
                  {order.weight ? `${order.weight} kg` : 'N/A'}
                  {order.length ? ` (${order.length}x${order.breadth}x${order.height} cm)` : ''}
                </span>
              </div>
            </div>
          </div>

          {order.comment && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600">
              <strong className="text-slate-700 block mb-0.5">Comments / Notes:</strong>
              {order.comment}
            </div>
          )}

        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= MAIN ORDERS PAGE COMPONENT ================= */
const OrdersPage = () => {
  const { isAdmin, user } = useSelector((state) => state.auth);
  const [activeSegment, setActiveSegment] = useState('All Orders');
  const [counts, setCounts] = useState({});
  const [allOrders, setAllOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignmentResponse, setAssignmentResponse] = useState(null);

  // Search & Order Date Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('orderId');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [companiesList, setCompaniesList] = useState([]);
  const [analyticsYear, setAnalyticsYear] = useState(String(new Date().getFullYear()));
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [shipmentAnalytics, setShipmentAnalytics] = useState(null);

  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [ordersToShip, setOrdersToShip] = useState([]);

  // States for Schedule Pickup Modal Step
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedCourierData, setSelectedCourierData] = useState(null);

  // Modal State for Order Details & Tracking
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    total_pages: 1,
  });
  const { startRequest, isLatestRequest } = useLatestRequestId();

  useEffect(() => {
    if (!isAdmin) return;

    getCompanies()
      .then((res) => {
        if (res.success && Array.isArray(res.companies)) {
          setCompaniesList(res.companies);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const data = await getDashboardData({
          year: analyticsYear,
          companyId: isAdmin ? selectedCompany : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        setSalesAnalytics(data.salesAnalytics || null);
        setShipmentAnalytics(data.shipmentAnalytics || null);
      } catch (error) {
        console.error(error);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, [isAdmin, selectedCompany, analyticsYear, fromDate, toDate]);

  const fetchOrders = useCallback(async () => {
    const requestId = startRequest();

    try {
      const searchParams = buildOrderSearchParams(searchType, searchQuery);

      const res = await getOrders({
        status: activeSegment !== "All Orders" ? activeSegment : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        search: searchParams.search,
        searchType: searchParams.searchType,
        companyId: isAdmin ? selectedCompany : undefined,
        page: currentPage,
        perPage: ordersPerPage,
      });

      if (!isLatestRequest(requestId)) return;

      if (res.success) {
        setAllOrders(res.orders || []);
        setCounts(res.counts || {});
        setPagination(res.meta?.pagination || { total: 0, total_pages: 1 });
      }
    } catch (err) {
      if (!isLatestRequest(requestId)) return;
      console.error(err);
    }
  }, [
    activeSegment,
    fromDate,
    toDate,
    searchQuery,
    searchType,
    selectedCompany,
    isAdmin,
    currentPage,
    ordersPerPage,
    startRequest,
    isLatestRequest,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setSelectedOrders([]);
    setCurrentPage(1);
  }, [activeSegment, searchQuery, searchType, fromDate, toDate, selectedCompany]);

  // Compute Phone Number Frequencies across ALL loaded orders to identify repeat customers
  const phoneCounts = useMemo(() => {
    const map = new Map();
    allOrders.forEach((o) => {
      const p = (o.billingPhone || o.contactNo || '').trim();
      if (p && p !== '-') {
        map.set(p, (map.get(p) || 0) + 1);
      }
    });
    return map;
  }, [allOrders]);

  const getTabCount = (tabName) => counts[tabName] || 0;

  const currentOrders = allOrders;
  const totalPages = pagination.total_pages || 1;
  const totalOrders = pagination.total || 0;
  const indexOfFirstOrder = totalOrders === 0 ? 0 : (currentPage - 1) * ordersPerPage + 1;
  const indexOfLastOrder = Math.min(currentPage * ordersPerPage, totalOrders);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = currentOrders.map(o => o._id);
      setSelectedOrders(prev => Array.from(new Set([...prev, ...ids])));
    } else {
      const ids = new Set(currentOrders.map(o => o._id));
      setSelectedOrders(prev => prev.filter(id => !ids.has(id)));
    }
  };

  const handleSelectRow = (id) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(item => item !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleSingleShipClick = (order) => {
    setOrdersToShip([order]); 
    setIsCourierModalOpen(true);
  };

  const handleBulkShipClick = () => {
    const matchingSelectedDetails = allOrders.filter(o =>
      selectedOrders.includes(o._id)
    );

    setOrdersToShip(matchingSelectedDetails);
    setIsCourierModalOpen(true);
  };

  const handleRowClick = (order) => {
    setSelectedOrderDetails(order);
    setIsDetailsModalOpen(true);
  };

  // STEP 1: Courier Selected -> Open Schedule Modal
  const handleCourierSelectionConfirm = (modalData) => {
    setSelectedCourierData(modalData);
    setIsCourierModalOpen(false);
    setIsScheduleModalOpen(true);
  };

  // STEP 2: Final Submit -> Send Complete Payload to Backend
  const handleFinalBookingSubmit = async (scheduleData) => {
    try {
      const orderPayloads = ordersToShip.map(order => ({
        orderId: order._id,
        weight: order.weight
      }));

      const payload = {
  serviceType: selectedCourierData.serviceType,
  pickupDate: scheduleData.pickupDate,
  pickupLocation: scheduleData.pickupLocation,
  pickupTime: scheduleData.pickupTime,
  notes: scheduleData.notes,
  orders: orderPayloads
};

      const res = await shipOrdersAPI(payload);

      if (res.success) {
  toast.success("Shipment & Pickup Scheduled Successfully");

  // Close previous modals
  setIsScheduleModalOpen(false);
  setSelectedCourierData(null);
  setSelectedOrders([]);
  setOrdersToShip([]);

  // Save API response and open assignment modal
  setAssignmentResponse(res); // or res, depending on your API
  setIsAssignmentModalOpen(true);

  fetchOrders();
} else {
        toast.error(res.message || "Failed to schedule pickup");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error while assigning AWB");
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSearchType('orderId');
    setFromDate('');
    setToDate('');
    setSelectedCompany('ALL');
  };

  const handleSearchTypeChange = (nextType) => {
    setSearchType(nextType);
    setSearchQuery((prev) => prev.replace(/^#+/, '').trim());
    setCurrentPage(1);
  };

  const activeSearchConfig = SEARCH_TYPES[searchType] || SEARCH_TYPES.orderId;

  const analyticsScopeLabel = useMemo(() => {
    if (isAdmin) {
      if (selectedCompany === 'ALL') {
        return 'All companies';
      }
      const company = companiesList.find((item) => item.companyID === selectedCompany);
      return company
        ? `${company.companyName} (${company.companyID})`
        : selectedCompany;
    }
    return user?.companyName
      ? `${user.companyName}${user.companyID ? ` (${user.companyID})` : ''}`
      : 'Your company';
  }, [isAdmin, selectedCompany, companiesList, user]);

  const headers = [
    'Order ID & Info', 
    'Order Items',
    'Customer Details', 
    'AWB No.',
    'Status & Actions'
  ];

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      <div className="max-w-400 mx-auto space-y-4">

        <OrdersAnalyticsPanel
          loading={analyticsLoading}
          salesAnalytics={salesAnalytics}
          shipmentAnalytics={shipmentAnalytics}
          scopeLabel={`${analyticsScopeLabel} · FY ${analyticsYear}${
            fromDate || toDate ? ' · filtered by order date' : ''
          }`}
          analyticsYear={analyticsYear}
          onYearChange={setAnalyticsYear}
        />

        {/* ================= SEGMENT TABS & BULK ACTIONS BAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-white p-3 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {['All Orders', 'Pending', 'Booked','In Transit','Delivered','RTO','Cancelled'].map((tabName) => {
              const isActive = activeSegment === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => {
                    setActiveSegment(tabName);
                    setCurrentPage(1);
                    setSelectedOrders([]);
                  }}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm'
                      : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{tabName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {getTabCount(tabName)}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedOrders.length > 0 && (
            <button
              onClick={handleBulkShipClick}
              className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-bold tracking-wide px-5 py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Bulk Ship ({selectedOrders.length})
            </button>
          )}
        </div>

        {/* ================= SEARCH & ORDER DATE FILTER BAR ================= */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl shadow-sm border border-gray-100">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[300px]">
            <div className="flex items-stretch w-full rounded-lg border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all overflow-hidden">
              <select
                value={searchType}
                onChange={(e) => handleSearchTypeChange(e.target.value)}
                className="shrink-0 max-w-[118px] pl-3 pr-7 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100/90 border-r border-slate-200 outline-none cursor-pointer appearance-none"
                aria-label="Search type"
              >
                {Object.entries(SEARCH_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>

              <div className="relative flex flex-1 items-center min-w-0">
                {activeSearchConfig.prefix && (
                  <span className="pl-3 text-sm font-bold text-indigo-500 select-none">
                    {activeSearchConfig.prefix}
                  </span>
                )}
                <input
                  type="text"
                  placeholder={activeSearchConfig.placeholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value.replace(/^#+/, ''));
                    setCurrentPage(1);
                  }}
                  className={`flex-1 min-w-0 text-xs font-medium bg-transparent py-2.5 pr-8 text-slate-700 outline-none ${
                    activeSearchConfig.prefix ? 'pl-1' : 'pl-3'
                  }`}
                />
                {isSearchActive(searchType, searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Order Date Range Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 min-w-[200px]">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Company:</span>
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer w-full max-w-[240px]"
                  aria-label="Filter by company"
                >
                  <option value="ALL">All Companies</option>
                  {companiesList.map((company) => (
                    <option key={company.companyID} value={company.companyID}>
                      {company.companyName} ({company.companyID})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
              />
            </div>

            {(isSearchActive(searchType, searchQuery) || fromDate || toDate || (isAdmin && selectedCompany !== 'ALL')) && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

        </div>

        {/* ================= DATA TABLE CONTAINER ================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FAFAFA]">
                <th className="p-4 sm:p-5 w-12 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={currentOrders.length > 0 && currentOrders.every(order => selectedOrders.includes(order._id))}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                {headers.map((header) => (
                  <th key={header} className="p-4 sm:p-5 text-xs font-bold tracking-wider text-slate-600 uppercase whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {header}
                      {!header.includes('Status') && <span className="text-xs text-gray-300 select-none">⇅</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100/80 text-sm font-medium text-slate-700">
              {currentOrders.map((order) => {
                const isChecked = selectedOrders.includes(order._id);
                
                const externalId = order.externalOrderId || order._id;
                const orderDateFormatted = formatDisplayDate(order.orderDate);
                
                // Pickup Date Resolution
                const rawPickupDate = order.shipping?.pickupDate;
                const pickupDateFormatted = formatDisplayDate(rawPickupDate);

                const fullName = `${order.consigneeName || ''} ${order.consigneeLastName || ''}`.trim() || '-';
                const email = order.consigneeEmail || '';
                const phone = (order.billingPhone || order.contactNo || '').trim();
                const fullAddress = `${order.address || ''} ${order.address2 ? `, ${order.address2}` : ''}`.trim();
                const destination = `${order.destinationCity || ''}${order.destinationState ? `, ${order.destinationState}` : ''} ${order.destinationPincode ? `- ${order.destinationPincode}` : ''}`.trim();
                const awbNo = order.shipping?.awbNumber || '';
                const pkgWeight = order.shipping?.totalWeight || order.weight || '-';

                // Identify Repeat Customer based on Phone Frequency (> 1 occurrence across all orders)
                const isRepeatCustomer = phone && phone !== '-' && (phoneCounts.get(phone) || 0) > 1;

                return (
                  <tr 
                    key={order._id} 
                    onClick={() => handleRowClick(order)}
                    className={`hover:bg-slate-50/90 transition-colors cursor-pointer ${isChecked ? 'bg-indigo-50/30' : ''}`}
                  >
                    <td className="p-4 sm:p-5 text-center align-top" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectRow(order._id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
                      />
                    </td>

                    {/* SECTION 1: ORDER ID & INFO */}
                    <td className="p-4 sm:p-5 align-top min-w-[220px]">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-900 tracking-tight">#{externalId}</span>
                          <CopyButton text={externalId} label="Order ID" />
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <p className="flex items-center gap-1">
                            <span className="text-slate-400">📅 Order Date:</span> 
                            <span className="font-semibold text-slate-700">{orderDateFormatted}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <span className="text-slate-400">📦 Pickup Date:</span> 
                            <span className="font-semibold text-indigo-600">{pickupDateFormatted}</span>
                          </p>
                          <p className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-slate-400">💳 Payment:</span> 
                            <span className={`font-bold px-2 py-0.5 rounded text-[11px] border ${
                              (order.paymentMethod || 'COD').toUpperCase() === 'COD' 
                                ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>{order.paymentMethod || 'COD'}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* SECTION 2: ORDER ITEMS & WEIGHT */}
                    <td className="p-4 sm:p-5 align-top min-w-[240px]">
                      <div className="space-y-2">
                        {order.orderItems && order.orderItems.length > 0 ? (
                          <div className="space-y-1.5">
                            {order.orderItems.map((item, idx) => (
                              <div key={idx} className="bg-slate-50/90 p-2 rounded-lg border border-slate-200/60">
                                <p className="font-semibold text-slate-800 text-xs line-clamp-1">{item.name}</p>
                                {item.sku && <p className="text-[11px] text-slate-500 mt-0.5 font-mono">SKU: {item.sku}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic text-xs">No item breakdown</p>
                        )}
                        <div className="text-xs font-semibold text-slate-700 pt-1 flex items-center justify-between border-t border-slate-100">
                          <span className="text-slate-500">Weight:</span>
                          <span className="font-mono font-bold text-indigo-600 text-xs">{pkgWeight !== '-' ? `${pkgWeight} kg` : '-'}</span>
                        </div>
                      </div>
                    </td>

                    {/* SECTION 3: CUSTOMER DETAILS & ENHANCED REPEAT TAG */}
                    <td className="p-4 sm:p-5 align-top min-w-[280px]">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900 text-sm">{fullName}</p>

                          {/* ATTRACTIVE REPEAT CUSTOMER BADGE */}
                          {isRepeatCustomer && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 rounded-full shadow-xs border border-purple-300/40 animate-pulse">
                              <span>✨ Repeat Customer</span>
                            </span>
                          )}
                        </div>

                        {email && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className="truncate max-w-[180px]" title={email}>✉️ {email}</span>
                            <CopyButton text={email} label="Email" />
                          </div>
                        )}
                        
                        {phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                            <span>📞 {phone}</span>
                            <CopyButton text={phone} label="Phone Number" />
                          </div>
                        )}

                        <div className="text-xs text-slate-600 max-w-xs pt-1">
                          <div className="flex items-start gap-1.5 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                            <span className="line-clamp-2 text-xs leading-relaxed" title={`${fullAddress} ${destination}`}>
                              📍 {fullAddress || "-"} {destination}
                            </span>
                            <CopyButton text={`${fullAddress} ${destination}`} label="Address" />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SECTION 4: AWB NUMBER */}
                    <td className="p-4 sm:p-5 align-top font-mono text-sm whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-indigo-900">
                          <span className="text-sm tracking-wide">{awbNo || "-"}</span>
                          {awbNo && <CopyButton text={awbNo} label="AWB Number" />}
                        </div>
                        {order.shipping?.courierName && (
                          <p className="text-xs font-sans font-bold text-slate-500 uppercase tracking-wide">
                            {order.shipping.courierName}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* SECTION 5: STATUS & ACTIONS */}
                    <td className="p-4 sm:p-5 align-top whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="pt-0.5">
                        {order.shipping?.shippingStatus === 'Pending' && (
                          <button
                            onClick={() => handleSingleShipClick(order)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-colors"
                          >
                            Ship Order
                          </button>
                        )}
                        {order.shipping?.shippingStatus === "Booked" && (
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full border border-emerald-200">
                            Booked
                          </span>
                        )}
                        {order.shipping?.shippingStatus === "Cancelled" && (
                          <span className="bg-rose-100 text-rose-800 font-bold text-xs px-3 py-1 rounded-full border border-rose-200">
                            Cancelled
                          </span>
                        )}
                        {order.shipping?.shippingStatus === "RTO" && (
                          <span className="bg-red-100 text-red-800 font-bold text-xs px-3 py-1 rounded-full border border-red-200">
                            RTO
                          </span>
                        )}
                        {order.shipping?.shippingStatus === "Delivered" && (
                          <span className="bg-green-100 text-green-800 font-bold text-xs px-3 py-1 rounded-full border border-green-200">
                            Delivered
                          </span>
                        )}
                        {order.shipping?.shippingStatus === "In Transit" && (
                          <span className="bg-blue-100 text-blue-800 font-bold text-xs px-3 py-1 rounded-full border border-blue-200">
                            In Transit
                          </span>
                        )}
                        {order.shipping?.shippingStatus === "Shipped" && (
                          <span className="bg-blue-100 text-blue-800 font-bold text-xs px-3 py-1 rounded-full border border-blue-200">
                            Shipped
                          </span>
                        )}
                        {!['Pending', 'Booked', 'Cancelled','RTO','Delivered','In Transit','Shipped'].includes(order.shipping?.shippingStatus) && (
                          <span className="text-slate-400 italic text-xs">{order.shipping?.shippingStatus || "No Actions"}</span>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
              {currentOrders.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 1} className="p-10 text-center text-slate-400 font-medium">No matching order records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION CONTROL INTERFACE BAR ================= */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-gray-100 p-4 rounded-xl gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Rows per page:</span>
            <select
              value={ordersPerPage}
              onChange={(e) => { 
                setOrdersPerPage(Number(e.target.value)); 
                setCurrentPage(1); 
              }}
              className="bg-slate-50 border border-gray-200 text-slate-700 font-bold text-xs rounded-lg py-1.5 px-2.5 focus:outline-none cursor-pointer"
            >
              <option value={20}>20 Rows</option>
              <option value={25}>25 Rows</option>
              <option value={50}>50 Rows</option>
              <option value={100}>100 Rows</option>
            </select>
            <span className="text-xs text-slate-400">
              Showing {totalOrders > 0 ? indexOfFirstOrder : 0} - {indexOfLastOrder} of {totalOrders} orders
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-600 px-2">
              Page {currentPage} <span className="text-slate-400 font-medium">/ {totalPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalOrders === 0}
              className="p-2 rounded-lg border border-gray-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* ================= STEP 1: ATTACHED COURIER OVERLAY MODAL ================= */}
      <SelectCourier 
        isOpen={isCourierModalOpen}
        selectedOrdersCount={ordersToShip.length}
        onClose={() => { setIsCourierModalOpen(false); setOrdersToShip([]); }}
        onConfirm={handleCourierSelectionConfirm}
      />

      {/* ================= STEP 2: SCHEDULE PICKUP MODAL ================= */}
      <SchedulePickupModal 
        isOpen={isScheduleModalOpen}
        onClose={() => { setIsScheduleModalOpen(false); setSelectedCourierData(null); }}
        selectedCourier={selectedCourierData}
        ordersCount={ordersToShip.length}
        defaultPickupLocation={ordersToShip[0]?.shipping?.pickupLocation || ""}
        onFinalSubmit={handleFinalBookingSubmit}
      />

      {/* ================= ORDER DETAILS & TRACKING MODAL ================= */}
      <OrderDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedOrderDetails(null); }}
        order={selectedOrderDetails}
      />

      <OrderResponse
  isOpen={isAssignmentModalOpen}
  onClose={() => {
    setIsAssignmentModalOpen(false);
    setAssignmentResponse(null);
  }}
  responseData={assignmentResponse}
/>
    </div>
  );
};

export default OrdersPage;