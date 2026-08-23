import { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from "react-redux";
import { ChevronLeft, ChevronRight, FileText, ClipboardList, Tag, Paperclip, Eye, Ban } from 'lucide-react';
import { getReversePickupDocumentByOrderId } from '../api/reversePickupAPI';
import { getOrders, getOrderDocumentUrl, cancelOrder, cancelShipments } from '../api/ordersAPI';
import { useConfirm } from '../components/ConfirmDialog';
import { generateLabelAPI, generateInvoiceAPI, generateManifestAPI } from "../api/labelAPI";
import { useLatestRequestId } from '../utils/useLatestRequestId';
import useDocumentPreview from '../utils/useDocumentPreview';
import DocumentPreviewDialog from '../components/DocumentPreviewDialog';
import { toast } from '../utils/toast';
import { formatDisplayDate } from '../utils/dateTime';
import { canAccess } from '../utils/permissions';

const NON_CANCELLABLE_STATUSES = [
  'Delivered',
  'Out For Delivery',
  'Returned',
  'RTO',
  'Cancelled',
];

const canCancelShipment = (order) => {
  const status = order?.shipping?.shippingStatus || 'Pending';
  if (NON_CANCELLABLE_STATUSES.includes(status)) return false;

  const awb = order?.shipping?.awbNumber?.trim();
  if (awb) return true;

  return ['Pending', 'Booked'].includes(status);
};

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

/* ================= ROW VIEW DROPDOWN COMPONENT ================= */
const ViewDropdown = ({
  order,
  onViewLabel,
  onViewInvoice,
  onViewManifest,
  onViewReversePickupDoc,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const hasAwb = Boolean(order.shipping?.awbNumber?.trim());
  const showReversePickupDoc = Boolean(order.reversePickup?.documentDownloadable);

  const hasAnyView =
    hasAwb || showReversePickupDoc;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!hasAnyView) {
    return <span className="text-[11px] text-slate-300 font-medium">—</span>;
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors focus:outline-none"
        title="View Documents"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>View</span>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-1 w-52 rounded-xl shadow-lg bg-white ring-1 ring-black/5 divide-y divide-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            {hasAwb && (
              <>
                <button
                  onClick={() => { setIsOpen(false); onViewLabel(order._id); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                >
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  <span>View Shipping Label</span>
                </button>
                <button
                  onClick={() => { setIsOpen(false); onViewInvoice(order._id); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>View Invoice</span>
                </button>
                <button
                  onClick={() => { setIsOpen(false); onViewManifest(order._id); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-600 flex items-center gap-2 transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-teal-500" />
                  <span>View Manifest</span>
                </button>
              </>
            )}
            {showReversePickupDoc && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onViewReversePickupDoc(order);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                <span>View Reverse Pickup Doc</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= MAIN SHIPMENT PAGE COMPONENT ================= */
const ShipmentPage = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('All Shipments'); 
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const { isAdmin, user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "shipments", "write") || canAccess(user, "orders", "write");

  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const { startRequest, isLatestRequest } = useLatestRequestId();
  const { preview, openPreviewWithLoader, closePreview } = useDocumentPreview();
  const { confirm } = useConfirm();

  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const getBookedTab = () => {
    if (activeTab === "Today's Shipments") return "today";
    if (activeTab === "Previous Shipments") return "previous";
    return undefined;
  };

  const fetchOrders = useCallback(async () => {
    const requestId = startRequest();

    try {
      const res = await getOrders({
        forShipments: true,
        bookedTab: getBookedTab(),
        from: fromDate || undefined,
        to: toDate || undefined,
        search: searchQuery.trim() || undefined,
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
    activeTab,
    fromDate,
    toDate,
    searchQuery,
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
  }, [activeTab, ordersPerPage, searchQuery, fromDate, toDate]);

  const clearFilters = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
  };

  const getTabCount = (tabName) => counts[tabName] || 0;

  const currentOrders = allOrders;
  const totalPages = pagination.total_pages || 1;
  const totalShipments = pagination.total || 0;
  const indexOfFirstOrder = totalShipments === 0 ? 0 : (currentPage - 1) * ordersPerPage + 1;
  const indexOfLastOrder = Math.min(currentPage * ordersPerPage, totalShipments);

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

  // PDF Blob Downloader Helper
  const downloadPdf = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // View & bulk download actions
  const handleViewLabel = (orderId) => {
    openPreviewWithLoader(
      async () => {
        const blob = await generateLabelAPI({ orderIds: [orderId] });
        const url = window.URL.createObjectURL(
          new Blob([blob], { type: "application/pdf" })
        );
        return { url, fileName: `shipping-label-${orderId}.pdf` };
      },
      { title: "Shipping Label", fileName: `shipping-label-${orderId}.pdf` }
    );
  };

  const handleViewInvoice = (orderId) => {
    openPreviewWithLoader(
      async () => {
        const blob = await generateInvoiceAPI({ orderIds: [orderId] });
        const url = window.URL.createObjectURL(
          new Blob([blob], { type: "application/pdf" })
        );
        return { url, fileName: `tax-invoice-${orderId}.pdf` };
      },
      { title: "Tax Invoice", fileName: `tax-invoice-${orderId}.pdf` }
    );
  };

  const handleViewManifest = (orderId) => {
    openPreviewWithLoader(
      async () => {
        const blob = await generateManifestAPI({ orderIds: [orderId] });
        const url = window.URL.createObjectURL(
          new Blob([blob], { type: "application/pdf" })
        );
        return { url, fileName: `dispatch-manifest-${orderId}.pdf` };
      },
      { title: "Dispatch Manifest", fileName: `dispatch-manifest-${orderId}.pdf` }
    );
  };

  const handleViewReversePickupDoc = async (order) => {
    openPreviewWithLoader(
      () => getReversePickupDocumentByOrderId(order._id),
      {
        title: `${order.externalOrderId || order._id} — Reverse Pickup Document`,
        fileName:
          order.reversePickup?.documentName || "reverse-pickup-document.pdf",
      }
    );
  };

  const handleCancelShipment = async (order) => {
    if (!canCancelShipment(order)) {
      toast.error("This shipment cannot be cancelled");
      return;
    }

    const label = order.externalOrderId || order._id;
    const confirmed = await confirm({
      title: "Cancel shipment",
      message: `Cancel shipment for order #${label}? This cannot be undone.`,
      confirmLabel: "Cancel shipment",
      cancelLabel: "Keep shipment",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const awb = order.shipping?.awbNumber?.trim();
      if (awb) {
        await cancelShipments([awb]);
      } else {
        await cancelOrder([order.externalOrderId]);
      }
      toast.success(`Shipment for #${label} cancelled`);
      setSelectedOrders((prev) => prev.filter((id) => id !== order._id));
      fetchOrders();
    } catch (error) {
      toast.error(error.message || "Failed to cancel shipment");
    }
  };

  const handleBulkCancelShipments = async () => {
    const cancellable = currentOrders.filter(
      (order) => selectedOrders.includes(order._id) && canCancelShipment(order)
    );

    if (cancellable.length === 0) {
      toast.error("No cancellable shipments selected");
      return;
    }

    const confirmed = await confirm({
      title: "Cancel selected shipments",
      message: `Cancel ${cancellable.length} selected shipment(s)? This cannot be undone.`,
      confirmLabel: "Cancel shipments",
      cancelLabel: "Keep shipments",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const withAwb = cancellable
        .map((order) => order.shipping?.awbNumber?.trim())
        .filter(Boolean);
      const withoutAwb = cancellable
        .filter((order) => !order.shipping?.awbNumber?.trim())
        .map((order) => order.externalOrderId)
        .filter(Boolean);

      if (withAwb.length) {
        await cancelShipments(withAwb);
      }
      if (withoutAwb.length) {
        await cancelOrder(withoutAwb);
      }

      toast.success(`Cancelled ${cancellable.length} shipment(s)`);
      setSelectedOrders([]);
      fetchOrders();
    } catch (error) {
      toast.error(error.message || "Bulk cancel failed");
    }
  };

  const handleViewCompanyDocument = async (order, document) => {
    openPreviewWithLoader(
      async () => {
        const data = await getOrderDocumentUrl(order._id, document.index);
        return {
          url: data.url,
          fileName: document.fileName || "company-document",
        };
      },
      {
        title: `${order.externalOrderId || order._id} — ${document.documentType}`,
        fileName: document.fileName || "company-document",
      }
    );
  };

  const handleDownloadCompanyDocument = async (order, doc) => {
    try {
      const data = await getOrderDocumentUrl(order._id, doc.index);
      const link = window.document.createElement("a");
      link.href = data.url;
      link.download = doc.fileName || "company-document";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error.message || "Failed to download document");
    }
  };

  const formatDocumentType = (type) => {
    const labels = {
      INVOICE: "Invoice",
      EWAYBILL: "E-Way Bill",
      DELIVERY_CHALLAN: "Delivery Challan",
      OTHER: "Other",
    };
    return labels[type] || type || "Document";
  };

  // Bulk Actions
  const handleBulkPrintLabels = async () => {
    try {
      const blob = await generateLabelAPI({ orderIds: selectedOrders });
      downloadPdf(blob, `bulk-labels.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Bulk label generation failed");
    }
  };

  const handleBulkPrintInvoices = async () => {
    try {
      const blob = await generateInvoiceAPI({ orderIds: selectedOrders });
      downloadPdf(blob, `bulk-invoices.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Bulk invoice generation failed");
    }
  };

  const handleBulkPrintManifest = async () => {
    try {
      const blob = await generateManifestAPI({ orderIds: selectedOrders });
      downloadPdf(blob, `bulk-manifest.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Bulk manifest generation failed");
    }
  };

  const headers = [
    'Order ID & Info', 
    'Order Items',
    'Customer Details', 
    'AWB No.',
    'Status',
    'Actions'
  ];

  return (
    <div className="w-full min-h-full max-w-full overflow-x-hidden bg-[#F8FAFC] p-2 sm:p-4 font-sans text-[#1E293B]">
      <div className="max-w-400 w-full mx-auto space-y-4">

        {/* ================= NAVIGATION TABS BAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-white p-3 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {['All Shipments', "Today's Shipments"].map((tabName) => {
              const isActive = activeTab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => {
                    setActiveTab(tabName);
                    setCurrentPage(1);
                    setSelectedOrders([]);
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#1E293B] border-[#1E293B] text-white shadow-sm'
                      : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{tabName}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {getTabCount(tabName)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= SEARCH & ORDER DATE FILTER BAR ================= */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl shadow-sm border border-gray-100">
          <div className="relative flex-1 min-w-[260px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by Order ID, Customer, Phone, SKU, AWB, or date (DD/MM/YYYY)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            {(searchQuery || fromDate || toDate) && (
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ================= BULK ACTIONS TOP BAR CONTAINER ================= */}
        {selectedOrders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-indigo-100 p-3 rounded-xl shadow-sm animate-fade-in">
            <div className="flex items-center gap-2 pl-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <p className="text-xs font-semibold text-slate-600">
                <span className="font-bold text-indigo-600">{selectedOrders.length}</span> shipments selected
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={handleBulkPrintLabels}
                className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold tracking-wide px-3.5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Bulk Labels ({selectedOrders.length})</span>
              </button>

              <button
                onClick={handleBulkPrintInvoices}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wide px-3.5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Bulk Invoices ({selectedOrders.length})</span>
              </button>

              <button
                onClick={handleBulkPrintManifest}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold tracking-wide px-3.5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Bulk Manifest ({selectedOrders.length})</span>
              </button>

              {canWrite && (
                <button
                  onClick={handleBulkCancelShipments}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold tracking-wide px-3.5 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Selected</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= DATA TABLE CONTAINER ================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 responsive-table-wrap">
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
                  <th
                    key={header}
                    className="p-4 sm:p-5 text-xs font-bold tracking-wider text-slate-600 uppercase whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      {header}
                      {header !== 'Actions' && (
                        <span className="text-xs text-gray-300 select-none">⇅</span>
                      )}
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
                const phone = order.billingPhone || order.contactNo || '';
                const fullAddress = `${order.address || ''} ${order.address2 ? `, ${order.address2}` : ''}`.trim();
                const destination = `${order.destinationCity || ''}${order.destinationState ? `, ${order.destinationState}` : ''} ${order.destinationPincode ? `- ${order.destinationPincode}` : ''}`.trim();
                const awbNo = order.shipping?.awbNumber || '';
                const pkgWeight =
                  order.shipping?.totalWeight ||
                  order.chargeableWeight ||
                  order.weight ||
                  '-';

                return (
                  <tr 
                    key={order._id} 
                    className={`hover:bg-slate-50/90 transition-colors ${isChecked ? 'bg-indigo-50/30' : ''}`}
                  >
                    <td className="p-4 sm:p-5 text-center align-top">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectRow(order._id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
                      />
                    </td>

                    {/* SECTION 1: ORDER ID & INFO (Includes Pickup Date) */}
                    <td className="p-4 sm:p-5 align-top min-w-[220px]">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-900 tracking-tight">#{externalId}</span>
                          <CopyButton text={externalId} label="Order ID" />
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <p className="flex items-center gap-1">
                            <span className="text-slate-400">📅 Date:</span> 
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
                                <p className="font-semibold text-slate-800 text-xs line-clamp-1">{item.name || `Item #${idx + 1}`}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
                                  <span>Units: <strong className="text-slate-700">{item.units || 1}</strong></span>
                                  {item.sku && <span className="font-mono">SKU: {item.sku}</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic text-xs">No item breakdown</p>
                        )}
                        <div className="text-xs font-semibold text-slate-700 pt-1 flex items-center justify-between border-t border-slate-100">
                          <span className="text-slate-500">Boxes:</span>
                          <span className="font-mono font-bold text-slate-700 text-xs">{order.noOfBoxes || 1}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700 pt-1 flex items-center justify-between border-t border-slate-100">
                          <span className="text-slate-500">Chargeable Weight:</span>
                          <span className="font-mono font-bold text-indigo-600 text-xs">{pkgWeight !== '-' ? `${pkgWeight} kg` : '-'}</span>
                        </div>

                        {(order.companyDocuments || []).length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              Company Documents
                            </p>
                            {order.companyDocuments.map((document) => (
                              <div
                                key={`${order._id}-${document.index}`}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                              >
                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold text-slate-800 truncate">
                                    {formatDocumentType(document.documentType)}
                                  </p>
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {document.fileName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleViewCompanyDocument(order, document)}
                                    className="px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded"
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadCompanyDocument(order, document)}
                                    className="px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded"
                                  >
                                    Download
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* SECTION 3: CUSTOMER DETAILS */}
                    <td className="p-4 sm:p-5 align-top min-w-[280px]">
                      <div className="space-y-1.5">
                        <p className="font-bold text-slate-900 text-sm">{fullName}</p>

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

                    {/* SECTION 5: STATUS */}
                    <td className="p-4 sm:p-5 align-top whitespace-nowrap">
                      <div className="pt-0.5">
                        {order.shipping?.shippingStatus === 'Pending' && (
                          <span className="bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-full border border-amber-200">
                            Pending
                          </span>
                        )}

                        {order.shipping?.shippingStatus === "Booked" && (
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full border border-emerald-200">
                            Booked
                          </span>
                        )}

                        {order.shipping?.shippingStatus === "Shipped" && (
                          <span className="bg-indigo-100 text-indigo-800 font-bold text-xs px-3 py-1 rounded-full border border-indigo-200">
                            Shipped
                          </span>
                        )}

                        {order.shipping?.shippingStatus === "In Transit" && (
                          <span className="bg-blue-100 text-blue-800 font-bold text-xs px-3 py-1 rounded-full border border-blue-200">
                            In Transit
                          </span>
                        )}

                        {order.shipping?.shippingStatus === "Out For Delivery" && (
                          <span className="bg-cyan-100 text-cyan-800 font-bold text-xs px-3 py-1 rounded-full border border-cyan-200">
                            Out For Delivery
                          </span>
                        )}

                        {order.shipping?.shippingStatus === "Delivered" && (
                          <span className="bg-green-100 text-green-800 font-bold text-xs px-3 py-1 rounded-full border border-green-200">
                            Delivered
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

                        {order.shipping?.shippingStatus === "Returned" && (
                          <span className="bg-orange-100 text-orange-800 font-bold text-xs px-3 py-1 rounded-full border border-orange-200">
                            Returned
                          </span>
                        )}

                        {order.shipping?.shippingStatus === "Exchange" && (
                          <span className="bg-purple-100 text-purple-800 font-bold text-xs px-3 py-1 rounded-full border border-purple-200">
                            Exchange
                          </span>
                        )}

                        {order.shipping?.shippingStatus === "Delayed" && (
                          <span className="bg-yellow-100 text-yellow-800 font-bold text-xs px-3 py-1 rounded-full border border-yellow-200">
                            Delayed
                          </span>
                        )}

                        {order.shipping?.shippingStatus === "Undelivered" && (
                          <span className="bg-pink-100 text-pink-800 font-bold text-xs px-3 py-1 rounded-full border border-pink-200">
                            Undelivered
                          </span>
                        )}

                        {!['Pending','Shipped','Booked', 'Cancelled','In Transit', 'Delivered', 'RTO', 'Delayed', 'Undelivered'].includes(order.shipping?.shippingStatus) && (
                          <span className="bg-slate-100 text-slate-600 font-bold text-xs px-3 py-1 rounded-full border border-slate-200">
                            {order.shipping?.shippingStatus || "Unknown"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SECTION 6: VIEW ACTIONS */}
                    <td className="p-4 sm:p-5 align-top whitespace-nowrap text-center">
                      <div className="inline-flex flex-col items-center gap-1.5">
                        <ViewDropdown
                          order={order}
                          onViewLabel={handleViewLabel}
                          onViewInvoice={handleViewInvoice}
                          onViewManifest={handleViewManifest}
                          onViewReversePickupDoc={handleViewReversePickupDoc}
                        />
                        {canWrite && canCancelShipment(order) && (
                          <button
                            type="button"
                            onClick={() => handleCancelShipment(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                            title="Cancel shipment"
                          >
                            <Ban className="w-3 h-3" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}

              {allOrders.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 1} className="p-10 text-center text-slate-400 font-medium">
                    No shipments found in this category.
                  </td>
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
              Showing {totalShipments > 0 ? indexOfFirstOrder : 0} - {indexOfLastOrder} of {totalShipments} shipments
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-600 px-2">
              Page {currentPage} <span className="text-slate-400 font-medium">/ {totalPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalShipments === 0}
              className="p-2 rounded-lg border border-gray-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      <DocumentPreviewDialog
        open={preview.open}
        onClose={closePreview}
        title={preview.title}
        fileName={preview.fileName}
        url={preview.url}
        loading={preview.loading}
        error={preview.error}
      />
    </div>
  );
};

export default ShipmentPage;