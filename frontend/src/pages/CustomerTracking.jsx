import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { getPublicOrderByAwb } from '../api/ordersAPI';
import AwbTrackingDetails from '../components/AwbTrackingDetails';

const CustomerTracking = () => {
  const { awbNumber } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            type="button"
            onClick={() => navigate(-1)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors shadow-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <AwbTrackingDetails order={order} onBack={() => navigate(-1)} showPodSection={false} />
  );
};

export default CustomerTracking;
