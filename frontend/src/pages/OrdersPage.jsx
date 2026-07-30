import { useEffect, useState } from 'react';
import { useSelector } from "react-redux";
import { getOrders } from '../api/ordersAPI';
import SelectCourier from './SelectCourier'; 
import { shipOrdersAPI } from '../api/shipingAPI';
import { toast } from 'react-hot-toast';
import OrderTracker from '../components/OrderTracker'; // <--- Implemented Component Import

/* ================= ORDER DETAILS & TRACKING MODAL ================= */
const OrderDetailsModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const awbNumber = order.shipping?.awbNumber;
  const currentStatus = order.shipping?.shippingStatus || 'Pending';
  const trackingHistory = order.shipping?.trackingHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800">
                Order #{order.externalOrderId || order.invoiceNo || order._id?.slice(-6)}
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
              Order Date: {order.orderDate ? new Date(order.orderDate).toLocaleString() : 'N/A'} | Pickup Date: {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString() : 'N/A'}
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

          {/* ================= REUSABLE ORDER TRACKER COMPONENT ================= */}
          <OrderTracker 
            awbNumber={awbNumber}
            currentStatus={currentStatus}
            trackingHistory={trackingHistory}
            courierName={order.shipping?.courierName}
          />

          {/* ================= DETAILS GRID ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Consignor Details */}
            <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Consignor (Sender)</h4>
              <p className="text-sm font-semibold text-slate-800">{order.consignorName || 'N/A'}</p>
              <p className="text-xs text-slate-500">Pickup Location: {order.pickupLocation || 'Default Warehouse'}</p>
            </div>

            {/* Consignee Details */}
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

          {/* Product Items Breakdown */}
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
                          Disc: ₹{item.discount} | Tax: ₹{item.tax}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-xs text-slate-400 italic">No itemized details recorded.</div>
            )}

            {/* Financial Overview & Package Details */}
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

        {/* Modal Footer */}
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
  const [activeSegment, setActiveSegment] = useState('All Orders');
  const [counts, setCounts] = useState({});
  const [allOrders, setAllOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const { isAdmin, user } = useSelector((state) => state.auth);

  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [ordersToShip, setOrdersToShip] = useState([]);

  // Modal State for Order Details & Tracking
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(25);

  const canSeeWeight = isAdmin || user?.showWeight;

  const fetchOrders = async () => {
    try {
      const res = await getOrders();

      if (res.success) {
        setAllOrders(res.orders || []);
        setCounts(res.counts || {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    setSelectedOrders([]);
    setCurrentPage(1);
  }, [activeSegment]);

  const getTabCount = (tabName) => {
    return counts[tabName] || 0;
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;

  const filteredOrders = allOrders.filter((order) => {
    if (activeSegment === "All Orders") return true;

    return order.shipping?.shippingStatus === activeSegment;
  });

  const currentOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );

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

  const handleCourierSelectionConfirm = async (modalData) => {
    try {
      const orderPayloads = ordersToShip.map(order => ({
        orderId: order._id,
        weight: order.weight
      }));

      const payload = {
        courierId: modalData.courierId,
        isPrime: Boolean(modalData.isPrime),
        orders: orderPayloads
      };

      const res = await shipOrdersAPI(payload);

      if (res.success) {
        toast.success("AWB Assigned Successfully");

        setIsCourierModalOpen(false);
        setSelectedOrders([]);
        setOrdersToShip([]);

        fetchOrders();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error while assigning AWB");
    }
  };

  const headers = [
    'Pickup Date', 'Consignor Name', 'Consignee Name', 'Address', 'Contact No',
    'Destination City', 'Destination State', 'Destination Pincode', 'AWB No.'
  ];

  if (canSeeWeight) {
    headers.push('Weight (kg)');
  }
  headers.push('Qty', 'Invoice No/Challan No', 'Invoice Value', 'Status Actions');

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      <div className="max-w-400 mx-auto space-y-4">

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

        {/* ================= DATA TABLE CONTAINER ================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FAFAFA]">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={currentOrders.length > 0 && currentOrders.every(order => selectedOrders.includes(order._id))}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                {headers.map((header) => (
                  <th key={header} className="p-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {header}
                      {!header.includes('Actions') && <span className="text-[9px] text-gray-300 select-none">⇅</span>}
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
                    onClick={() => handleRowClick(order)}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isChecked ? 'bg-indigo-50/20' : ''}`}
                  >
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleSelectRow(order._id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-600">
                      {order.pickupDate ? new Date(order.pickupDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="p-3">{order.consignorName || "-"}</td>
                    <td className="p-3">{order.consigneeName || "-"}</td>
                    <td className="p-3 max-w-xs truncate" title={order.address}>{order.address || "-"}</td>
                    <td className="p-3">{order.billingPhone || order.contactNo || "-"}</td>
                    <td className="p-3">{order.destinationCity || "-"}</td>
                    <td className="p-3">{order.destinationState || "-"}</td>
                    <td className="p-3">{order.destinationPincode || "-"}</td>
                    <td className="p-3 font-mono font-bold text-blue-800">{order.shipping?.awbNumber || "-"}</td>

                    {canSeeWeight && (
                      <td className="p-3 font-mono text-slate-600">{order.weight ? `${order.weight} kg` : "-"}</td>
                    )}

                    <td className="p-3 text-center">{order.qty || "-"}</td>
                    <td className="p-3 font-mono">{order.invoiceNo || "-"}</td>
                    <td className="p-3 font-mono text-slate-900">₹{order.invoiceValue || "-"}</td>

                    <td className="p-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {order.shipping?.shippingStatus === 'Pending' && (
                        <button
                          onClick={() => handleSingleShipClick(order)}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3 py-1.5 rounded shadow-sm transition-colors"
                        >
                          Ship Order
                        </button>
                      )}
                      {order.shipping?.shippingStatus === "Booked" && (
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-200">
                          Booked
                        </span>
                      )}
                      {order.shipping?.shippingStatus === "Cancelled" && (
                        <span className="bg-rose-100 text-rose-800 font-bold text-xs px-2.5 py-1 rounded-full border border-rose-200">
                          Cancelled
                        </span>
                      )}
                      {order.shipping?.shippingStatus === "RTO" && (
                        <span className="bg-red-100 text-red-800 font-bold text-xs px-2.5 py-1 rounded-full border border-red-200">
                          RTO
                        </span>
                      )}
                      {order.shipping?.shippingStatus === "Delivered" && (
                        <span className="bg-green-100 text-green-800 font-bold text-xs px-2.5 py-1 rounded-full border border-green-200">
                          Delivered
                        </span>
                      )}
                      {order.shipping?.shippingStatus === "In Transit" && (
                        <span className="bg-blue-100 text-blue-800 font-bold text-xs px-2.5 py-1 rounded-full border border-blue-200">
                          In Transit
                        </span>
                      )}
                      {!['Pending', 'Booked', 'Cancelled','RTO','Delivered','In Transit'].includes(order.shipping?.shippingStatus) && (
                        <span className="text-slate-400 italic text-xs">{order.shipping?.shippingStatus || "No Actions"}</span>
                      )}
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
              onChange={(e) => { setOrdersPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-slate-50 border border-gray-200 text-slate-700 font-bold text-xs rounded-lg py-1.5 px-2.5 focus:outline-none cursor-pointer"
            >
              <option value={25}>25 Rows</option>
              <option value={50}>50 Rows</option>
              <option value={100}>100 Rows</option>
            </select>
            <span className="text-xs text-slate-400">
              Showing {filteredOrders.length > 0 ? indexOfFirstOrder + 1 : 0}
              -
              {Math.min(indexOfLastOrder, filteredOrders.length)}
              of {filteredOrders.length} orders
            </span>
          </div>
        </div>

      </div>

      {/* ================= ATTACHED COURIER OVERLAY MODAL ================= */}
      <SelectCourier 
        isOpen={isCourierModalOpen}
        selectedOrdersCount={ordersToShip.length}
        onClose={() => { setIsCourierModalOpen(false); setOrdersToShip([]); }}
        onConfirm={handleCourierSelectionConfirm}
      />

      {/* ================= ORDER DETAILS & TRACKING MODAL ================= */}
      <OrderDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedOrderDetails(null); }}
        order={selectedOrderDetails}
      />
    </div>
  );
};

export default OrdersPage;