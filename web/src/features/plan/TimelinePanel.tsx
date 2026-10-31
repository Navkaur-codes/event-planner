import type { Timeline } from '@utsav/shared';
import { daysBetween } from '../../lib/clock';
import { CATEGORY_LABELS, formatDate } from '../../lib/labels';

/** Human countdown, e.g. "in 12 days", "today", "3 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 0) return `in ${days} days`;
  return days === -1 ? 'yesterday' : `${-days} days ago`;
}

/** Milestones in date order, worked backwards from the event day. */
export function TimelinePanel({ timeline, today }: { timeline: Timeline; today: string }) {
  return (
    <section className="panel" aria-labelledby="timeline-title">
      <h2 id="timeline-title">Timeline</h2>
      {timeline.compressed && (
        <p className="notice notice--warn">
          <span aria-hidden="true">⏱ </span>
          <strong>Tight schedule:</strong> the event is close, so tasks are squeezed together.
        </p>
      )}
      {timeline.milestones.length === 0 ? (
        <p>No milestones yet.</p>
      ) : (
        <ol className="timeline">
          {timeline.milestones.map((milestone) => (
            <li key={milestone.id} className="timeline__item" data-reveal="milestone">
              <time dateTime={milestone.dueDate} className="timeline__date">
                {formatDate(milestone.dueDate)}
              </time>
              <span className="timeline__title">{milestone.title}</span>
              <span className="timeline__meta">
                <span className="tag">{CATEGORY_LABELS[milestone.category]}</span>{' '}
                {relativeDays(daysBetween(today, milestone.dueDate))}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
