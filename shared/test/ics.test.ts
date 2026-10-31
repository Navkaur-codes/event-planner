import { describe, expect, it } from 'vitest';
import type { Timeline } from '../src/contracts.js';
import { escapeText, foldLine } from '../src/engine/ics.js';
import { buildPlan, timelineToIcs } from '../src/engine/index.js';
import { makeInput, TODAY } from './fixtures.js';

const timeline: Timeline = {
  compressed: false,
  milestones: [
    {
      id: 'm-venue',
      title: 'Book the venue',
      dueDate: '2026-11-25',
      daysBefore: 25,
      category: 'venue',
      done: false,
    },
    {
      id: 'm-confirm',
      title: 'Confirm RSVPs and vendors',
      dueDate: '2026-12-31',
      daysBefore: 1,
      category: 'planning',
      done: true,
    },
    {
      id: 'm-day',
      title: 'Run the day',
      dueDate: '2027-01-01',
      daysBefore: 0,
      category: 'planning',
      done: false,
    },
  ],
};

/** Unfolds continuation lines, as a calendar app would. */
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

describe('timelineToIcs', () => {
  const ics = timelineToIcs(timeline, 'Aarav turns 7');

  it('wraps everything in a VCALENDAR with the required properties', () => {
    const lines = ics.split('\r\n');
    expect(lines.slice(0, 3)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      expect.stringMatching(/^PRODID:/),
    ]);
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(lines.at(-1)).toBe('');
  });

  it('uses CRLF line endings only', () => {
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  it('emits one all-day event per milestone, ending the next day', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(3);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261125\r\nDTEND;VALUE=DATE:20261126');
    // Year rollover: 31 Dec ends on 1 Jan.
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101');
  });

  it('describes when each milestone is due', () => {
    const text = unfold(ics);
    expect(text).toContain('DESCRIPTION:Due 25 days before the event. Planned with Utsav.');
    expect(text).toContain('DESCRIPTION:Due 1 day before the event.');
    expect(text).toContain('DESCRIPTION:Due on the day of the event.');
    expect(text).toContain('SUMMARY:Book the venue – Aarav turns 7');
  });

  it('is deterministic, with DTSTAMP taken from the earliest due date', () => {
    expect(timelineToIcs(timeline, 'Aarav turns 7')).toBe(ics);
    expect(ics.match(/DTSTAMP:20261125T000000Z/g)).toHaveLength(3);
  });

  it('derives stable, distinct UIDs from milestone id and title', () => {
    const uids = ics.match(/^UID:.*$/gm) ?? [];
    expect(new Set(uids).size).toBe(3);
    expect(uids[0]).toMatch(/^UID:m-venue-[0-9a-f]{8}@utsav\r?$/);
    const other = timelineToIcs(timeline, 'Another party').match(/^UID:.*$/gm) ?? [];
    expect(other[0]).not.toBe(uids[0]);
  });

  it('escapes user text in the title', () => {
    const tricky = timelineToIcs(timeline, 'Riya; Sam, & co\\ \nEND:VCALENDAR');
    const text = unfold(tricky);
    expect(text).toContain('X-WR-CALNAME:Riya\\; Sam\\, & co\\\\ \\nEND:VCALENDAR');
    // The injected END:VCALENDAR never becomes a line of its own.
    expect(tricky.split('\r\n').filter((l) => l === 'END:VCALENDAR')).toHaveLength(1);
  });

  it('produces an empty but valid calendar for an empty timeline', () => {
    const empty = timelineToIcs({ milestones: [], compressed: false }, 'Nothing yet');
    expect(empty).not.toContain('VEVENT');
    expect(empty).toContain('X-WR-CALNAME:Nothing yet');
  });

  it('exports a real engine timeline', () => {
    const plan = buildPlan(makeInput({ eventType: 'wedding', eventDate: '2027-06-01' }), TODAY);
    const out = timelineToIcs(plan.timeline, plan.input.title);
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(plan.timeline.milestones.length);
  });
});

describe('escapeText', () => {
  it('escapes backslash, semicolon, comma and every newline form', () => {
    expect(escapeText('a\\b;c,d\r\ne\nf\rg')).toBe('a\\\\b\\;c\\,d\\ne\\nf\\ng');
  });

  it('drops other control characters', () => {
    expect(escapeText('tab\there\u0007')).toBe('tabhere');
  });
});

describe('foldLine', () => {
  // UTF-8 byte length: each %XX escape is one octet.
  const octets = (s: string) => encodeURIComponent(s).replace(/%[0-9A-F]{2}/g, '.').length;

  it('leaves lines of 75 octets or fewer alone', () => {
    const line = 'X'.repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it('folds long ASCII lines at 75 octets with a leading space on continuations', () => {
    const folded = foldLine(`SUMMARY:${'a'.repeat(200)}`);
    const physical = folded.split('\r\n');
    expect(physical.length).toBeGreaterThan(1);
    expect(physical.every((l) => octets(l) <= 75)).toBe(true);
    expect(physical.slice(1).every((l) => l.startsWith(' '))).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'a'.repeat(200)}`);
  });

  it('never splits a multi-byte character', () => {
    const line = `SUMMARY:${'शादी 🎉 café '.repeat(20)}`;
    const physical = foldLine(line).split('\r\n');
    expect(physical.length).toBeGreaterThan(1);
    expect(physical.every((l) => octets(l) <= 75)).toBe(true);
    // A split surrogate pair would make encodeURIComponent throw.
    expect(() => physical.forEach((l) => encodeURIComponent(l))).not.toThrow();
    expect(foldLine(line).replace(/\r\n /g, '')).toBe(line);
  });
});
