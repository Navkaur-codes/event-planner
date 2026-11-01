import type { Constraint, EventInput, PlanPatch } from '../contracts.js';
import { LIMITS } from '../contracts.js';
import { clampInt } from './money.js';

/** Constraints that cannot hold together; adding one removes the other. */
const EXCLUSIVE: Partial<Record<Constraint, Constraint>> = { outdoor: 'indoor', indoor: 'outdoor' };

/**
 * Applies a refinement patch and returns a new input. An absolute `budget` wins over
 * `budgetChangePercent`; numbers are rounded and clamped to the input limits; constraints are
 * set operations; priorities are replaced (unique, at most three); city, city size and idea
 * language are replaced when given. `ideaFocus` only steers AI ideas, so it is not stored on the input.
 */
export function applyPatch(input: EventInput, patch: PlanPatch): EventInput {
  const rawBudget =
    patch.budget ??
    (patch.budgetChangePercent === undefined
      ? input.budget
      : input.budget + (input.budget * patch.budgetChangePercent) / 100);

  return {
    ...input,
    budget: clampInt(rawBudget, LIMITS.budget.min, LIMITS.budget.max),
    guestCount: clampInt(
      patch.guestCount ?? input.guestCount,
      LIMITS.guestCount.min,
      LIMITS.guestCount.max,
    ),
    eventDate: patch.eventDate ?? input.eventDate,
    constraints: patchConstraints(input.constraints, patch),
    priorities: patch.priorities
      ? [...new Set(patch.priorities)].slice(0, LIMITS.maxPriorities)
      : [...input.priorities],
    vibe: patch.vibe === undefined ? input.vibe : patch.vibe.trim(),
    city: patch.city === undefined ? input.city : patch.city.trim(),
    cityTier: patch.cityTier ?? input.cityTier,
    language: patch.language ?? input.language,
  };
}

function patchConstraints(current: readonly Constraint[], patch: PlanPatch): Constraint[] {
  const result = new Set(current);
  for (const c of patch.removeConstraints ?? []) result.delete(c);
  for (const c of patch.addConstraints ?? []) {
    const opposite = EXCLUSIVE[c];
    if (opposite) result.delete(opposite);
    result.add(c);
  }
  return [...result];
}
