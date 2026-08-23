const UnreadDot = ({ title = "Unread message" }) => (
  <span
    className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-white"
    title={title}
    aria-label={title}
  />
);

export default UnreadDot;
