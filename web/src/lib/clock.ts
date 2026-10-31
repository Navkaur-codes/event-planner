const DAY_MS = 86_400_000;

/** The single clock of the web app, so tests can pin "today" with fake timers. */
export function now(): Date {
  return new Date();
}

/** Today's local calendar date as ISO `YYYY-MM-DD`. */
export function todayIso(at: Date = now()): string {
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${at.getFullYear()}-${month}-${day}`;
}

/** Whole days from `fromIso` to `toIso` (both ISO dates); negative when `toIso` is earlier. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS,
  );
}
