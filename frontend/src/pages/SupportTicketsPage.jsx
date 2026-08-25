import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Headphones, Plus, RefreshCw, Eye } from "lucide-react";
import { toast } from '../utils/toast';
import DocumentPreviewDialog from "../components/DocumentPreviewDialog";
import useDocumentPreview from "../utils/useDocumentPreview";
import {
  createTicket,
  getTickets,
  getTicketAttachmentUrl,
  addTicketMessage,
  markTicketRead,
  TICKET_CATEGORIES,
} from "../api/ticketsAPI";
import TicketConversation from "../components/TicketConversation";
import UnreadDot from "../components/UnreadDot";
import {
  canUserReplyToTicket,
  notifyTicketUnreadChanged,
} from "../utils/ticketHelpers";
import { formatDisplayDate } from "../utils/dateTime";
import { canAccess } from "../utils/permissions";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const labelClass =
  "block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";

const readOnlyClass =
  "w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-600";

const buildFormFromUser = (user, orderAwbNumber = "") => ({
  companyName: user?.companyName || user?.company?.companyName || "",
  companyID: user?.companyID || "",
  fullName: user?.fullName || "",
  email: user?.email || "",
  phone: user?.mobile_number || "",
  orderAwbNumber,
  fromName: user?.fullName || "",
  fromPhone: user?.mobile_number || "",
  fromAddress: user?.address || "",
  fromCity: user?.city || "",
  fromState: user?.state || "",
  fromPincode: user?.zip_code || "",
  toName: "",
  toPhone: "",
  toAddress: "",
  toCity: "",
  toState: "",
  toPincode: "",
  subject: "",
  category: "Shipment",
  description: "",
  attachment: null,
});

