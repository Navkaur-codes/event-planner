import type { Timeline } from '@utsav/shared';
import { downloadText, slugify } from './download';

/** Turns a timeline into an iCalendar (.ics) document. */
export type IcsBuilder = (timeline: Timeline, title: string) => string;

/**
 * The engine's `timelineToIcs` (CCR-01, Session A) is re-exported from `@utsav/shared` only at
 * the GATE-3 merge. Until then this stays null and the calendar button is not shown; wiring it is
 * one line: `export const icsBuilder: IcsBuilder | null = timelineToIcs;`.
 */
export const icsBuilder: IcsBuilder | null = null;

/** A download name such as "utsav-aarav-turns-7.ics". */
export function icsFileName(title: string): string {
  return `utsav-${slugify(title, 'timeline')}.ics`;
}

/** Downloads an already-built .ics document. */
export function downloadIcs(ics: string, title: string): void {
  downloadText(ics, icsFileName(title), 'text/calendar;charset=utf-8');
}
