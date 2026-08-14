import { useEffect, useState } from 'react';
import { useSelector } from "react-redux";
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Package, Truck, User, Building, FileText, Calendar, Phone } from 'lucide-react';
import { getOrderByAwb } from '../api/ordersAPI'; 
import OrderTracker from '../components/OrderTracker'; // <--- Imported OrderTracker Component
import { formatDisplayDate } from '../utils/dateTime';

const AwbPage = () => {
  const { awbNumber } = useParams(); 
  const navigate = useNavigate();

  const { isAdmin, user } = useSelector((state) => state.auth);
  const canSeeWeight = isAdmin || user?.showWeight;
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const res = await getOrderByAwb(awbNumber);
        console.log("Fetched order details:", res);
        
        if (res?.success && res.order) {
  setOrder({
    ...res.order,
    shipping: {
      ...res.shipping,
      trackingHistory: res.tracking || [],
    },
  });
} else {
          setError("No shipment information found matching this AWB number.");
        }
      } catch (err) {
        console.error("Error fetching order context:", err);
        setError("Failed to communicate with the database services.");
      } finally {
        setLoading(false);
      }
    };

    if (awbNumber) {
      fetchOrderDetails();
    }
  }, [awbNumber]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-500">Retrieving operational cargo streams...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans text-slate-700">
        <div className="bg-white p-6 rounded-xl border border-gray-100 max-w-md text-center shadow-sm space-y-4">
          <Package className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Tracking Disruption</h2>
          <p className="text-sm text-slate-500">{error || "The requested item details cannot be rendered."}</p>
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadgeStyles = (status) => {
    switch (status) {
      case 'Booked': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Not Shipped': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cancelled': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Delivered': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'In Transit': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      <div className="max-w-4xl mx-auto space-y-4">
        
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Console</span>
          </button>
        </div>

        {/* ================= TOP SHIPMENT SUMMARY HEADER ================= */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">AWB Number</p>
              <h1 className="text-xl font-mono font-bold text-blue-800">{order.shipping?.awbNumber || "Unassigned"}</h1>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6">
            <div>
              <span className="text-slate-400 font-medium block">Pickup Reference</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDisplayDate(order.shipping?.pickupDate)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Status</span>

              <div className="flex my-0.5">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadgeStyles(order.shipping?.shippingStatus)}`}
                >
                  {order.shipping?.shippingStatus || "Unknown"}
                </span>
              </div>

              {order.shipping?.shippingStatus === "Delivered" && order.deliveryDate && (
                <div className="mt-2">
                  <span className="text-slate-400 font-medium block">
                    Delivery Date
                  </span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDisplayDate(order.deliveryDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= INTEGRATED ORDER TRACKER ================= */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2">
          <OrderTracker 
            awbNumber={order.shipping?.awbNumber}
            currentStatus={order.shipping?.shippingStatus || 'Pending'}
            trackingHistory={order.shipping?.trackingHistory || []}
            courierName={order.shipping?.courierName}
          />
        </div>

        {/* ================= SHIPPER & CONSIGNEE DETAILS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-[#FAFAFA] px-4 py-3 flex items-center gap-2 text-slate-500">
              <Building className="w-4 h-4 text-indigo-500" />
              <h2 className="text-xs uppercase font-bold tracking-wider">Shipper / Consignor</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <p className="font-bold text-slate-800">{order.consignorName || "ABC Manufacturing Ltd."}</p>
              <div className="text-slate-600 space-y-1 text-xs">
                <p>Pickup Location: {order.shipping?.pickupLocation || "Default Warehouse"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-[#FAFAFA] px-4 py-3 flex items-center gap-2 text-slate-500">
              <User className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs uppercase font-bold tracking-wider">To / Consignee</h2>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <p className="font-bold text-slate-800 text-base">
                  {`${order.consigneeName || ''} ${order.consigneeLastName || ''}`.trim().toUpperCase() || "-"}
                </p>
                <p className="text-slate-600 mt-1 font-medium leading-relaxed text-xs">
                  {order.address ? order.address.toUpperCase() : "-"} {order.address2 ? `, ${order.address2.toUpperCase()}` : ''}
                </p>
              </div>
              
              <div className="pt-2 border-t border-gray-50 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Destination Layout</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">
                    {order.destinationCity}, {order.destinationState} - {order.destinationPincode}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Contact Lines</span>
                  <span className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {order.billingPhone || order.contactNo || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ================= FINANCIAL & MANIFEST SPECIFICATIONS ================= */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-[#FAFAFA] px-4 py-3 flex items-center gap-2 text-slate-500">
            <FileText className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs uppercase font-bold tracking-wider">Financial & Manifest Specifications</h2>
          </div>
          
          <div
            className={`grid grid-cols-3 ${
              canSeeWeight ? "sm:grid-cols-4" : "sm:grid-cols-3"
            } divide-y sm:divide-y-0 sm:divide-x divide-gray-100 text-center`}
          >
            {canSeeWeight && (
              <div className="p-4">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">
                  Declared Weight
                </span>
                <span className="text-lg font-bold text-slate-800 font-mono block mt-1">
                  {order.weight ? `${order.weight} kg` : "-"}
                </span>
              </div>
            )}
            <div className="p-4">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">Package Quantity</span>
              <span className="text-lg font-bold text-slate-800 block mt-1">{order.qty || "1"} Unit(s)</span>
            </div>
            <div className="p-4">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">Invoice Reference</span>
              <span className="text-base font-bold text-slate-700 font-mono block mt-1.5 truncate" title={order.invoiceNo}>{order.invoiceNo || "-"}</span>
            </div>
            <div className="p-4">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">Invoice Value</span>
              <span className="text-lg font-bold text-slate-900 font-mono block mt-1 text-emerald-700">₹{order.invoiceValue || "0.00"}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AwbPage;