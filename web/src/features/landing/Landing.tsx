import type { EventType, HealthResponse } from '@utsav/shared';
import { useEffect, useState } from 'react';
import { getHealth } from '../../api/client';
import type { SavedPlan } from '../../state/storage';
import { ImportPlanButton } from '../track/ImportPlanButton';

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

const HOW_IT_WORKS: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: 'The engine does the maths',
    text: 'Budget split, timeline and vendor checklist come from tested rules — every rupee adds up to your total and every date works back from the big day. No guesswork, even if the AI is down.',
  },
  {
    title: 'The AI adds the personal touch',
    text: 'A language model writes themes, menus and activities for your vibe, guests and traditions, and turns plain words like “cut 20%” into a safe, checked change. It never sets prices or dates.',
  },
  {
    title: 'Your plan stays with you',
    text: 'No sign-up and no database: your plan, ticks and spending live in this browser. Download it as a file, print it, or import it on another device.',
  },
];

type HealthState =
  { kind: 'loading' } | { kind: 'ready'; health: HealthResponse } | { kind: 'error' };

interface LandingProps {
  onStart: (eventType: EventType) => void;
  /** Title of a saved plan, offered as "continue". */
  savedTitle: string | null;
  onOpenSaved: () => void;
  onImported: (saved: SavedPlan) => void;
}

/** Landing page: three event cards that start the wizard, plus the planner status. */
export function Landing({ onStart, savedTitle, onOpenSaved, onImported }: LandingProps) {
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

      <section className="how-it-works" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol>
          {HOW_IT_WORKS.map((step, index) => (
            <li key={step.title} className="how-card">
              <span className="how-card__icon" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-import" aria-labelledby="import-title">
        <h2 id="import-title">Have a saved plan file?</h2>
        <ImportPlanButton onImported={onImported} />
      </section>

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
