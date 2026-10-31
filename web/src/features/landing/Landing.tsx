import type { EventType, HealthResponse } from '@utsav/shared';
import { useEffect, useState } from 'react';
import { getHealth } from '../../api/client';

const EVENT_CARDS: ReadonlyArray<{ type: EventType; title: string; blurb: string; cta: string }> = [
  {
    type: 'wedding',
    title: 'Weddings',
    blurb: 'Ceremonies, mehendi to reception — budget, vendors and rituals in one plan.',
    cta: 'Plan a wedding',
  },
  {
    type: 'birthday',
    title: 'Birthdays',
    blurb: 'From first birthdays to fiftieths — themes, cake, games and a guest-ready timeline.',
    cta: 'Plan a birthday',
  },
  {
    type: 'community',
    title: 'Community events',
    blurb: 'Festivals, fundraisers and meet-ups — permits, logistics and volunteers sorted.',
    cta: 'Plan a community event',
  },
];

type HealthState =
  { kind: 'loading' } | { kind: 'ready'; health: HealthResponse } | { kind: 'error' };

interface LandingProps {
  onStart: (eventType: EventType) => void;
  /** Title of a saved plan, offered as "continue". */
  savedTitle: string | null;
  onOpenSaved: () => void;
}

/** Landing page: three event cards that start the wizard, plus the planner status. */
export function Landing({ onStart, savedTitle, onOpenSaved }: LandingProps) {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal)
      .then((health) => setState({ kind: 'ready', health }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ kind: 'error' });
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <header className="hero">
        <h1>
          <span className="hero__mark">Utsav</span>
        </h1>
        <p>
          Plan your celebration with a budget that adds up, a timeline that works backwards from the
          big day, a vendor checklist, and ideas made just for you.
        </p>
        {savedTitle && (
          <p className="hero__continue">
            <button type="button" className="button button--ghost" onClick={onOpenSaved}>
              Continue “{savedTitle}”
            </button>
          </p>
        )}
      </header>

      <ul className="event-cards" aria-label="Events Utsav can plan">
        {EVENT_CARDS.map((card) => (
          <li key={card.type} className="sticker event-card" data-event={card.type}>
            <h2>{card.title}</h2>
            <p>{card.blurb}</p>
            <button
              type="button"
              className="button button--primary event-card__cta"
              onClick={() => onStart(card.type)}
            >
              {card.cta} <span aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>

      <footer className="site-footer">
        <p className="status-pill" role="status" aria-live="polite">
          {statusText(state)}
        </p>
      </footer>
    </>
  );
}

function statusText(state: HealthState): string {
  switch (state.kind) {
    case 'loading':
      return 'Checking the planner…';
    case 'error':
      return 'Planner is offline right now — please try again soon.';
    case 'ready':
      return `Planner ready · v${state.health.version}${state.health.aiConfigured ? ' · AI ideas on' : ''}`;
  }
}
