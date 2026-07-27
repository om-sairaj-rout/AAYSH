import { useEffect, useState } from 'react';
import { useSelector } from "react-redux";
import { getOrders } from '../api/ordersAPI';
import SelectCourier from './SelectCourier'; 
import { shipOrdersAPI } from '../api/shipingAPI';
import { toast } from 'react-hot-toast';

const OrdersPage = () => {
  const [activeSegment, setActiveSegment] = useState('All Orders');
  const [allOrders, setAllOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const { isAdmin, user } = useSelector((state) => state.auth);

  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [ordersToShip, setOrdersToShip] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(25);

  const role = isAdmin ? "admin" : "user";
  const userId = user?._id;
  const canSeeWeight = isAdmin || user?.showWeight;

  const fetchOrders = async (status) => {
    try {
      if (!userId) return;
      const apiStatus = status === 'All Orders' ? undefined : status;
      const res = await getOrders({
        status: apiStatus,
        role,
        userId,
      });

      if (res?.success) {
        const data = res.orders || [];
        if (status === 'All Orders') {
          setAllOrders(data);
        }
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchOrders(activeSegment);
    setSelectedOrders([]);
    setCurrentPage(1);
  }, [activeSegment, role, userId]);

  const getTabCount = (tabName) => {
    const source = allOrders;
    if (tabName === 'All Orders') return source.length;
    return source.filter(order => order.courierStatus === tabName).length;
  };

  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = (orders || []).slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil((orders?.length || 0) / ordersPerPage) || 1;

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
    const matchingSelectedDetails = allOrders.filter(o => selectedOrders.includes(o._id));
    setOrdersToShip(matchingSelectedDetails);
    setIsCourierModalOpen(true);
  };

  const handleCourierSelectionConfirm = async (modalData) => {
    try {
      const orderPayloads = ordersToShip.map(order => ({
        orderId: order._id,
        weight: order.weight
      }));

      const payload = {
        courierId: modalData.courierId,
        isPrime: Boolean(modalData.isPrime), // Sends prime service option to backend
        orders: orderPayloads
      };

      const res = await shipOrdersAPI(payload);

      if (res.success) {
        toast.success("AWB Assigned Successfully");

        setIsCourierModalOpen(false);
        setSelectedOrders([]);
        setOrdersToShip([]);

        fetchOrders(activeSegment);
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
            {['All Orders', 'Not Shipped', 'Booked'].map((tabName) => {
              const isActive = activeSegment === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => setActiveSegment(tabName)}
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
                  <tr key={order._id} className={`hover:bg-slate-50/60 transition-colors ${isChecked ? 'bg-indigo-50/20' : ''}`}>
                    <td className="p-4 text-center">
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
                    <td className="p-3">{order.contactNo || "-"}</td>
                    <td className="p-3">{order.destinationCity || "-"}</td>
                    <td className="p-3">{order.destinationState || "-"}</td>
                    <td className="p-3">{order.destinationPincode || "-"}</td>
                    <td className="p-3 font-mono font-bold text-blue-800">{order.awbNumber || "-"}</td>

                    {canSeeWeight && (
                      <td className="p-3 font-mono text-slate-600">{order.weight ? `${order.weight} kg` : "-"}</td>
                    )}

                    <td className="p-3 text-center">{order.qty || "-"}</td>
                    <td className="p-3 font-mono">{order.invoiceNo || "-"}</td>
                    <td className="p-3 font-mono text-slate-900">₹{order.invoiceValue || "-"}</td>

                    <td className="p-3 whitespace-nowrap">
                      {order.courierStatus === 'Not Shipped' && (
                        <button
                          onClick={() => handleSingleShipClick(order)}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3 py-1.5 rounded shadow-sm transition-colors"
                        >
                          Ship Order
                        </button>
                      )}
                      {order.courierStatus === 'Booked' && (
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1.5 rounded border border-emerald-200">Booked</span>
                      )}
                      {order.courierStatus === 'Cancelled' && (
                        <span className="bg-rose-100 text-rose-800 font-bold text-xs px-3 py-1.5 rounded border border-rose-200">Cancelled</span>
                      )}
                      {!['Not Shipped', 'Booked', 'Cancelled'].includes(order.courierStatus) && (
                        <span className="text-slate-400 italic text-xs">{order.courierStatus || "No Actions"}</span>
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
              Showing {orders.length > 0 ? indexOfFirstOrder + 1 : 0} - {Math.min(indexOfLastOrder, orders.length)} of {orders.length} orders
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
    </div>
  );
};

export default OrdersPage;