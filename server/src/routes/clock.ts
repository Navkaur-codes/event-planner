/** The request clock: the only place routes read the current time. */
export function now(): Date {
  return new Date();
}
