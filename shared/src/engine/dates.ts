/**
 * ISO date helpers. Dates are handled as whole UTC "epoch days" so that time zones and
 * daylight-saving shifts can never move a due date by one day.
 */
const DAY_MS = 86_400_000;

/** Converts an ISO `YYYY-MM-DD` string to a UTC epoch-day number. */
export function isoToDay(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

/** Returns the UTC epoch-day number of a `Date` (time of day is ignored). */
export function dateToDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS);
}

/** Converts a UTC epoch-day number back to an ISO `YYYY-MM-DD` string. */
export function dayToIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `today` until the ISO `eventDate` (negative if it is in the past). */
export function daysUntil(eventDate: string, today: Date): number {
  return isoToDay(eventDate) - dateToDay(today);
}
