import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Truck,
  Plane,
  Zap,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { todayISODateOnly } from '../utils/dateTime';
import { shipOrdersAPI } from '../api/shipingAPI';
import OrderResponse from './OrderResponse';
import { canAccess } from '../utils/permissions';

const SERVICE_TYPES = [
  {
    value: 'surface',
    title: 'Surface',
    icon: Truck,
    desc: 'Standard ground transport',
    tag: 'Economical',
  },
  {
    value: 'air',
    title: 'Air',
    icon: Plane,
    desc: 'Express flight delivery',
    tag: 'Fast',
  },
  {
    value: 'prime',
    title: 'Prime',
    icon: Zap,
    desc: 'Priority hand-off & delivery',
    tag: 'Priority',
  },
];

const getFormattedTime = (dateObj) => {
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const SelectCourier = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "orders", "write");
  const orders = useMemo(() => location.state?.orders || [], [location.state?.orders]);

  const todayStr = todayISODateOnly();
  const defaultPickupLocation = orders[0]?.shipping?.pickupLocation || '';

  const [selectedServiceType, setSelectedServiceType] = useState('');
  const [pickupDate, setPickupDate] = useState(todayStr);
  const [pickupLocation, setPickupLocation] = useState(defaultPickupLocation);
  const [pickupTime, setPickupTime] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignmentResponse, setAssignmentResponse] = useState(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  useEffect(() => {
    if (!canWrite) {
      toast.error('You do not have permission to ship orders');
      navigate('/reports/all-orders', { replace: true });
    }
  }, [canWrite, navigate]);

  useEffect(() => {
    if (!orders.length) {
      toast.error('No orders selected for shipping');
      navigate('/reports/all-orders', { replace: true });
    }
  }, [orders.length, navigate]);

  useEffect(() => {
    setPickupLocation(defaultPickupLocation);
  }, [defaultPickupLocation]);

  const getMinTime = () => {
    if (pickupDate === todayStr) {
      const nowFormatted = getFormattedTime(new Date());
      return nowFormatted > '11:00' ? nowFormatted : '11:00';
    }
    return '11:00';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedServiceType) {
      toast.error('Please select a service type.');
      return;
    }

    const now = new Date();
    const isToday = pickupDate === todayStr;
    const [hours, minutes] = pickupTime.split(':').map(Number);
    const selectedMinutes = hours * 60 + minutes;
    const startLimit = 11 * 60;
    const endLimit = 17 * 60;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (isToday && currentMinutes >= endLimit) {
      toast.error(
        'Pickups for today are closed as it is past 5:00 PM. Please select a future date.'
      );
      return;
    }

    if (selectedMinutes < startLimit || selectedMinutes > endLimit) {
      toast.error('Pickup time must be between 11:00 AM and 5:00 PM.');
      return;
    }

    if (isToday && selectedMinutes <= currentMinutes) {
      toast.error('Pickup time must be later than the current time.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        serviceType: selectedServiceType,
        pickupDate,
        pickupLocation,
        pickupTime,
        notes,
        orders: orders.map((order) => ({
          orderId: order._id,
          weight: order.weight,
        })),
      };

      const res = await shipOrdersAPI(payload);

      if (res.success) {
        toast.success('Shipment & Pickup Scheduled Successfully');
        setAssignmentResponse(res);
        setIsAssignmentModalOpen(true);
      } else {
        toast.error(res.message || 'Failed to schedule pickup');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error while assigning AWB');
    } finally {
      setSubmitting(false);
    }
  };

  if (!orders.length) {
    return null;
  }

  return (
    <div className="w-full min-h-full bg-[#EFF2F6] -m-4 md:-m-6 p-5 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/reports/all-orders')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1B2B4B] mb-3 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to All Orders
          </button>
          <h1 className="text-2xl font-bold text-[#1B2B4B] flex items-center gap-2">
            <Package size={24} />
            Ship & Schedule Pickup
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose a service type and schedule pickup for{' '}
            <span className="font-semibold text-indigo-600">
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[22px] shadow-sm border border-white p-5 md:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Selected Orders
        </h2>
        <div className="flex flex-wrap gap-2">
          {orders.map((order) => (
            <span
              key={order._id}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              #{order.externalOrderId || order._id}
              {order.consigneeName ? ` · ${order.consigneeName}` : ''}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-[22px] shadow-sm border border-white p-5 md:p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Service Type
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {SERVICE_TYPES.map((service) => {
              const selected = selectedServiceType === service.value;
              const Icon = service.icon;

              return (
                <button
                  key={service.value}
                  type="button"
                  onClick={() => setSelectedServiceType(service.value)}
                  className={`group relative text-left cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 ease-out flex flex-col justify-between ${
                    selected
                      ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 border-indigo-600 text-white shadow-lg shadow-indigo-600/25 translate-y-[-2px]'
                      : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-md text-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`p-2.5 rounded-xl transition-colors ${
                          selected
                            ? 'bg-white/15 text-white'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {selected ? (
                        <CheckCircle2 className="w-5 h-5 text-white fill-white/20" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-indigo-400" />
                      )}
                    </div>

                    <h3
                      className={`font-bold text-base tracking-tight ${
                        selected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {service.title}
                    </h3>
                    <p
                      className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${
                        selected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      {service.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100/10">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        selected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                      }`}
                    >
                      {service.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-[22px] shadow-sm border border-white p-5 md:p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Schedule Pickup
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
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
              className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
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
              className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/reports/all-orders')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 font-semibold text-sm text-slate-600 hover:bg-white transition-all"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : 'Confirm & Schedule'}
          </button>
        </div>
      </form>

      <OrderResponse
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setAssignmentResponse(null);
          navigate('/reports/all-orders');
        }}
        responseData={assignmentResponse}
      />
    </div>
  );
};

export default SelectCourier;
