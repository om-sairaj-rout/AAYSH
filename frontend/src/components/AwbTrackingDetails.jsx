import { useState } from "react";
import {
  ChevronLeft,
  Package,
  Truck,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  FileText,
  Download,
} from "lucide-react";
import OrderTracker from "./OrderTracker";
import { formatDisplayDate } from "../utils/dateTime";

const getStatusBanner = (status) => {
  switch (status?.toLowerCase()) {
    case "delivered":
      return {
        bg: "bg-emerald-500",
        icon: CheckCircle2,
        title: "Package Delivered",
        subtitle: "Your order has been safely delivered.",
      };
    case "shipped":
    case "in transit":
    case "out for delivery":
      return {
        bg: "bg-indigo-600",
        icon: Truck,
        title: "On the Way",
        subtitle: "Your package is currently in transit to its destination.",
      };
    case "cancelled":
      return {
        bg: "bg-rose-500",
        icon: Package,
        title: "Shipment Cancelled",
        subtitle: "This shipment has been cancelled.",
      };
    default:
      return {
        bg: "bg-amber-500",
        icon: Clock,
        title: "Order Processing",
        subtitle: "We are preparing your order for shipment.",
      };
  }
};

const AwbTrackingDetails = ({
  order,
  pod,
  onBack,
  showPodSection = false,
  onDownloadPod,
  podDownloading = false,
  embedded = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const currentStatus = order.shipping?.shippingStatus || "Booked";
  const banner = getStatusBanner(currentStatus);
  const BannerIcon = banner.icon;

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wrapperClass = embedded
    ? "space-y-6"
    : "w-full min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800";

  return (
    <div className={wrapperClass}>
      <div className={embedded ? "space-y-6" : "max-w-3xl mx-auto space-y-6"}>
        {onBack && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            {!embedded && (
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Track Package
              </span>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div
            className={`${banner.bg} p-6 text-white flex items-start justify-between relative`}
          >
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

          <div className="p-4 sm:p-6 bg-white grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100">
            <div>
              <span className="text-xs font-medium text-slate-400 block">AWB Number</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {order.shipping?.awbNumber || "Unassigned"}
                </span>
                {order.shipping?.awbNumber && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.shipping?.awbNumber)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Copy AWB"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block">Courier Partner</span>
              <span className="font-semibold text-slate-800 text-sm mt-1 block">
                {order.shipping?.courierName || "—"}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-400 block">
                {currentStatus === "Delivered" ? "Delivered On" : "Estimated Delivery"}
              </span>
              <span className="font-semibold text-slate-800 text-sm mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                {currentStatus?.toLowerCase() === "delivered" && order.deliveryDate
                  ? formatDisplayDate(order.deliveryDate)
                  : order.expectedDeliveryDate
                    ? formatDisplayDate(order.expectedDeliveryDate)
                    : "Pending Update"}
              </span>
            </div>
          </div>
        </div>

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

        {showPodSection && pod && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1B2B4B]" />
              Proof of Delivery (POD)
            </h2>
            {pod.podStatus === "available" ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-slate-600">
                  {pod.fileName ? `File: ${pod.fileName}` : "POD document is available."}
                </p>
                <button
                  type="button"
                  disabled={podDownloading}
                  onClick={onDownloadPod}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B2B4B] hover:bg-[#152238] text-white text-sm font-semibold disabled:opacity-60"
                >
                  <Download size={16} />
                  {podDownloading ? "Opening…" : "View / Download POD"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">{pod.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AwbTrackingDetails;
