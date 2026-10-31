/**
 * Planning engine — public API (docs/contracts.md §3). Pure and dependency-free: it runs on the
 * server and in the browser, and `today` is the only clock. The rules it applies live as data
 * in `./rules/`.
 */
import type { BudgetPlan, EnginePlan, EventInput, PortStatus } from '../contracts.js';
import { LIMITS } from '../contracts.js';
import { allocateBudget } from './budget.js';
import { buildChecklist } from './checklist.js';
import { daysUntil } from './dates.js';
import { clampInt } from './money.js';
import { buildTimeline } from './timeline.js';
import { evaluateWarnings } from './warnings.js';

export { applyPatch } from './patch.js';

export const IMPLEMENTATION: PortStatus = 'real';

/** Builds the full plan — budget, timeline, vendor checklist and warnings — for an event. */
export function buildPlan(input: EventInput, today: Date): EnginePlan {
  const timeline = buildTimeline(input, today);
  return {
    input,
    budget: allocateBudget(input, input.budget),
    timeline,
    checklist: buildChecklist(input),
    warnings: evaluateWarnings({
      input,
      daysLeft: Math.max(0, daysUntil(input.eventDate, today)),
      compressed: timeline.compressed,
    }),
    generatedAt: today.toISOString(),
  };
}

/**
 * Recomputes only the budget for what-if sliders. Overrides are rounded and clamped to the
 * input limits so a slider can never produce an invalid plan.
 */
export function recalculateBudget(
  input: EventInput,
  overrides: { budget?: number; guestCount?: number },
): BudgetPlan {
  const total = clampInt(overrides.budget ?? input.budget, LIMITS.budget.min, LIMITS.budget.max);
  const guestCount = clampInt(
    overrides.guestCount ?? input.guestCount,
    LIMITS.guestCount.min,
    LIMITS.guestCount.max,
  );
  return allocateBudget({ ...input, guestCount }, total);
}
