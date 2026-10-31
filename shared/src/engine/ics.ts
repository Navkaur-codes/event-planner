/**
 * iCalendar (RFC 5545) export of a plan's timeline, so milestones can be added to any calendar
 * app. Pure: the output depends only on the timeline and the title, never on the clock.
 */
import type { Milestone, Timeline } from '../contracts.js';
import { dayToIso, isoToDay } from './dates.js';

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;
const PRODID = '-//Utsav//Celebration and Event Planner//EN';

/**
 * Converts a timeline into an `.ics` calendar: one all-day event per milestone. `DTSTAMP` is
 * the earliest due date (the day the plan starts) so identical inputs give identical files,
 * and each `UID` is derived from the milestone id and the event title so re-imports update
 * rather than duplicate events.
 */
export function timelineToIcs(timeline: Timeline, title: string): string {
  const firstDue = timeline.milestones.map((m) => m.dueDate).sort()[0];
  const stamp = firstDue ? `${compactDate(firstDue)}T000000Z` : '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(title)}`,
    ...timeline.milestones.flatMap((m) => milestoneEvent(m, title, stamp)),
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

function milestoneEvent(milestone: Milestone, title: string, stamp: string): string[] {
  const day = isoToDay(milestone.dueDate);
  const when =
    milestone.daysBefore === 0
      ? 'Due on the day of the event.'
      : `Due ${milestone.daysBefore} day${milestone.daysBefore === 1 ? '' : 's'} before the event.`;
  return [
    'BEGIN:VEVENT',
    `UID:${milestone.id}-${hash(`${milestone.id}|${title}`)}@utsav`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compactDate(dayToIso(day))}`,
    `DTEND;VALUE=DATE:${compactDate(dayToIso(day + 1))}`,
    `SUMMARY:${escapeText(`${milestone.title} – ${title}`)}`,
    `DESCRIPTION:${escapeText(`${when} Planned with Utsav.`)}`,
    `CATEGORIES:${escapeText(milestone.category)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ];
}

/** `YYYY-MM-DD` → `YYYYMMDD` (the iCalendar DATE form). */
function compactDate(iso: string): string {
  return iso.replaceAll('-', '');
}

/** Escapes an iCalendar TEXT value (RFC 5545 §3.3.11) and drops other control characters. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/\p{Cc}/gu, '');
}

/**
 * Folds a content line so no physical line exceeds 75 octets of UTF-8 (RFC 5545 §3.1).
 * Continuation lines start with one space, and multi-byte characters are never split.
 */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = utf8Length(char);
    // Continuation lines spend one octet on the leading space.
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

function utf8Length(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  return code < 0x10000 ? 3 : 4;
}

/** FNV-1a 32-bit hash as 8 hex characters: short, stable ids without any crypto dependency. */
function hash(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
