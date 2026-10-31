import { describe, expect, it } from 'vitest';
import { EventTypeSchema } from '../src/contracts.js';
import { dayToIso, isoToDay } from '../src/engine/dates.js';
import { buildTimeline } from '../src/engine/timeline.js';
import { MILESTONES } from '../src/engine/rules/milestones.js';
import { TODAY } from './fixtures.js';

const TODAY_ISO = '2026-10-31';
const OFFSETS = [0, 1, 7, 13, 14, 29, 30, 31, 59, 60, 61, 179, 180, 365];

describe('timeline', () => {
  it.each(EventTypeSchema.options)(
    '%s: sorted, inside [today, eventDate], compressed only when needed',
    (eventType) => {
      const longestLead = Math.max(...MILESTONES[eventType].map((m) => m.daysBefore));
      for (const offset of OFFSETS) {
        const eventDate = dayToIso(isoToDay(TODAY_ISO) + offset);
        const { milestones, compressed } = buildTimeline({ eventType, eventDate }, TODAY);

        expect(compressed).toBe(longestLead > offset);
        expect(milestones).toHaveLength(MILESTONES[eventType].length);
        const dates = milestones.map((m) => m.dueDate);
        expect(dates).toEqual([...dates].sort());
        for (const m of milestones) {
          expect(m.dueDate >= TODAY_ISO && m.dueDate <= eventDate).toBe(true);
          expect(dayToIso(isoToDay(eventDate) - m.daysBefore)).toBe(m.dueDate);
          expect(m.done).toBe(false);
        }
      }
    },
  );

  it('uses template lead times as-is when there is enough time', () => {
    const { milestones } = buildTimeline({ eventType: 'birthday', eventDate: '2026-12-20' }, TODAY);
    expect(milestones[0]).toMatchObject({
      id: 'm-guestlist',
      daysBefore: 30,
      dueDate: '2026-11-20',
    });
  });

  it('scales lead times proportionally into the days left', () => {
    // 90 days left for a 180-day wedding template: every lead time halves.
    const { milestones, compressed } = buildTimeline(
      { eventType: 'wedding', eventDate: '2027-01-29' },
      TODAY,
    );
    expect(compressed).toBe(true);
    expect(milestones[0]).toMatchObject({ id: 'm-budget', daysBefore: 90, dueDate: TODAY_ISO });
    expect(milestones.find((m) => m.id === 'm-invites')?.daysBefore).toBe(30);
  });

  it('puts every milestone on the day itself when the event is today', () => {
    const { milestones } = buildTimeline({ eventType: 'community', eventDate: TODAY_ISO }, TODAY);
    expect(milestones.every((m) => m.dueDate === TODAY_ISO && m.daysBefore === 0)).toBe(true);
  });

  it('crosses a year boundary and a leap day correctly', () => {
    const newYear = buildTimeline(
      { eventType: 'birthday', eventDate: '2027-01-05' },
      new Date('2026-12-01T00:00:00Z'),
    );
    expect(newYear.milestones[0]?.dueDate).toBe('2026-12-06');
    const leap = buildTimeline(
      { eventType: 'birthday', eventDate: '2028-03-02' },
      new Date('2028-01-01T00:00:00Z'),
    );
    expect(leap.milestones.find((m) => m.id === 'm-confirm')?.dueDate).toBe('2028-02-29');
  });
});
