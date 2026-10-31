import type { EventInput, Milestone, Timeline } from '../contracts.js';
import { dateToDay, dayToIso, isoToDay } from './dates.js';
import { MILESTONES } from './rules/milestones.js';

/**
 * Builds the milestone timeline by counting back from the event date. When the event is
 * closer than the template's longest lead time, every lead time is scaled into the days that
 * remain (`compressed: true`), so no milestone is ever due before `today`.
 */
export function buildTimeline(
  input: Pick<EventInput, 'eventType' | 'eventDate'>,
  today: Date,
): Timeline {
  const rules = MILESTONES[input.eventType];
  const eventDay = isoToDay(input.eventDate);
  const daysLeft = Math.max(0, eventDay - dateToDay(today));
  const longestLead = Math.max(...rules.map((r) => r.daysBefore));
  const compressed = longestLead > daysLeft;

  const milestones: Milestone[] = rules.map((rule) => {
    const daysBefore = compressed
      ? Math.round((rule.daysBefore * daysLeft) / longestLead)
      : rule.daysBefore;
    return {
      id: rule.id,
      title: rule.title,
      dueDate: dayToIso(eventDay - daysBefore),
      daysBefore,
      category: rule.category,
      done: false,
    };
  });

  // dueDate ascending == daysBefore descending; the stable sort keeps template order on ties.
  milestones.sort((a, b) => b.daysBefore - a.daysBefore);
  return { milestones, compressed };
}
