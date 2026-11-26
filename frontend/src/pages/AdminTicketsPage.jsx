import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Headphones, RefreshCw, Eye } from "lucide-react";
import { canAccess } from "../utils/permissions";
import { toast } from '../utils/toast';
import DocumentPreviewDialog from "../components/DocumentPreviewDialog";
import useDocumentPreview from "../utils/useDocumentPreview";
import {
  getAdminTickets,
  updateTicket,
  getTicketAttachmentUrl,
  getTicketMessageAttachmentUrl,
  addAdminTicketMessage,
  markAdminTicketRead,
} from "../api/ticketsAPI";
import { formatDisplayDate } from "../utils/dateTime";
import TicketChatPanel from "../components/TicketChatPanel";
import { formatTicketIssueTypes } from "../utils/ticketIssueTypes";
import UnreadDot from "../components/UnreadDot";
import { notifyTicketUnreadChanged } from "../utils/ticketHelpers";
import { getCompanies } from "../api/companyAPI";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PRIORITY_STYLES = {
  low: "text-slate-500",
  medium: "text-amber-600",
  high: "text-rose-600 font-bold",
};

const AdminTicketsPage = () => {
  const { user } = useSelector((state) => state.auth);
  const canWrite = canAccess(user, "tickets", "write");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [companiesList, setCompaniesList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "pending",
    priority: "medium",
    adminNotes: "",
    adminReply: "",
  });
  const [replyText, setReplyText] = useState("");
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { preview, openPreviewWithLoader, closePreview } = useDocumentPreview();

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await getAdminTickets({
        status: statusFilter,
        companyId: companyFilter,
        priority: priorityFilter,
        perPage: 100,
      });
      setTickets(res.tickets || []);
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
  }, []);

  useEffect(() => {
    loadTickets();
  }, [statusFilter, companyFilter, priorityFilter]);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    setReplyText("");
    setEditForm({
      status: ticket.status,
      priority: ticket.priority || "medium",
      adminNotes: ticket.adminNotes || "",
      adminReply: "",
    });

    if (ticket.unreadForAdmin) {
      try {
        const res = await markAdminTicketRead(ticket._id);
        const updated = res.ticket;
        setSelected(updated);
        setTickets((prev) =>
          prev.map((item) =>
            item._id === ticket._id
              ? { ...item, unreadForAdmin: false }
              : item
          )
        );
        notifyTicketUnreadChanged();
      } catch {
        // non-blocking
      }
    }
  };

  const closeModal = () => {
    setSelected(null);
  };

  const handleSendReply = async () => {
    if (!selected || (!replyText.trim() && !replyAttachment)) return;
    try {
      setReplyLoading(true);
      const res = await addAdminTicketMessage(
        selected._id,
        replyText.trim(),
        replyAttachment
      );
      setSelected(res.ticket);
      setReplyText("");
      setReplyAttachment(null);
      await loadTickets();
      notifyTicketUnreadChanged();
      toast.success("Message sent");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setReplyLoading(false);
    }
  };

  const openMessageAttachment = (messageIndex) => {
    if (!selected) return;
    openPreviewWithLoader(
      () => getTicketMessageAttachmentUrl(selected._id, messageIndex),
      {
        title: `${selected.ticketId} — Message attachment`,
        fileName:
          selected.messages?.[messageIndex]?.attachmentName || "attachment",
      }
    );
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      await updateTicket(selected._id, {
        status: editForm.status,
        priority: editForm.priority,
        adminNotes: editForm.adminNotes,
      });
      toast.success("Ticket updated");
      closeModal();
      await loadTickets();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
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

  return (
    <div className="app-page bg-[#EFF2F6]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B4B] flex items-center gap-2">
            <Headphones size={24} />
            Ticket Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review user complaints, update status, and add resolution notes.
          </p>
        </div>
        <button
          type="button"
          onClick={loadTickets}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold self-start"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1B2B4B]"
        >
          <option value="ALL">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
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
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1B2B4B]"
        >
          <option value="ALL">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="bg-white rounded-[22px] shadow-sm border border-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-[#1B2B4B]">All Tickets</h2>
        </div>
        <div className="responsive-table-wrap">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-[#FAFBFC] border-b border-slate-100">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">User / Company</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-slate-50/70 align-top cursor-pointer"
                    onClick={() => openTicket(ticket)}
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#1B2B4B] flex items-center gap-2">
                        {ticket.ticketId}
                        {ticket.unreadForAdmin && <UnreadDot title="Unread message" />}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDisplayDate(ticket.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <p className="font-semibold text-[#1B2B4B]">
                        {ticket.submittedBy?.companyName || ticket.submittedBy?.email}
                      </p>
                      <p className="text-slate-500">{ticket.companyID || "—"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ticket.fullName || ticket.submittedBy?.fullName || "—"}
                        {ticket.orderAwbNumber ? ` · AWB ${ticket.orderAwbNumber}` : ""}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        {formatTicketIssueTypes(ticket)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-bold uppercase ${PRIORITY_STYLES[ticket.priority] || ""}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[ticket.status] || ""}`}>
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
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTicket(ticket);
                        }}
                        className="rounded-lg bg-[#1B2B4B] text-white px-3 py-1.5 text-xs font-bold"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={closeModal} role="presentation">
          <div
            className="modal-panel max-w-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-panel-body">
            <div className="flex justify-between items-start gap-3">
              <h3 className="text-lg font-bold text-[#1B2B4B] safe-break">
                Manage Ticket — {selected.ticketId}
              </h3>
              <button type="button" onClick={closeModal} className="touch-target text-slate-500 shrink-0">
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="text-sm space-y-2 bg-slate-50 rounded-xl p-4 safe-break border border-slate-100">
                <p className="text-xs font-bold uppercase text-slate-400">Ticket information</p>
                <p><strong>Company:</strong> {selected.companyName || selected.submittedBy?.companyName || "—"}</p>
                <p><strong>Contact:</strong> {selected.fullName || selected.submittedBy?.fullName || "—"}</p>
                <p><strong>Order / AWB:</strong> {selected.orderAwbNumber || "—"}</p>
                <p><strong>Subject:</strong> {selected.subject}</p>
                <p><strong>Issue types:</strong> {formatTicketIssueTypes(selected)}</p>
                <p><strong>From:</strong> {selected.fromName} · {selected.fromPhone}</p>
                <p className="text-slate-600 whitespace-pre-wrap">{selected.description}</p>
                {(selected.attachmentPath || selected.s3Key) && (
                  <button
                    type="button"
                    onClick={() => viewAttachment(selected)}
                    className="inline-flex items-center gap-1 text-indigo-600 text-xs font-semibold hover:underline"
                  >
                    <Eye size={14} />
                    View initial attachment
                  </button>
                )}
              </div>
              <TicketChatPanel
                messages={selected.messages}
                viewerMode="admin"
                composer={
                  canWrite
                    ? {
                        enabled: true,
                        text: replyText,
                        attachment: replyAttachment,
                        attachmentName: replyAttachment?.name,
                        onTextChange: setReplyText,
                        onAttachmentChange: setReplyAttachment,
                        onSend: handleSendReply,
                        onOpenAttachment: openMessageAttachment,
                        sending: replyLoading,
                        placeholder: "Message the customer…",
                      }
                    : { enabled: false }
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  disabled={!canWrite}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 uppercase">Priority</span>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  disabled={!canWrite}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-slate-500 uppercase">Admin Notes (internal)</span>
              <textarea
                rows={2}
                value={editForm.adminNotes}
                onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                disabled={!canWrite}
                readOnly={!canWrite}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>
            </div>
            <div className="modal-panel-footer">
              <button type="button" onClick={closeModal} className="modal-action-btn border border-slate-200 text-slate-700">
                Cancel
              </button>
              <button
                type="button"
                disabled={!canWrite || actionLoading}
                onClick={handleUpdate}
                className="modal-action-btn bg-[#1B2B4B] text-white disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
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

export default AdminTicketsPage;
