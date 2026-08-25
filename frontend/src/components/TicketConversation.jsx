import { formatDisplayDate } from "../utils/dateTime";

const TicketConversation = ({
  messages = [],
  fallbackText = "",
  emptyLabel = "No messages yet.",
  className = "",
  viewerMode = "user",
}) => {
  const thread = Array.isArray(messages) ? messages : [];

  const senderLabel = (entry) => {
    if (entry.senderRole === "admin") return "Admin";
    return viewerMode === "admin" ? "User" : "You";
  };

  return (
    <div
      className={`space-y-3 max-h-64 sm:max-h-72 overflow-y-auto border border-slate-100 rounded-xl p-3 sm:p-4 ${className}`}
    >
      <p className="text-[11px] font-bold uppercase text-slate-400">Conversation</p>
      {thread.length > 0 ? (
        thread.map((entry, index) => (
          <div
            key={`${entry._id || entry.createdAt}-${index}`}
            className={`rounded-xl px-3 py-2 text-sm break-words ${
              entry.senderRole === "admin"
                ? "bg-indigo-50 text-indigo-900 sm:ml-6"
                : "bg-slate-50 text-slate-800 sm:mr-6"
            }`}
          >
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">
              {senderLabel(entry)} ·{" "}
              {formatDisplayDate(entry.createdAt)}
            </p>
            <p className="whitespace-pre-wrap">{entry.message}</p>
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-400">{fallbackText || emptyLabel}</p>
      )}
    </div>
  );
};

export default TicketConversation;
