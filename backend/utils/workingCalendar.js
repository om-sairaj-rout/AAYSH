const {
  TIMEZONE,
  toISTDate,
  parseISTDate,
  startOfDayIST,
} = require("./dateTime");
const { isConfiguredGovernmentHoliday } = require("../config/governmentHolidays");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * SLA / TAT working-time rules (IST):
 * - Each calendar hour on a working day counts (24 hours/day, not 8/10-hour shifts).
 * - Saturday counts normally.
 * - Sunday = 0 counted hours.
 * - Government holidays (governmentHolidays.js) = 0 counted hours.
 * - TAT budgets (expectedHours) are expressed in these working hours.
 */

const isValidDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return d instanceof Date && !Number.isNaN(d.getTime());
};

const isSundayIST = (value) => {
  if (!isValidDate(value)) return false;

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(value instanceof Date ? value : new Date(value));

  return weekday === "Sun";
};

const isGovernmentHolidayIST = (value) => {
  const istDateStr = toISTDate(value);
  if (!istDateStr) return false;
  return isConfiguredGovernmentHoliday(istDateStr);
};

const isWorkingDayIST = (value) => {
  if (!isValidDate(value)) return false;
  if (isSundayIST(value)) return false;
  if (isGovernmentHolidayIST(value)) return false;
  return true;
};

const addOneISTDay = (istDateStr) => {
  const dayStart = parseISTDate(istDateStr);
  if (!dayStart) return null;
  return toISTDate(new Date(dayStart.getTime() + DAY_MS));
};

/** Start of the next IST calendar day (exclusive end boundary for hour counting). */
const startOfNextISTDay = (value) => {
  const istDateStr = toISTDate(value);
  if (!istDateStr) return null;
  const nextDate = addOneISTDay(istDateStr);
  if (!nextDate) return null;
  return parseISTDate(nextDate);
};

const advanceToNextWorkingDayStart = (value) => {
  let cursor = startOfDayIST(value);
  if (!cursor) return null;

  for (let i = 0; i < 366; i += 1) {
    if (isWorkingDayIST(cursor)) {
      return cursor;
    }
    const nextDate = addOneISTDay(toISTDate(cursor));
    if (!nextDate) return null;
    cursor = parseISTDate(nextDate);
  }

  return cursor;
};

/**
 * Count working hours between two instants.
 * Skips all hours that fall on Sundays or configured government holidays.
 */
const countWorkingHoursBetween = (start, end) => {
  if (!isValidDate(start) || !isValidDate(end)) return 0;

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  if (endDate.getTime() <= startDate.getTime()) return 0;

  let current = new Date(startDate);
  let totalHours = 0;

  while (current.getTime() < endDate.getTime()) {
    if (!isWorkingDayIST(current)) {
      const nextStart = startOfNextISTDay(current);
      if (!nextStart) break;
      current = nextStart;
      continue;
    }

    const dayEndExclusive = startOfNextISTDay(current);
    if (!dayEndExclusive) break;

    const periodEndMs = Math.min(endDate.getTime(), dayEndExclusive.getTime());
    const periodStartMs = current.getTime();

    if (periodEndMs > periodStartMs) {
      totalHours += Math.floor((periodEndMs - periodStartMs) / HOUR_MS);
    }

    if (periodEndMs >= endDate.getTime()) break;

    current = dayEndExclusive;
  }

  return Math.max(0, totalHours);
};

/**
 * Add working hours to a start instant.
 * Uses the same day/hour rules as countWorkingHoursBetween().
 */
const addWorkingHours = (start, hours) => {
  if (!isValidDate(start)) return null;

  const workingHours = Number(hours);
  if (!workingHours || workingHours <= 0) {
    return new Date(start);
  }

  let remaining = Math.ceil(workingHours);
  let current = new Date(start);

  if (!isWorkingDayIST(current)) {
    const nextWorkingStart = advanceToNextWorkingDayStart(current);
    if (!nextWorkingStart) return new Date(start);
    current = new Date(nextWorkingStart);
  }

  while (remaining > 0) {
    if (!isWorkingDayIST(current)) {
      const nextStart = advanceToNextWorkingDayStart(current);
      if (!nextStart) break;
      current = new Date(nextStart);
      continue;
    }

    const dayEndExclusive = startOfNextISTDay(current);
    if (!dayEndExclusive) break;

    const hoursLeftToday = Math.floor(
      (dayEndExclusive.getTime() - current.getTime()) / HOUR_MS
    );

    if (hoursLeftToday <= 0) {
      current = dayEndExclusive;
      continue;
    }

    if (remaining <= hoursLeftToday) {
      return new Date(current.getTime() + remaining * HOUR_MS);
    }

    remaining -= hoursLeftToday;
    current = dayEndExclusive;
  }

  return current;
};

module.exports = {
  isSundayIST,
  isGovernmentHolidayIST,
  isWorkingDayIST,
  countWorkingHoursBetween,
  addWorkingHours,
};
