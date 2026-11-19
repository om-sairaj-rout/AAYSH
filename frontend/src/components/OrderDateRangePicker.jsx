import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

const toYmd = (year, monthIndex, day) =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

const parseYmd = (ymd) => {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const lastNDaysRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    from: toYmd(start.getFullYear(), start.getMonth(), start.getDate()),
    to: toYmd(end.getFullYear(), end.getMonth(), end.getDate()),
  };
};

const RANGE_PRESETS = [
  { label: "Last 10 days", days: 10 },
  { label: "Last 20 days", days: 20 },
  { label: "Last 30 days", days: 30 },
];

const formatTriggerLabel = (from, to) => {
  const fmt = (ymd) => {
    const d = parseYmd(ymd);
    if (!d) return "";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return "Order date range";
};

export default function OrderDateRangePicker({ fromDate, toDate, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseYmd(fromDate) || new Date());
  const [draftStart, setDraftStart] = useState(fromDate || "");
  const [draftEnd, setDraftEnd] = useState(toDate || "");
  const rootRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDraftStart(fromDate || "");
      setDraftEnd(toDate || "");
      setViewDate(parseYmd(fromDate) || parseYmd(toDate) || new Date());
    }
  }, [open, fromDate, toDate]);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push(toYmd(year, month, d));
    }
    return cells;
  }, [year, month]);

  const commitRange = (start, end) => {
    onChange?.({ from: start || "", to: end || "" });
  };

  const applyPreset = (days) => {
    const { from, to } = lastNDaysRange(days);
    setDraftStart(from);
    setDraftEnd(to);
    setViewDate(parseYmd(to) || new Date());
    commitRange(from, to);
    setOpen(false);
  };

  const onDayClick = (ymd) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(ymd);
      setDraftEnd("");
      return;
    }
    const startDate = parseYmd(draftStart);
    const clickDate = parseYmd(ymd);
    if (clickDate < startDate) {
      setDraftEnd(draftStart);
      setDraftStart(ymd);
      commitRange(ymd, draftStart);
      setOpen(false);
      return;
    }
    setDraftEnd(ymd);
    commitRange(draftStart, ymd);
    setOpen(false);
  };

  const inRange = (ymd) => {
    if (!draftStart || !ymd) return false;
    const d = parseYmd(ymd).getTime();
    const s = parseYmd(draftStart).getTime();
    const e = draftEnd ? parseYmd(draftEnd).getTime() : s;
    const lo = Math.min(s, e);
    const hi = Math.max(s, e);
    return d >= lo && d <= hi;
  };

  const monthLabel = viewDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors min-w-[11rem]"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Calendar size={14} className="text-slate-500 shrink-0" />
        <span className="truncate">{formatTriggerLabel(fromDate, toDate)}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          role="dialog"
          aria-label="Order date range"
        >
          <div className="flex flex-wrap gap-1.5 mb-3">
            {RANGE_PRESETS.map(({ label, days }) => (
              <button
                key={days}
                type="button"
                onClick={() => applyPreset(days)}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600"
              onClick={() =>
                setViewDate(new Date(year, month - 1, 1))
              }
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-slate-700">{monthLabel}</span>
            <button
              type="button"
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600"
              onClick={() =>
                setViewDate(new Date(year, month + 1, 1))
              }
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-slate-400 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d} className="text-center py-0.5">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((ymd, idx) =>
              ymd ? (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => onDayClick(ymd)}
                  className={`h-8 rounded-md text-xs font-semibold transition-colors ${
                    ymd === draftStart || ymd === draftEnd
                      ? "bg-indigo-600 text-white"
                      : inRange(ymd)
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {Number(ymd.split("-")[2])}
                </button>
              ) : (
                <span key={`empty-${idx}`} />
              )
            )}
          </div>

          <p className="mt-2 text-[10px] text-slate-500">
            Select start date, then end date on the calendar.
          </p>
        </div>
      )}
    </div>
  );
}