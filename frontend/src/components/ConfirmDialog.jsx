import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, Ban, HelpCircle, Info, X } from "lucide-react";

const ConfirmContext = createContext(null);

const VARIANT_STYLES = {
  danger: {
    icon: Ban,
    iconWrap: "bg-rose-50 text-rose-600 ring-rose-100",
    confirmBtn: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-50 text-amber-600 ring-amber-100",
    confirmBtn: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-300",
  },
  info: {
    icon: Info,
    iconWrap: "bg-sky-50 text-sky-600 ring-sky-100",
    confirmBtn: "bg-[#1B2B4B] hover:bg-[#152238] focus-visible:ring-slate-300",
  },
  default: {
    icon: HelpCircle,
    iconWrap: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    confirmBtn: "bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-300",
  },
};

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const Icon = style.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>

        <div className="p-6 pt-7">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${style.iconWrap}`}
            >
              <Icon size={20} />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2
                id="confirm-dialog-title"
                className="text-base font-bold text-[#1B2B4B] tracking-tight"
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-desc"
                className="mt-1.5 text-sm text-slate-600 leading-relaxed whitespace-pre-line"
              >
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              autoFocus
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-colors ${style.confirmBtn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    open: false,
    title: "Confirm",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    variant: "default",
  });
  const resolverRef = useRef(null);

  const close = useCallback((result) => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const confirm = useCallback((options = {}) => {
    const {
      title = "Confirm",
      message = "Are you sure you want to continue?",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      variant = "default",
    } = typeof options === "string" ? { message: options } : options;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        title,
        message,
        confirmLabel,
        cancelLabel,
        variant,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
};

export default ConfirmProvider;
