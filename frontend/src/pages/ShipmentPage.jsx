import { useEffect, useState } from 'react';
import { useSelector } from "react-redux";
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { getOrders } from '../api/ordersAPI';
import { generateLabelAPI } from "../api/labelAPI";
import { toast } from 'react-hot-toast';

const ShipmentPage = () => {
  const [allOrders, setAllOrders] = useState([]); 
  const [filteredOrders, setFilteredOrders] = useState([]); 
  const [activeTab, setActiveTab] = useState('All Shipments'); 
  const [selectedOrders, setSelectedOrders] = useState([]);
  const { isAdmin, user } = useSelector((state) => state.auth);

  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(25);

  const role = isAdmin ? "admin" : "user";
  const userId = user?._id;
  const canSeeWeight = isAdmin || user?.showWeight;

  const fetchOrders = async () => {
    try {
      if (!userId) return;

      const res = await getOrders({
        role,
        userId,
      });

      if (res?.success) {
        const validStatuses = ["Booked", "In Transit", "Delayed", "Delivered"];

        const filtered = (res.orders || []).filter(order =>
          validStatuses.includes(order.shipping?.shippingStatus)
        );

        setAllOrders(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchOrders();
    setSelectedOrders([]);
    setCurrentPage(1);
  }, [role, userId]);

  useEffect(() => {
    const today = new Date().toDateString();

    const result = allOrders.filter(order => {
      const bookingDate = order.shipping?.bookedAt
        ? new Date(order.shipping?.bookedAt).toDateString()
        : null;

      const isToday = bookingDate === today;

      if (activeTab === "All Shipments") return true;

      if (activeTab === "Today's Shipments") return isToday;

      if (activeTab === "Previous Shipments") return !isToday;

      return true;
    });

    setFilteredOrders(result);
    setCurrentPage(1);
    setSelectedOrders([]);
  }, [activeTab, allOrders]);

  const getTabCount = (tabName) => {
    const today = new Date().toDateString();

    return allOrders.filter(order => {
      const bookingDate = order.shipping?.bookedAt
        ? new Date(order.shipping?.bookedAt).toDateString()
        : null;

      const isToday = bookingDate === today;

      if (tabName === "All Shipments") return true;
      if (tabName === "Today's Shipments") return isToday;
      if (tabName === "Previous Shipments") return !isToday;

      return true;
    }).length;
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = (filteredOrders || []).slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil((filteredOrders?.length || 0) / ordersPerPage) || 1;

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

  const handlePrintLabel = async (orderId) => {
    try {
      const blob = await generateLabelAPI({
        orderIds: [orderId]
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `shipping-label-${orderId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Label generation failed");
    }
  };

  const handleBulkPrintLabels = async () => {
    try {
      const blob = await generateLabelAPI({
        orderIds: selectedOrders
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `bulk-labels.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Bulk label generation failed");
    }
  };

  const headers = [
    'Pickup Date', 'Consignor Name', 'Consignee Name', 'Address', 'Contact No',
    'Destination City', 'Destination State', 'Destination Pincode', 'AWB No.'
  ];

  if (canSeeWeight) {
    headers.push('Weight (kg)');
  }

  headers.push('Qty', 'Invoice No/Challan No', 'Invoice Value', 'Status', 'Actions');

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      <div className="max-w-400 mx-auto space-y-4">

        {/* ================= NEW SEGMENT NAVIGATION TABS BAR ================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-white p-3 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {['All Shipments', "Today's Shipments", 'Previous Shipments'].map((tabName) => {
              const isActive = activeTab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
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

        {/* ================= BULK ACTIONS TOP BAR CONTAINER ================= */}
        {selectedOrders.length > 0 && (
          <div className="flex items-center justify-between bg-white border border-indigo-100 p-3 rounded-xl shadow-sm animate-fade-in">
            <div className="flex items-center gap-2 pl-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <p className="text-xs font-semibold text-slate-600">
                <span className="font-bold text-indigo-600">{selectedOrders.length}</span> shipments selected from this segment
              </p>
            </div>
            <button
              onClick={handleBulkPrintLabels}
              className="bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold tracking-wide px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Bulk Print Labels ({selectedOrders.length})</span>
            </button>
          </div>
        )}

        {/* ================= DATA TABLE CONTAINER ================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FAFAFA]">
                {/* Checkbox Master Control Column */}
                <th className="p-4 w-12 text-center">
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
                    className="p-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {header}
                      {header !== 'Actions' && (
                        <span className="text-[9px] text-gray-300 select-none">⇅</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100/70 text-[13px] font-medium text-slate-700">
              {currentOrders.map((order) => {
                const isChecked = selectedOrders.includes(order._id);
                return (
                  <tr 
                    key={order._id} 
                    className={`hover:bg-slate-50/60 transition-colors ${isChecked ? 'bg-indigo-50/20' : ''}`}
                  >
                    {/* Row Level Checkbox Selector */}
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectRow(order._id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Standard Fields */}
                    <td className="p-3 whitespace-nowrap text-slate-600">
                      {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString() : "-"}
                    </td>

                    <td className="p-3">{order.consignorName || "-"}</td>
                    <td className="p-3">{order.consigneeName || "-"}</td>
                    <td className="p-3 max-w-xs truncate" title={order.address}>
                      {order.address || "-"}
                    </td>
                    <td className="p-3">{order.contactNo || "-"}</td>
                    <td className="p-3">{order.destinationCity || "-"}</td>
                    <td className="p-3">{order.destinationState || "-"}</td>
                    <td className="p-3">{order.destinationPincode || "-"}</td>
                    <td className="p-3 font-mono font-bold text-blue-800">
                      {order.shipping?.awbNumber || "-"}
                    </td>

                    {/* Dynamic Admin-exclusive fields */}
                    {canSeeWeight  && (
                      <td className="p-3 font-mono text-slate-600">
                        {order.weight ? `${order.weight} kg` : "-"}
                      </td>
                    )}

                    <td className="p-3 text-center">{order.qty || "-"}</td>
                    <td className="p-3 font-mono">{order.invoiceNo || "-"}</td>
                    <td className="p-3 font-mono text-slate-900">
                      ₹{order.invoiceValue || "-"}
                    </td>

                    {/* Status Structural Badges/Labels Column */}
                    <td className="p-3 whitespace-nowrap">
                      {order.shipping?.shippingStatus === 'Not Shipped' && (
                        <span className="bg-amber-100 text-amber-800 font-bold text-xs px-2.5 py-1 rounded-full border border-amber-200">
                          Not Shipped
                        </span>
                      )}

                      {order.shipping?.shippingStatus === 'Booked' && (
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-200">
                          Booked
                        </span>
                      )}

                      {order.shipping?.shippingStatus === 'Cancelled' && (
                        <span className="bg-rose-100 text-rose-800 font-bold text-xs px-2.5 py-1 rounded-full border border-rose-200">
                          Cancelled
                        </span>
                      )}

                      {!['Not Shipped', 'Booked', 'Cancelled'].includes(order.shipping?.shippingStatus) && (
                        <span className="bg-slate-100 text-slate-600 font-bold text-xs px-2.5 py-1 rounded-full border border-slate-200">
                          {order.shipping?.shippingStatus || "Unknown"}
                        </span>
                      )}
                    </td>

                    {/* Individual Label Print Interface Column */}
                    <td className="p-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => handlePrintLabel(order._id)}
                        className="p-1.5 text-[#4F46E5] hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center justify-center gap-1 font-semibold text-xs"
                        title="Print Shipping Label"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Label</span>
                      </button>
                    </td>

                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
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
              <option value={25}>25 Rows</option>
              <option value={50}>50 Rows</option>
              <option value={100}>100 Rows</option>
            </select>

            <span className="text-xs text-slate-400">
              Showing {filteredOrders.length > 0 ? indexOfFirstOrder + 1 : 0} -{" "}
              {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} shipments
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
              disabled={currentPage === totalPages || filteredOrders.length === 0}
              className="p-2 rounded-lg border border-gray-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ShipmentPage;