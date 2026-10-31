/**
 * Decides which calendar day a request is planned for. People plan in their own time zone,
 * so the browser's local date wins — but only within one day of the server's UTC date, which
 * covers every real time zone and stops a client from planning "in the past".
 */
const DAY_MS = 86_400_000;
export const CLIENT_TODAY_TOLERANCE_DAYS = 1;

/**
 * Returns the `today` to plan with: midnight UTC of `clientToday` when it is a plausible
 * local date for `serverNow`, otherwise `serverNow` itself. Pure.
 */
export function resolveToday(clientToday: string | undefined, serverNow: Date): Date {
  if (!clientToday) return serverNow;
  const clientDay = Date.parse(`${clientToday}T00:00:00Z`);
  if (Number.isNaN(clientDay)) return serverNow;
  const serverDay = Date.UTC(
    serverNow.getUTCFullYear(),
    serverNow.getUTCMonth(),
    serverNow.getUTCDate(),
  );
  const withinTolerance = Math.abs(clientDay - serverDay) <= CLIENT_TODAY_TOLERANCE_DAYS * DAY_MS;
  return withinTolerance ? new Date(clientDay) : serverNow;
}
