const TIMEZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

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
const toISTDate = (value) => {
  const parts = getISTParts(value);
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
};

/** Full datetime in IST (ISO 8601 with +05:30 offset). */
const toISTDateTime = (value) => {
  const parts = getISTParts(value);
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${IST_OFFSET}`;
};

/** Parse YYYY-MM-DD (or datetime) as start of day in IST. */
const parseISTDate = (value) => {
  if (value == null || value === "") return null;

  const str = String(value).trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const date = new Date(`${year}-${month}-${day}T00:00:00${IST_OFFSET}`);
    if (!isValidDate(date)) return null;
    if (toISTDate(date) !== `${year}-${month}-${day}`) return null;
    return date;
  }

  const parsed = new Date(str);
  if (!isValidDate(parsed)) return null;
  return startOfDayIST(parsed);
};

const parseISTDateTime = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;
  const d = new Date(value);
  return isValidDate(d) ? d : null;
};

const startOfDayIST = (value) => {
  const dateOnly = toISTDate(value);
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T00:00:00${IST_OFFSET}`);
};

const endOfDayIST = (value) => {
  const dateOnly = toISTDate(value);
  if (!dateOnly) return null;
  return new Date(`${dateOnly}T23:59:59.999${IST_OFFSET}`);
};

const now = () => new Date();

const nowISTDateTime = () => toISTDateTime(new Date());

const todayISTDate = () => toISTDate(new Date());

const startOfTodayIST = () => startOfDayIST(new Date());

const startOfTomorrowIST = () => {
  const today = startOfTodayIST();
  if (!today) return null;
  return new Date(today.getTime() + 24 * 60 * 60 * 1000);
};

const isSameISTDate = (a, b) => toISTDate(a) === toISTDate(b);

const compareISTDates = (a, b) => {
  const left = toISTDate(a);
  const right = toISTDate(b);
  if (!left || !right) return Number.NaN;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

/** DD/MM/YYYY in IST. */
const formatDisplayDate = (value) => {
  const dateOnly = toISTDate(value);
  if (!dateOnly) return "-";
  const [year, month, day] = dateOnly.split("-");
  return `${day}/${month}/${year}`;
};

/** DD/MM/YYYY, hh:mm AM/PM IST. */
const formatDisplayDateTime = (value) => {
  const parts = getISTParts(value);
  if (!parts) return "-";

  const hour24 = Number(parts.hour);
  const hour12 = hour24 % 12 || 12;
  const meridiem = hour24 >= 12 ? "PM" : "AM";

  return `${parts.day}/${parts.month}/${parts.year}, ${String(hour12).padStart(2, "0")}:${parts.minute} ${meridiem} IST`;
};

const DATE_ONLY_KEYS = new Set([
  "orderDate",
  "pickupDate",
  "deliveryDate",
  "uploadDate",
]);

const DATE_TIME_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "bookedAt",
  "pickedUpAt",
  "shippedAt",
  "inTransitAt",
  "outForDeliveryAt",
  "deliveredAt",
  "cancelledAt",
  "rtoAt",
  "returnedAt",
  "exchangeAt",
  "delayedAt",
  "pickupCancelledAt",
  "eventTime",
]);

const formatValueForIST = (key, value) => {
  if (value == null || value === "") return value;
  if (DATE_ONLY_KEYS.has(key)) return toISTDate(value);
  if (DATE_TIME_KEYS.has(key)) return toISTDateTime(value);
  return value;
};

const isObjectId = (value) =>
  value != null &&
  typeof value === "object" &&
  value.constructor?.name === "ObjectId" &&
  typeof value.toString === "function";

/** Recursively format known date fields in API payloads to IST strings. */
const formatDatesInObject = (value) => {
  if (value == null) return value;
  if (value instanceof Date) return toISTDateTime(value);
  if (isObjectId(value)) return value.toString();
  if (Array.isArray(value)) return value.map((item) => formatDatesInObject(item));

  if (typeof value !== "object") return value;

  const formatted = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue instanceof Date) {
      formatted[key] = formatValueForIST(key, nestedValue);
      continue;
    }

    if (isObjectId(nestedValue)) {
      formatted[key] = nestedValue.toString();
      continue;
    }

    if (
      typeof nestedValue === "string" &&
      (DATE_ONLY_KEYS.has(key) || DATE_TIME_KEYS.has(key)) &&
      !Number.isNaN(new Date(nestedValue).getTime())
    ) {
      formatted[key] = formatValueForIST(key, nestedValue);
      continue;
    }

    if (typeof nestedValue === "object" && nestedValue !== null) {
      formatted[key] = formatDatesInObject(nestedValue);
      continue;
    }

    formatted[key] = nestedValue;
  }

  return formatted;
};

// Backward-compatible aliases
const toISODateOnly = toISTDate;
const parseISODateOnly = parseISTDate;
const parseISODateTime = parseISTDateTime;
const toISO = toISTDateTime;
const nowISO = nowISTDateTime;
const todayISODateOnly = todayISTDate;
const isSameISODate = isSameISTDate;
const compareISODates = compareISTDates;

module.exports = {
  TIMEZONE,
  toISTDate,
  toISTDateTime,
  parseISTDate,
  parseISTDateTime,
  startOfDayIST,
  endOfDayIST,
  now,
  nowISTDateTime,
  todayISTDate,
  startOfTodayIST,
  startOfTomorrowIST,
  isSameISTDate,
  compareISTDates,
  formatDisplayDate,
  formatDisplayDateTime,
  formatDatesInObject,
  // aliases
  toISODateOnly,
  parseISODateOnly,
  parseISODateTime,
  toISO,
  nowISO,
  todayISODateOnly,
  isSameISODate,
  compareISODates,
};
