import { useState } from "react";
import { Search, Package } from "lucide-react";
import { toast } from "../utils/toast";
import AwbTrackingDetails from "../components/AwbTrackingDetails";
import {
  getSecureOrderByAwb,
  getShipmentPodDownloadUrl,
} from "../api/trackingAPI";

const PortalAwbTrackingPage = () => {
  const [awbInput, setAwbInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [podLoading, setPodLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [pod, setPod] = useState(null);
  const [searchedAwb, setSearchedAwb] = useState("");

  const handleSearch = async (e) => {
    e?.preventDefault();
    const awb = awbInput.trim();
    if (!awb) {
      toast.validation("Enter an AWB number to track");
      return;
    }

    try {
      setLoading(true);
      setOrder(null);
      setPod(null);
      const res = await getSecureOrderByAwb(awb);
      if (res?.success && res.order) {
        setSearchedAwb(awb);
        setOrder({
          ...res.order,
          expectedDeliveryDate: res.expectedDeliveryDate,
          shipping: {
            ...res.shipping,
            trackingHistory: res.tracking || [],
          },
        });
        setPod(res.pod || null);
      } else {
        toast.error("No shipment found for this AWB");
      }
    } catch (err) {
      toast.error(err.message || "Unable to load tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPod = async () => {
    if (!searchedAwb) return;
    try {
      setPodLoading(true);
      const res = await getShipmentPodDownloadUrl(searchedAwb);
      const url = res?.data?.downloadUrl;
      if (!url) {
        throw new Error("Download link unavailable");
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err.message || "Could not open POD");
    } finally {
      setPodLoading(false);
    }
  };

  return (
    <div className="app-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B2B4B] flex items-center gap-2">
          <Package size={24} />
          AWB Tracking
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track shipments linked to your account. You can only view AWBs you are authorized to access.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-white rounded-[22px] border border-white shadow-sm p-5 md:p-6 flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={awbInput}
            onChange={(e) => setAwbInput(e.target.value)}
            placeholder="Enter AWB number"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B4B]/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-[#1B2B4B] hover:bg-[#152238] text-white text-sm font-bold disabled:opacity-60"
        >
          {loading ? "Searching…" : "Track"}
        </button>
      </form>

      {order && (
        <AwbTrackingDetails
          embedded
          order={order}
          pod={pod}
          showPodSection
          onDownloadPod={handleDownloadPod}
          podDownloading={podLoading}
        />
      )}
    </div>
  );
};

export default PortalAwbTrackingPage;
