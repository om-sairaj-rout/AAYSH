import { useRef } from "react";
import { Paperclip, Send, Download, Image as ImageIcon } from "lucide-react";
import { formatDisplayDate } from "../utils/dateTime";

const isImageAttachment = (entry) => {
  const type = String(entry?.contentType || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  const name = String(entry?.attachmentName || "").toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp)$/.test(name);
};

const TicketChatPanel = ({
  messages = [],
  viewerMode = "user",
  composer,
  className = "",
}) => {
  const bottomRef = useRef(null);
  const thread = Array.isArray(messages) ? messages : [];

  const senderLabel = (entry) => {
    const populated = entry?.sender;
    if (entry.senderRole === "admin") {
      return populated?.fullName
        ? `Support · ${populated.fullName}`
        : "Support Team";
    }
    if (viewerMode === "admin") {
      return populated?.fullName || populated?.companyName || "Customer";
    }
    return "You";
  };

  return (
    <div className={`flex flex-col rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Conversation
        </p>
      </div>

      <div className="flex-1 min-h-[280px] max-h-[420px] overflow-y-auto px-3 py-4 space-y-3 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
        {thread.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No messages yet.</p>
        ) : (
          thread.map((entry, index) => {
            const isAdmin = entry.senderRole === "admin";
            const alignRight = viewerMode === "user" ? !isAdmin : isAdmin;

            return (
              <div
                key={`${entry._id || entry.createdAt}-${index}`}
                className={`flex ${alignRight ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm border ${
                    isAdmin
                      ? "bg-white border-slate-200 text-slate-800 rounded-bl-md"
                      : "bg-indigo-600 border-indigo-600 text-white rounded-br-md"
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold mb-1 ${
                      isAdmin ? "text-slate-400" : "text-indigo-100"
                    }`}
                  >
                    {senderLabel(entry)} · {formatDisplayDate(entry.createdAt)}
                  </p>
                  {entry.message && entry.message !== "(attachment)" && (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {entry.message}
                    </p>
                  )}
                  {entry.s3Key && (
                    <div
                      className={`mt-2 rounded-xl border px-2.5 py-2 text-xs flex items-center gap-2 ${
                        isAdmin
                          ? "border-slate-200 bg-slate-50 text-slate-700"
                          : "border-indigo-400/40 bg-indigo-500/30 text-white"
                      }`}
                    >
                      {isImageAttachment(entry) ? (
                        <ImageIcon size={14} className="shrink-0" />
                      ) : (
                        <Paperclip size={14} className="shrink-0" />
                      )}
                      <span className="truncate flex-1">
                        {entry.attachmentName || "Attachment"}
                      </span>
                      {composer?.onOpenAttachment && (
                        <button
                          type="button"
                          onClick={() => composer.onOpenAttachment(index)}
                          className={`shrink-0 inline-flex items-center gap-1 font-semibold ${
                            isAdmin ? "text-indigo-600" : "text-white"
                          }`}
                        >
                          <Download size={12} />
                          Open
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} aria-hidden />
      </div>

      {composer?.enabled && (
        <div className="border-t border-slate-200 bg-white p-3 space-y-2">
          <textarea
            rows={2}
            value={composer.text || ""}
            onChange={(e) => composer.onTextChange?.(e.target.value)}
            placeholder={composer.placeholder || "Type a message…"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 cursor-pointer hover:text-indigo-600">
              <Paperclip size={14} />
              {composer.attachmentName || "Attach file"}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx"
                onChange={(e) =>
                  composer.onAttachmentChange?.(e.target.files?.[0] || null)
                }
              />
            </label>
            <button
              type="button"
              disabled={composer.sending || (!composer.text?.trim() && !composer.attachment)}
              onClick={composer.onSend}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2B4B] text-white px-4 py-2 text-xs font-bold disabled:opacity-50"
            >
              <Send size={14} />
              {composer.sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketChatPanel;