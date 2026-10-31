import { timelineToIcs, type Timeline } from '@utsav/shared';
import { downloadText, slugify } from './download';

/** Turns a timeline into an iCalendar (.ics) document. */
export type IcsBuilder = (timeline: Timeline, title: string) => string;

/** The engine's RFC 5545 builder; `null` would hide the calendar button. */
export const icsBuilder: IcsBuilder | null = timelineToIcs;

/** A download name such as "utsav-aarav-turns-7.ics". */
export function icsFileName(title: string): string {
  return `utsav-${slugify(title, 'timeline')}.ics`;
}

/** Downloads an already-built .ics document. */
export function downloadIcs(ics: string, title: string): void {
  downloadText(ics, icsFileName(title), 'text/calendar;charset=utf-8');
}
