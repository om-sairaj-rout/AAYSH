import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  Calendar,
  CheckCircle2, 
  Clock, 
  Copy,
  Check
} from 'lucide-react';
import { getPublicOrderByAwb } from '../api/ordersAPI'; 
import OrderTracker from '../components/OrderTracker';
import { formatDisplayDate } from '../utils/dateTime';

const CustomerTracking = () => {
  const { awbNumber } = useParams(); 
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const res = await getPublicOrderByAwb(awbNumber);
        
        if (res?.success && res.order) {
          setOrder({
            ...res.order,
             expectedDeliveryDate: res.expectedDeliveryDate,
            shipping: {
              ...res.shipping,
              trackingHistory: res.tracking || [],
            },
          });
        } else {
          setError("We couldn't find any package matching this tracking number.");
        }
      } catch (err) {
        console.error("Error fetching tracking details:", err);
        setError("Unable to load tracking details at this moment. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (awbNumber) {
      fetchOrderDetails();
    }
  }, [awbNumber]);

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBanner = (status) => {
  switch (status?.toLowerCase()) {

    case 'delivered':
      return {
        bg: 'bg-emerald-500',
        lightBg: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        icon: CheckCircle2,
        title: 'Package Delivered',
        subtitle: 'Your order has been safely delivered.'
      };

    case 'shipped':
    case 'in transit':
    case 'out for delivery':
      return {
        bg: 'bg-indigo-600',
        lightBg: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        icon: Truck,
        title: 'On the Way',
        subtitle: 'Your package is currently in transit to its destination.'
      };

    case 'cancelled':
      return {
        bg: 'bg-rose-500',
        lightBg: 'bg-rose-50',
        textColor: 'text-rose-700',
        icon: Package,
        title: 'Shipment Cancelled',
        subtitle: 'This shipment has been cancelled.'
      };

    case 'rto':
      return {
        bg: 'bg-orange-500',
        lightBg: 'bg-orange-50',
        textColor: 'text-orange-700',
        icon: Package,
        title: 'Return Initiated',
        subtitle: 'Your shipment is being returned.'
      };

    case 'delayed':
      return {
        bg: 'bg-yellow-500',
        lightBg: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        icon: Clock,
        title: 'Shipment Delayed',
        subtitle: 'Your package delivery is delayed.'
      };

    default:
      return {
        bg: 'bg-amber-500',
        lightBg: 'bg-amber-50',
        textColor: 'text-amber-700',
        icon: Clock,
        title: 'Order Processing',
        subtitle: 'We are preparing your order for shipment.'
      };
  }
};

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Fetching your shipment details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-700">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 max-w-md text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Tracking Information Unavailable</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{error || "The tracking number provided could not be found."}</p>
          <button 
            onClick={() => navigate(-1)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors shadow-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = order.shipping?.shippingStatus || 'Booked';
  const banner = getStatusBanner(currentStatus);
  const BannerIcon = banner.icon;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation / Header Bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Track Package</span>
        </div>

        {/* Hero Banner Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className={`${banner.bg} p-6 text-white flex items-start justify-between relative`}>
            <div className="space-y-1">
              <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-xs">
                {currentStatus}
              </span>
              <h1 className="text-2xl font-bold mt-2">{banner.title}</h1>
              <p className="text-sm text-white/90">{banner.subtitle}</p>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
              <BannerIcon className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Tracking Quick Info Bar */}
          <div className="p-4 sm:p-6 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100">
            <div>
              <span className="text-xs font-medium text-slate-400 block">Tracking Number</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono font-bold text-slate-900 text-sm">{order.shipping?.awbNumber || "Unassigned"}</span>
                {order.shipping?.awbNumber && (
                  <button 
                    onClick={() => copyToClipboard(order.shipping?.awbNumber)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Copy tracking number"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 block">Courier Partner</span>
              <span className="font-semibold text-slate-800 text-sm mt-1 block">
                {order.shipping?.courierName || "Standard Express"}
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 block">
                {currentStatus === 'Delivered' ? 'Delivered On' : 'Estimated Delivery / Pickup'}
              </span>
              <span className="font-semibold text-slate-800 text-sm mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {currentStatus?.toLowerCase() === 'delivered' && order.deliveryDate
  ? formatDisplayDate(order.deliveryDate)
  : order.expectedDeliveryDate
    ? formatDisplayDate(order.expectedDeliveryDate)
    : "Pending Update"}
              </span>
            </div>
          </div>
        </div>

        {/* Integrated Tracking Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-600" />
            Shipment Progress
          </h2>
          <OrderTracker 
            awbNumber={order.shipping?.awbNumber}
            currentStatus={currentStatus}
            trackingHistory={order.shipping?.trackingHistory || []}
            courierName={order.shipping?.courierName}
          />
        </div>  

      </div>
    </div>
  );
};

export default CustomerTracking;