import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Search } from "lucide-react";
import { toast } from "../utils/toast";
import AwbTrackingDetails from "../components/AwbTrackingDetails";
import {
  getSecureOrderByAwb,
  getShipmentPodDownloadUrl,
} from "../api/trackingAPI";

const PortalAwbTrackingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [podLoading, setPodLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [pod, setPod] = useState(null);
  const [searchedAwb, setSearchedAwb] = useState("");

  const loadAwb = async (awb) => {
    const trimmed = String(awb || "").trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setOrder(null);
      setPod(null);
      const res = await getSecureOrderByAwb(trimmed);
      if (res?.success && res.order) {
        setSearchedAwb(trimmed);
        setSearchParams({ awb: trimmed }, { replace: true });
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

  useEffect(() => {
    const awb = searchParams.get("awb");
    if (awb && awb !== searchedAwb) {
      loadAwb(awb);
    }
  }, [searchParams]);

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
        <p className="text-sm text-slate-500 mt-1 flex items-start gap-2">
          <Search className="w-4 h-4 mt-0.5 shrink-0" />
          Use the <strong className="font-semibold text-slate-700">Track AWB</strong> search in the
          top header to open shipment details here. You only see AWBs your account can access.
        </p>
      </div>

      {loading && (
        <div className="bg-white rounded-[22px] border border-slate-100 p-8 text-center text-sm text-slate-500">
          Loading tracking…
        </div>
      )}

      {!loading && !order && (
        <div className="bg-white rounded-[22px] border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
          Enter an AWB in the header search bar to view tracking and POD (when available).
        </div>
      )}

      {order && !loading && (
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
