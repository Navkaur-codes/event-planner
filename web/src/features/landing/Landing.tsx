import type { EventType, HealthResponse } from '@utsav/shared';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { getHealth } from '../../api/client';
import { EVENT_LABELS, formatDate, formatMoney } from '../../lib/labels';
import type { LibraryEntry, SavedPlan } from '../../state/storage';
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
  /** Plans saved in this browser, newest first. */
  plans: readonly LibraryEntry[];
  onOpenSaved: (entry: LibraryEntry) => void;
  onDeleteSaved: (id: string) => void;
  onImported: (saved: SavedPlan) => void;
}

/** Landing page: event cards that start the wizard, the plans saved here, and the status. */
export function Landing({ onStart, plans, onOpenSaved, onDeleteSaved, onImported }: LandingProps) {
  const [state, setState] = useState<HealthState>({ kind: 'loading' });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const plansHeadingRef = useRef<HTMLHeadingElement>(null);
  const planCount = useRef(plans.length);

  // After a delete the card is gone, so move focus somewhere sensible instead of <body>.
  useEffect(() => {
    if (plans.length < planCount.current) {
      (plans.length > 0 ? plansHeadingRef.current : titleRef.current)?.focus();
    }
    planCount.current = plans.length;
  }, [plans.length]);

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
        <h1 ref={titleRef} tabIndex={-1}>
          <span className="hero__mark">Utsav</span>
        </h1>
        <p>
          Plan your celebration with a budget that adds up, a timeline that works backwards from the
          big day, a vendor checklist, and ideas made just for you.
        </p>
      </header>

      {/* Returning visitors see their own plans first, as a full-width row. */}
      {plans.length > 0 && (
        <SavedPlans
          plans={plans}
          onOpen={onOpenSaved}
          onDelete={onDeleteSaved}
          headingRef={plansHeadingRef}
        />
      )}
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

interface SavedPlansProps {
  plans: readonly LibraryEntry[];
  onOpen: (entry: LibraryEntry) => void;
  onDelete: (id: string) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

/** "Your plans": every plan saved in this browser, newest first, to reopen or delete. */
function SavedPlans({ plans, onOpen, onDelete, headingRef }: SavedPlansProps) {
  return (
    <section className="saved-plans sticker" aria-labelledby="saved-plans-title">
      <h2 id="saved-plans-title" ref={headingRef} tabIndex={-1}>
        Your plans
      </h2>
      <p className="saved-plans__lead">Saved in this browser only.</p>
      <ul>
        {plans.map((entry) => (
          <SavedPlanCard key={entry.id} entry={entry} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </ul>
    </section>
  );
}

interface SavedPlanCardProps {
  entry: LibraryEntry;
  onOpen: (entry: LibraryEntry) => void;
  onDelete: (id: string) => void;
}

/** One saved plan. Deleting asks first, inline, and keeps keyboard focus in place. */
function SavedPlanCard({ entry, onOpen, onDelete }: SavedPlanCardProps) {
  const [confirming, setConfirming] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  const { input, budget } = entry.plan.response.plan;

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
    else if (wasConfirming.current) deleteRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  return (
    <li className="saved-plan" data-event={input.eventType}>
      <p className="saved-plan__kicker">{EVENT_LABELS[input.eventType]}</p>
      <h3>{input.title}</h3>
      <p className="saved-plan__meta">
        {formatDate(input.eventDate)} · {input.city} · {formatMoney(budget.total, budget.currency)}
      </p>
      {confirming ? (
        <div
          className="saved-plan__confirm"
          role="group"
          aria-label={`Delete plan ${input.title}?`}
        >
          <p>Delete this plan from this browser?</p>
          <div className="saved-plan__actions">
            <button
              type="button"
              className="button button--danger"
              onClick={() => onDelete(entry.id)}
            >
              Yes, delete
            </button>
            <button
              ref={keepRef}
              type="button"
              className="link-button"
              onClick={() => setConfirming(false)}
            >
              Keep
            </button>
          </div>
        </div>
      ) : (
        <div className="saved-plan__actions">
          <button
            type="button"
            className="button button--primary"
            aria-label={`Open plan ${input.title}`}
            onClick={() => onOpen(entry)}
          >
            Open
          </button>
          <button
            ref={deleteRef}
            type="button"
            className="link-button"
            aria-label={`Delete plan ${input.title}`}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        </div>
      )}
    </li>
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
