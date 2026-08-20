import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";

const baseClass =
  "max-w-sm w-full rounded-xl border shadow-lg px-3.5 py-3 flex items-start gap-3 text-sm font-medium";

const ToastShell = ({ icon, iconClass, borderClass, bgClass, textClass, message, t }) => (
  <div
    className={`${baseClass} ${borderClass} ${bgClass} ${textClass}`}
    role="status"
    aria-live="polite"
  >
    <span className={`mt-0.5 shrink-0 ${iconClass}`}>{icon}</span>
    <span className="flex-1 leading-snug break-words">{message}</span>
    <button
      type="button"
      onClick={() => toast.dismiss(t.id)}
      className="shrink-0 text-current/50 hover:text-current transition-colors text-xs font-bold px-1"
      aria-label="Dismiss notification"
    >
      ✕
    </button>
  </div>
);

const showCustom = (message, { icon, iconClass, borderClass, bgClass, textClass, duration = 4000 }) =>
  toast.custom(
    (t) => (
      <ToastShell
        t={t}
        message={message}
        icon={icon}
        iconClass={iconClass}
        borderClass={borderClass}
        bgClass={bgClass}
        textClass={textClass}
      />
    ),
    { duration }
  );

export const notify = {
  success: (message, options) =>
    showCustom(message, {
      icon: <CheckCircle2 size={18} />,
      iconClass: "text-emerald-600",
      borderClass: "border-emerald-200",
      bgClass: "bg-white",
      textClass: "text-slate-800",
      ...options,
    }),

  error: (message, options) =>
    showCustom(message, {
      icon: <XCircle size={18} />,
      iconClass: "text-rose-600",
      borderClass: "border-rose-200",
      bgClass: "bg-white",
      textClass: "text-slate-800",
      duration: 5000,
      ...options,
    }),

  warning: (message, options) =>
    showCustom(message, {
      icon: <AlertTriangle size={18} />,
      iconClass: "text-amber-600",
      borderClass: "border-amber-200",
      bgClass: "bg-white",
      textClass: "text-slate-800",
      ...options,
    }),

  info: (message, options) =>
    showCustom(message, {
      icon: <Info size={18} />,
      iconClass: "text-sky-600",
      borderClass: "border-sky-200",
      bgClass: "bg-white",
      textClass: "text-slate-800",
      ...options,
    }),

  validation: (message, options) =>
    showCustom(message, {
      icon: <AlertTriangle size={18} />,
      iconClass: "text-orange-600",
      borderClass: "border-orange-200",
      bgClass: "bg-orange-50/80",
      textClass: "text-slate-800",
      ...options,
    }),

  loading: (message) =>
    toast.custom(
      (t) => (
        <ToastShell
          t={t}
          message={message}
          icon={<Loader2 size={18} className="animate-spin" />}
          iconClass="text-indigo-600"
          borderClass="border-indigo-200"
          bgClass="bg-white"
          textClass="text-slate-800"
        />
      ),
      { duration: Infinity }
    ),

  dismiss: (id) => toast.dismiss(id),

  /** Drop-in wrappers matching react-hot-toast API used across the app */
  toastSuccess: (message) => notify.success(message),
  toastError: (message) => notify.error(message),
};

export default notify;
