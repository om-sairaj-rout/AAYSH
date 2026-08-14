const TIMEZONE = "Asia/Kolkata";

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const getISTParts = (value) => {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (!isValidDate(d)) return null;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
};

/** Calendar date in IST (YYYY-MM-DD). */
export const toISTDate = (value) => {
  const parts = getISTParts(value);
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
};

/** Full datetime in IST (ISO 8601 with +05:30 offset). */
export const toISTDateTime = (value) => {
  const parts = getISTParts(value);
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+05:30`;
};

export const todayISTDate = () => toISTDate(new Date());

export const startOfDayIST = (value) => {
  const dateOnly = toISTDate(value);
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T00:00:00+05:30`);
};

export const endOfDayIST = (value) => {
  const dateOnly = toISTDate(value);
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T23:59:59.999+05:30`);
};

export const isSameISTDate = (a, b) => toISTDate(a) === toISTDate(b);

export const compareISTDates = (a, b) => {
  const left = toISTDate(a);
  const right = toISTDate(b);
  if (!left || !right) return Number.NaN;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

/** DD/MM/YYYY in IST. */
export const formatDisplayDate = (value) => {
  const dateOnly = toISTDate(value);
  if (!dateOnly) return "-";
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
};

/** DD/MM/YYYY, hh:mm AM/PM IST. */
export const formatDisplayDateTime = (value) => {
  const parts = getISTParts(value);
  if (!parts) return "-";

  const hour24 = Number(parts.hour);
  const hour12 = hour24 % 12 || 12;
  const meridiem = hour24 >= 12 ? "PM" : "AM";

  return `${parts.day}/${parts.month}/${parts.year}, ${String(hour12).padStart(2, "0")}:${parts.minute} ${meridiem} IST`;
};

/** Value for <input type="date"> (YYYY-MM-DD in IST). */
export const toDateInputValue = (value) => toISTDate(value) || "";

// Backward-compatible aliases
export const toISODateOnly = toISTDate;
export const todayISODateOnly = todayISTDate;
export const isSameISODate = isSameISTDate;
export const compareISODates = compareISTDates;