const SupportTicketsPage = () => {
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "support", "write");
  const [searchParams] = useSearchParams();
  const awbFromUrl = searchParams.get("awb") || searchParams.get("orderAwb") || "";

  const [form, setForm] = useState(buildFormFromUser(null, awbFromUrl));
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const { preview, openPreviewWithLoader, closePreview } = useDocumentPreview();

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...buildFormFromUser(user, prev.orderAwbNumber || awbFromUrl),
        subject: prev.subject,
        category: prev.category,
        description: prev.description,
        attachment: prev.attachment,
      }));
    }
  }, [user, awbFromUrl]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await getTickets({ status: statusFilter, perPage: 50 });
      setTickets(res.tickets || []);
    } catch (error) {
      toast.error(error.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  const resetForm = () => {
    setForm(buildFormFromUser(user, awbFromUrl));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.subject.trim()) {
      toast.validation("Subject is required");
      return;
    }
    if (!form.description.trim()) {
      toast.validation("Description is required");
      return;
    }
    if (!form.fromName.trim() || !form.fromPhone.trim() || !form.fromAddress.trim() || !form.fromCity.trim() || !form.fromState.trim() || !form.fromPincode.trim()) {
      toast.validation("From name, phone, address, city, state, and pincode are required");
      return;
    }
    if (!form.toName.trim() || !form.toPhone.trim() || !form.toAddress.trim() || !form.toCity.trim() || !form.toState.trim() || !form.toPincode.trim()) {
      toast.validation("To name, phone, address, city, state, and pincode are required");
      return;
    }

    try {
      setSubmitting(true);
      const response = await createTicket({
        subject: form.subject.trim(),
        category: form.category,
        description: form.description.trim(),
        orderAwbNumber: form.orderAwbNumber.trim(),
        fromName: form.fromName.trim(),
        fromPhone: form.fromPhone.trim(),
        fromAddress: form.fromAddress.trim(),
        fromCity: form.fromCity.trim(),
        fromState: form.fromState.trim(),
        fromPincode: form.fromPincode.trim(),
        toName: form.toName.trim(),
        toPhone: form.toPhone.trim(),
        toAddress: form.toAddress.trim(),
        toCity: form.toCity.trim(),
        toState: form.toState.trim(),
        toPincode: form.toPincode.trim(),
        attachment: form.attachment,
      });
      toast.success(
        response.message ||
          "Support ticket submitted successfully. Our team will respond shortly."
      );
      if (response.emailSent === false) {
        toast(
          response.emailError ||
            "Ticket saved, but the support email could not be sent. Please contact support directly.",
          { icon: "⚠️", duration: 8000 }
        );
      }
      resetForm();
      setShowForm(false);
      await loadTickets();
      notifyTicketUnreadChanged();
    } catch (error) {
      toast.error(
        error.message || "Failed to submit ticket. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const viewAttachment = (ticket) => {
    openPreviewWithLoader(
      () => getTicketAttachmentUrl(ticket._id),
      {
        title: `${ticket.ticketId} — Attachment`,
        fileName: ticket.attachmentName || "attachment",
      }
    );
  };

  const openTicketThread = async (ticket) => {
    setSelectedTicket(ticket);
    setReplyText("");

    if (ticket.unreadForUser) {
      try {
        const res = await markTicketRead(ticket._id);
        setSelectedTicket(res.ticket);
        setTickets((prev) =>
          prev.map((item) =>
            item._id === ticket._id ? { ...item, unreadForUser: false } : item
          )
        );
        notifyTicketUnreadChanged();
      } catch {
        // non-blocking
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    try {
      setReplyLoading(true);
      const res = await addTicketMessage(selectedTicket._id, replyText.trim());
      setSelectedTicket(res.ticket);
      setReplyText("");
      await loadTickets();
      notifyTicketUnreadChanged();
      toast.success("Reply sent");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="app-page bg-[#EFF2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B] flex items-center gap-2">
            <Headphones size={24} />
            Support & Complaints
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit a ticket and track resolution status with our support team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadTickets}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {canWrite && (
          <button
            type="button"
            onClick={() => {
              if (!showForm) resetForm();
              setShowForm((prev) => !prev);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B2B4B] text-white px-4 py-2.5 text-sm font-bold"
          >
            <Plus size={16} />
            {showForm ? "Hide Form" : "New Ticket"}
          </button>
          )}
        </div>
      </div>

      {canWrite && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[22px] shadow-sm border border-white p-5 md:p-6 space-y-5"
        >
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Submit a Complaint
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Your account details are filled in automatically. Add order/AWB if
              your issue relates to a specific shipment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Company Name</label>
              <input
                type="text"
                value={form.companyName}
                readOnly
                className={readOnlyClass}
              />
            </div>
            <div>
              <label className={labelClass}>Company ID</label>
              <input
                type="text"
                value={form.companyID || "—"}
                readOnly
                className={readOnlyClass}
              />
            </div>
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={form.fullName || "—"}
                readOnly
                className={readOnlyClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                readOnly
                className={readOnlyClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="text"
                value={form.phone || "—"}
                readOnly
                className={readOnlyClass}
              />
            </div>
            <div>
              <label className={labelClass}>Order / AWB Number</label>
              <input
                type="text"
                placeholder="Optional — e.g. AWB123456789"
                value={form.orderAwbNumber}
                onChange={(e) =>
                  setForm({ ...form, orderAwbNumber: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Complaint / Issue Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {TICKET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                From Details <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    required
                    value={form.fromName}
                    onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    required
                    value={form.fromPhone}
                    onChange={(e) => setForm({ ...form, fromPhone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input
                    required
                    value={form.fromAddress}
                    onChange={(e) => setForm({ ...form, fromAddress: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    required
                    value={form.fromCity}
                    onChange={(e) => setForm({ ...form, fromCity: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    required
                    value={form.fromState}
                    onChange={(e) => setForm({ ...form, fromState: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Pincode</label>
                  <input
                    required
                    value={form.fromPincode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fromPincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                To Details <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    required
                    value={form.toName}
                    onChange={(e) => setForm({ ...form, toName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    required
                    value={form.toPhone}
                    onChange={(e) => setForm({ ...form, toPhone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input
                    required
                    value={form.toAddress}
                    onChange={(e) => setForm({ ...form, toAddress: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    required
                    value={form.toCity}
                    onChange={(e) => setForm({ ...form, toCity: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    required
                    value={form.toState}
                    onChange={(e) => setForm({ ...form, toState: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Pincode</label>
                  <input
                    required
                    value={form.toPincode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        toPincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder="Brief summary of your issue"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe your issue in detail"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className={`${inputClass} min-h-[100px]`}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Attachment (optional)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) =>
                  setForm({ ...form, attachment: e.target.files?.[0] || null })
                }
                className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-[#1B2B4B] text-white text-sm font-bold disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        {["ALL", "pending", "in_progress", "resolved"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold border transition-colors ${
              statusFilter === status
                ? "bg-[#1B2B4B] text-white border-[#1B2B4B]"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {status === "ALL" ? "All" : status.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[22px] shadow-sm border border-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-[#1B2B4B]">My Tickets</h2>
        </div>
        <div className="responsive-table-wrap">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-[#FAFBFC] border-b border-slate-100">
                <th className="px-4 py-4">Ticket</th>
                <th className="px-4 py-4">Subject</th>
                <th className="px-4 py-4">Issue Type</th>
                <th className="px-4 py-4">Order / AWB</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Attachment</th>
                <th className="px-4 py-4">Response</th>
                <th className="px-4 py-4 text-right">Thread</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No tickets yet. Click New Ticket to submit a complaint.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-slate-50/70 align-top cursor-pointer"
                    onClick={() => openTicketThread(ticket)}
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#1B2B4B] flex items-center gap-2">
                        {ticket.ticketId}
                        {ticket.unreadForUser && <UnreadDot title="Unread reply" />}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDisplayDate(ticket.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#1B2B4B]">{ticket.subject}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {ticket.description}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{ticket.category}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {ticket.orderAwbNumber || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[ticket.status] || ""}`}
                      >
                        {ticket.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {ticket.attachmentPath || ticket.s3Key ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewAttachment(ticket);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 max-w-[200px]">
                      {ticket.messages?.length
                        ? ticket.messages[ticket.messages.length - 1]?.message
                        : ticket.adminReply || "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTicketThread(ticket);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#1B2B4B]"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)} role="presentation">
          <div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-panel-body">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#1B2B4B] safe-break">{selectedTicket.ticketId}</h3>
                <p className="text-sm text-slate-500 safe-break">{selectedTicket.subject}</p>
              </div>
              <button type="button" className="touch-target text-slate-500 shrink-0" onClick={() => setSelectedTicket(null)}>
                Close
              </button>
            </div>
            <TicketConversation
              messages={selectedTicket.messages}
              fallbackText={selectedTicket.description}
            />
            {canWrite && canUserReplyToTicket(selectedTicket) ? (
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to support..."
                className={`${inputClass} min-h-[80px]`}
              />
            ) : selectedTicket.status !== "resolved" ? (
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                Our team will respond shortly. You can reply here once admin has messaged you.
              </p>
            ) : (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
                This ticket has been resolved.
              </p>
            )}
            </div>
            {canWrite && canUserReplyToTicket(selectedTicket) && (
              <div className="modal-panel-footer">
                <button
                  type="button"
                  disabled={replyLoading || !replyText.trim()}
                  onClick={handleSendReply}
                  className="modal-action-btn bg-[#1B2B4B] text-white disabled:opacity-50"
                >
                  {replyLoading ? "Sending..." : "Send Reply"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <DocumentPreviewDialog
        open={preview.open}
        onClose={closePreview}
        title={preview.title}
        fileName={preview.fileName}
        url={preview.url}
        loading={preview.loading}
        error={preview.error}
      />
    </div>
  );
};

export default SupportTicketsPage;
