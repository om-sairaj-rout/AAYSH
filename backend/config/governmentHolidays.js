/**
 * Indian national / central government holidays for SLA working-time calculations.
 * All dates are interpreted in Asia/Kolkata (IST).
 *
 * - FIXED_ANNUAL_HOLIDAYS: recurring MM-DD (independent of year)
 * - SPECIFIC_HOLIDAYS: one-off or movable holidays as YYYY-MM-DD
 *
 * Extend SPECIFIC_HOLIDAYS annually as gazette notifications are published.
 */

const FIXED_ANNUAL_HOLIDAYS = [
  "01-26", // Republic Day
  "08-15", // Independence Day
  "10-02", // Gandhi Jayanti
  "12-25", // Christmas
];

const SPECIFIC_HOLIDAYS = [
  // 2025
  "2025-03-14", // Holi
  "2025-03-31", // Id-ul-Fitr
  "2025-04-14", // Dr. Ambedkar Jayanti
  "2025-04-18", // Good Friday
  "2025-06-07", // Id-ul-Adha
  "2025-07-06", // Muharram
  "2025-08-16", // Janmashtami
  "2025-09-05", // Milad-un-Nabi
  "2025-10-20", // Diwali
  "2025-11-05", // Guru Nanak Jayanti
  // 2026
  "2026-03-03", // Holi
  "2026-03-21", // Id-ul-Fitr
  "2026-04-03", // Good Friday
  "2026-05-27", // Id-ul-Adha
  "2026-06-26", // Muharram
  "2026-09-04", // Milad-un-Nabi
  "2026-10-20", // Dussehra
  "2026-11-08", // Diwali
  "2026-11-24", // Guru Nanak Jayanti
  // 2027
  "2027-03-22", // Holi
  "2027-03-10", // Id-ul-Fitr
  "2027-03-26", // Good Friday
];

const specificHolidaySet = new Set(SPECIFIC_HOLIDAYS);
const fixedAnnualSet = new Set(FIXED_ANNUAL_HOLIDAYS);

const isFixedAnnualHoliday = (istDateStr) => {
  if (!istDateStr || istDateStr.length < 10) return false;
  const monthDay = istDateStr.slice(5, 10);
  return fixedAnnualSet.has(monthDay);
};

const isSpecificHoliday = (istDateStr) => specificHolidaySet.has(istDateStr);

const isConfiguredGovernmentHoliday = (istDateStr) =>
  isFixedAnnualHoliday(istDateStr) || isSpecificHoliday(istDateStr);

module.exports = {
  FIXED_ANNUAL_HOLIDAYS,
  SPECIFIC_HOLIDAYS,
  isFixedAnnualHoliday,
  isSpecificHoliday,
  isConfiguredGovernmentHoliday,
};
