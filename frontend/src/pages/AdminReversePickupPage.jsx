import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { ArrowLeftRight, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { toast } from '../utils/toast';
import { canAccess } from "../utils/permissions";
import {
  getReversePickups,
  approveReversePickup,
  rejectReversePickup,
  getReversePickupDocumentUrl,
} from "../api/reversePickupAPI";
import { getCompanies } from "../api/companyAPI";
import { fetchCourierPartnersAPI } from "../api/courierAPI";
import { formatDisplayDate } from "../utils/dateTime";
import ReversePickupRouteCell from "../components/ReversePickupRouteCell";
import {
  getReversePickupAwb,
  getReversePickupCourier,
  getReversePickupStatusClass,
  getReversePickupStatusDisplay,
} from "../utils/reversePickupDisplay";

const AdminReversePickupPage = () => {
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "reversePickup", "write");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [companiesList, setCompaniesList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailRequest, setDetailRequest] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [serviceType, setServiceType] = useState("surface");
  const [awbNumber, setAwbNumber] = useState("");
  const [courierName, setCourierName] = useState("");
  const [couriersList, setCouriersList] = useState([]);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await getReversePickups({
        status: statusFilter,
        companyId: companyFilter,
        perPage: 100,
      });
      setRequests(res.requests || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCompanies()
      .then((res) => {
        if (res.success) setCompaniesList(res.companies || []);
      })
      .catch(() => {});
    fetchCourierPartnersAPI()
      .then((res) => {
        if (res.success) setCouriersList(res.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRequests();
  }, [statusFilter, companyFilter]);

  const openApprove = (item) => {
    setSelected(item);
    setServiceType(
      item.modeType === "Air"
        ? "air"
        : item.modeType === "Prime"
          ? "prime"
          : item.preferredServiceType || "surface"
    );
    setAwbNumber("");
    setCourierName("");
    setModalMode("approve");
  };

  const openReject = (item) => {
    setSelected(item);
    setRejectReason("");
    setModalMode("reject");
  };

  const closeModal = () => {
    setSelected(null);
    setModalMode(null);
    setRejectReason("");
    setAwbNumber("");
    setCourierName("");
  };

  const handleApprove = async () => {
    if (!canWrite) {
      toast.error("You do not have permission to approve reverse pickup requests");
      return;
    }
    if (!selected) return;

    const trimmedAwb = awbNumber.trim();
    const trimmedCourier = courierName.trim();

    if (!trimmedAwb) {
      toast.validation("AWB number is required");
      return;
    }

    if (!trimmedCourier) {
      toast.validation("Courier name is required");
      return;
    }

    try {
      setActionLoading(true);
      const res = await approveReversePickup(selected._id, {
        serviceType,
        awbNumber: trimmedAwb,
        courierName: trimmedCourier,
      });
      toast.success(
        res.order?.awbNumber
          ? `Approved · AWB ${res.order.awbNumber} (${res.order.courier})`
          : "Request approved"
      );
      setSelected(null);
      setModalMode(null);
      await loadRequests();
    } catch (error) {
      toast.error(error.message);
      await loadRequests();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!canWrite) {
      toast.error("You do not have permission to reject reverse pickup requests");
      return;
    }
    if (!selected || !rejectReason.trim()) {
      toast.validation("Rejection reason is required");
      return;
    }
    try {
      setActionLoading(true);
      await rejectReversePickup(selected._id, rejectReason.trim());
      toast.success("Request rejected");
      setSelected(null);
      setModalMode(null);
      await loadRequests();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app-page bg-[#EFF2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B] flex items-center gap-2">
            <ArrowLeftRight size={24} />
            Reverse Pickup Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review company requests, approve to create order, and enter AWB and courier manually.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRequests}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold self-start"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1B2B4B]"
        >
          <option value="ALL">All</option>
          <option value="pending">Pending</option>
          <option value="awb_assigned">AWB Assigned</option>
          <option value="failed">Failed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1B2B4B]"
        >
          <option value="ALL">All Companies</option>
          {companiesList.map((c) => (
            <option key={c.companyID} value={c.companyID}>
              {c.companyName} ({c.companyID})
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-[22px] shadow-sm border border-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-[#1B2B4B]">Pending & Recent Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-[#FAFBFC] border-b border-slate-100">
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Orig. AWB</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Pickup</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    No requests found.
                  </td>
                </tr>
              ) : (
                requests.map((item) => {
                  const statusDisplay = getReversePickupStatusDisplay(item);
                  const awb = getReversePickupAwb(item);
                  const courier = getReversePickupCourier(item);

                  return (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/70 align-top cursor-pointer"
                    onClick={() => setDetailRequest(item)}
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#1B2B4B]">{item.requestId}</p>
                      <p className="text-xs text-slate-400">{formatDisplayDate(item.createdAt)}</p>
                      {awb !== "—" && (
                        <p className="text-xs font-mono text-indigo-600 mt-1">{awb}</p>
                      )}
                      {courier && (
                        <p className="text-xs text-slate-500 mt-0.5">{courier}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">
                      {item.originalAwbNumber || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{item.companyID}</p>
                      <p className="text-xs text-slate-500">
                        {item.requestedBy?.companyName || item.requestedBy?.email}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <ReversePickupRouteCell
                        fromName={item.fromName}
                        fromCity={item.fromCity}
                        fromPincode={item.fromPincode}
                        toName={item.toName}
                        toCity={item.toCity}
                        toPincode={item.toPincode}
                      />
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {item.itemDescription || "—"}
                      <br />
                      {item.pieces || 1} pc · {item.weight || 0} kg
                      <br />
                      {item.modeType || item.preferredServiceType}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs">
                      {formatDisplayDate(item.livePickupDate || item.pickupDate)}
                      <br />
                      {item.livePickupTime || item.pickupTime}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${getReversePickupStatusClass(statusDisplay)}`}>
                        {statusDisplay.label}
                      </span>
                      {item.failureReason && (
                        <p className="text-xs text-rose-500 mt-1 max-w-[200px]">
                          {item.failureReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      {item.status === "pending" && canWrite ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openApprove(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openReject(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-600 px-3 py-1.5 text-xs font-bold"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-right">—</p>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && modalMode === "approve" && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-[#1B2B4B]">Approve Reverse Pickup</h3>
            <p className="text-sm text-slate-500">
              This will create an order and schedule pickup for{" "}
              <strong>{selected.requestId}</strong>. Enter AWB and courier before confirming.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                AWB Number
              </label>
              <input
                value={awbNumber}
                onChange={(e) => setAwbNumber(e.target.value)}
                placeholder="Enter AWB number"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Courier Name
              </label>
              <input
                list="reverse-pickup-couriers"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="Enter courier name"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              />
              <datalist id="reverse-pickup-couriers">
                {couriersList.map((courier) => (
                  <option key={courier._id} value={courier.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              >
                <option value="surface">Surface</option>
                <option value="air">Air</option>
                <option value="prime">Prime</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                disabled={!canWrite || actionLoading}
                onClick={handleApprove}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : "Approve & Process"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && modalMode === "reject" && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-[#1B2B4B]">Reject Request</h3>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeModal} className="px-4 py-2 rounded-xl border text-sm font-semibold">
                Cancel
              </button>
              <button
                type="button"
                disabled={!canWrite || actionLoading}
                onClick={handleReject}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailRequest && (
        <div className="modal-overlay">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-[#1B2B4B]">{detailRequest.requestId}</h3>
                <p className="text-xs text-slate-400">Reverse pickup details</p>
              </div>
              <button type="button" className="text-slate-500" onClick={() => setDetailRequest(null)}>Close</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p><span className="text-slate-400">Status:</span> {getReversePickupStatusDisplay(detailRequest).label}</p>
              <p><span className="text-slate-400">Company:</span> {detailRequest.companyID}</p>
              <p><span className="text-slate-400">Original AWB:</span> {detailRequest.originalAwbNumber || "—"}</p>
              <p><span className="text-slate-400">AWB:</span> {detailRequest.awbNumber || detailRequest.liveAwbNumber || "—"}</p>
              <p><span className="text-slate-400">Courier:</span> {detailRequest.courierName || "—"}</p>
              <p><span className="text-slate-400">Requested pickup:</span> {formatDisplayDate(detailRequest.requestedPickupDate || detailRequest.pickupDate)}</p>
              <p><span className="text-slate-400">From:</span> {detailRequest.fromName} · {detailRequest.fromPhone}<br />{detailRequest.fromAddress}, {detailRequest.fromCity} {detailRequest.fromPincode}</p>
              <p><span className="text-slate-400">To:</span> {detailRequest.toName} · {detailRequest.toPhone}<br />{detailRequest.toAddress}, {detailRequest.toCity} {detailRequest.toPincode}</p>
              <p className="sm:col-span-2"><span className="text-slate-400">Items:</span> {detailRequest.itemDescription} ({detailRequest.pieces} pc, {detailRequest.weight} kg)</p>
              <p><span className="text-slate-400">Invoice value:</span> ₹{detailRequest.invoiceValue || 0}</p>
              <p><span className="text-slate-400">Remarks:</span> {detailRequest.remarks || "—"}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Documents</h4>
              <div className="flex flex-wrap gap-2">
                {(detailRequest.supportingDocumentName || detailRequest.supportingDocumentPath || detailRequest.supportingDocumentS3Key) && (
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold text-indigo-600"
                    onClick={async () => {
                      try {
                        const url = await getReversePickupDocumentUrl(detailRequest._id);
                        window.open(url, "_blank", "noopener,noreferrer");
                      } catch (error) {
                        toast.error(error.message);
                      }
                    }}
                  >
                    Open supporting document
                  </button>
                )}
                {(detailRequest.orderId?.documents || []).map((doc, index) => (
                  <span key={`${doc.fileName}-${index}`} className="px-3 py-1.5 rounded-lg border text-xs">
                    {doc.documentType || "Document"}: {doc.fileName || `File ${index + 1}`}
                  </span>
                ))}
                {!detailRequest.supportingDocumentName && !(detailRequest.orderId?.documents || []).length && (
                  <p className="text-xs text-slate-400">No documents attached</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReversePickupPage;
