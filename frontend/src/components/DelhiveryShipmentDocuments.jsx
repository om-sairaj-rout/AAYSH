import { useCallback, useEffect, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "../utils/toast";
import {
  fetchDelhiveryDocumentOptions,
  fetchDelhiveryShipmentDocument,
} from "../api/delhiveryAPI";

export default function DelhiveryShipmentDocuments({ orderId, enabled }) {
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [waybills, setWaybills] = useState([]);
  const [isMps, setIsMps] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedWaybill, setSelectedWaybill] = useState("");
  const [fetchingType, setFetchingType] = useState("");

  const loadMeta = useCallback(async () => {
    if (!enabled || !orderId) return;
    setLoadingMeta(true);
    try {
      const res = await fetchDelhiveryDocumentOptions(orderId);
      const data = res.data || {};
      const wbs = data.waybills || [];
      setWaybills(wbs);
      setIsMps(Boolean(data.isMps));
      setDocumentTypes(data.documentTypes || []);
      setSelectedWaybill((prev) => prev || wbs[0] || "");
    } catch (err) {
      toast.error(err.message || "Could not load Delhivery document options.");
    } finally {
      setLoadingMeta(false);
    }
  }, [enabled, orderId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  if (!enabled) return null;

  const handleFetch = async (docType) => {
    if (!orderId || !selectedWaybill || fetchingType) return;
    setFetchingType(docType);
    try {
      const result = await fetchDelhiveryShipmentDocument(orderId, {
        doc_type: docType,
        waybill: selectedWaybill,
      });
      if (result.mode === "url" && result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (result.blob) {
        const href = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = result.filename || `${docType}.bin`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
        return;
      }
      toast.error("Document response was empty.");
    } catch (err) {
      toast.error(err.message || "Document unavailable.");
    } finally {
      setFetchingType("");
    }
  };

  return (
    <div className="border border-cyan-100 rounded-xl overflow-hidden bg-cyan-50/20">
      <div className="bg-cyan-50 px-4 py-2.5 border-b border-cyan-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-800">
          Delhivery courier documents
        </h4>
        <p className="text-[11px] text-cyan-700/80 mt-0.5">
          Fetched from Delhivery when you request a document (not prefetched).
        </p>
      </div>

      <div className="p-4 space-y-3">
        {loadingMeta ? (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading AWBs…
          </p>
        ) : (
          <>
            {isMps && waybills.length > 1 && (
              <label className="block text-xs font-semibold text-slate-600">
                Package AWB
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
                  value={selectedWaybill}
                  onChange={(e) => setSelectedWaybill(e.target.value)}
                >
                  {waybills.map((wb) => (
                    <option key={wb} value={wb}>
                      {wb}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!isMps && selectedWaybill && (
              <p className="text-xs text-slate-600">
                AWB: <span className="font-mono font-semibold">{selectedWaybill}</span>
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {(documentTypes.length
                ? documentTypes
                : [
                    { id: "EPOD", label: "EPOD" },
                    { id: "SIGNATURE_URL", label: "Signature" },
                    { id: "RVP_QC_IMAGE", label: "RVP QC Image" },
                    { id: "SELLER_RETURN_IMAGE", label: "Seller Return Image" },
                  ]
              ).map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  disabled={!selectedWaybill || Boolean(fetchingType)}
                  onClick={() => handleFetch(doc.id)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {fetchingType === doc.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  {doc.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}