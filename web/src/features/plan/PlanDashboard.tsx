import type { BudgetCategory, PlanResponse, RefineResponse } from '@utsav/shared';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { daysBetween, todayIso } from '../../lib/clock';
import { CITY_TIER_LABELS, EVENT_LABELS, formatDate, formatMoney } from '../../lib/labels';
import { celebrate, revealPlan } from '../../motion';
import type { Actuals, SavedPlan } from '../../state/storage';
import type { LastRefine } from '../../state/usePlanStore';
import { RefineBox } from '../refine/RefineBox';
import { PlanTools } from '../track/PlanTools';
import { SpendTracker } from '../track/SpendTracker';
import { BudgetPanel } from './BudgetPanel';
import { ChecklistPanel } from './ChecklistPanel';
import { IdeasPanel } from './IdeasPanel';
import { TimelinePanel } from './TimelinePanel';
import { WhatIfPanel } from './WhatIfPanel';
import { WarningsBanner } from './WarningsBanner';
import './plan.css';

interface PlanDashboardProps {
  response: PlanResponse;
  /** False until the first-plan confetti has played for this plan. */
  celebrated: boolean;
  actuals: Actuals;
  lastRefine: LastRefine | null;
  onCelebrated: () => void;
  onToggleItem: (id: string) => void;
  onRefined: (response: RefineResponse) => void;
  onActualChange: (category: BudgetCategory, amount: number | null) => void;
  onImported: (saved: SavedPlan) => void;
  onEdit: () => void;
  onNewEvent: () => void;
}

function countdownText(days: number): string {
  if (days > 1) return `${days} days to go`;
  if (days === 1) return '1 day to go';
  if (days === 0) return 'It’s today!';
  return 'This date has passed';
}

/** The living plan: countdown, warnings, refine, budget, tracker, timeline, checklist, ideas. */
export default function PlanDashboard({
  response,
  celebrated,
  actuals,
  lastRefine,
  onCelebrated,
  onToggleItem,
  onRefined,
  onActualChange,
  onImported,
  onEdit,
  onNewEvent,
}: PlanDashboardProps) {
  const { plan, ideas, aiStatus } = response;
  const { input } = plan;
  const today = todayIso();
  const daysToGo = daysBetween(today, input.eventDate);
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isFirstReveal] = useState(() => !celebrated);
  const allDone = plan.checklist.length > 0 && plan.checklist.every((item) => item.done);
  const wasAllDone = useRef(allDone);

  // Reveal once per visit to the dashboard; confetti only the first time a plan is shown.
  useLayoutEffect(() => {
    headingRef.current?.focus();
    if (!rootRef.current) return;
    const cleanup = revealPlan(rootRef.current, { confetti: isFirstReveal });
    if (isFirstReveal) onCelebrated();
    return cleanup;
    // Runs on mount only: the reveal is a one-off moment, not a reaction to edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Confetti the moment the last checklist item is ticked (not when a finished plan loads).
  useEffect(() => {
    const justFinished = allDone && !wasAllDone.current;
    wasAllDone.current = allDone;
    return justFinished ? celebrate() : undefined;
  }, [allDone]);

  const saved = useMemo<SavedPlan>(
    () => ({ version: 2, response, celebrated: true, actuals }),
    [response, actuals],
  );

  return (
    <div className="dashboard" ref={rootRef}>
      <header className="sticker plan-hero">
        <p className="plan-hero__kicker">{EVENT_LABELS[input.eventType]}</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {input.title}
        </h1>
        <p className="plan-hero__countdown">
          <span className="underline-accent">{countdownText(daysToGo)}</span>
        </p>
        <dl className="facts">
          <div>
            <dt>Date</dt>
            <dd>
              <time dateTime={input.eventDate}>{formatDate(input.eventDate)}</time>
            </dd>
          </div>
          <div>
            <dt>Where</dt>
            <dd>
              {input.city} · {CITY_TIER_LABELS[input.cityTier]}
            </dd>
          </div>
          <div>
            <dt>Guests</dt>
            <dd>{input.guestCount}</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>{formatMoney(plan.budget.total, plan.budget.currency)}</dd>
          </div>
        </dl>
        <div className="button-row no-print">
          <button type="button" className="button button--primary" onClick={onEdit}>
            Edit details
          </button>
          <button type="button" className="button button--ghost" onClick={onNewEvent}>
            Plan a new event
          </button>
        </div>
      </header>

      <nav className="jump-nav no-print" aria-label="Plan sections">
        <a href="#refine-title">Tweak</a>
        <a href="#budget-title">Budget</a>
        <a href="#tracker-title">Spend</a>
        <a href="#whatif-title">What if</a>
        <a href="#timeline-title">Timeline</a>
        <a href="#checklist-title">Checklist</a>
        <a href="#ideas-title">Ideas</a>
      </nav>

      <PlanTools saved={saved} onImported={onImported} />

      <WarningsBanner warnings={plan.warnings} />

      <RefineBox
        input={input}
        explanation={lastRefine?.explanation ?? null}
        onRefined={onRefined}
      />

      <div className="dashboard__grid">
        <BudgetPanel budget={plan.budget} changes={lastRefine?.changes} />
        <SpendTracker budget={plan.budget} actuals={actuals} onChange={onActualChange} />
        <WhatIfPanel
          key={`${input.budget}-${input.guestCount}`}
          input={input}
          current={plan.budget}
        />
        <TimelinePanel timeline={plan.timeline} today={today} />
        <ChecklistPanel items={plan.checklist} onToggle={onToggleItem} />
        <IdeasPanel ideas={ideas} aiStatus={aiStatus} lang={input.language} />
      </div>
    </div>
  );
}
