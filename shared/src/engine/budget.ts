import type { BudgetLine, BudgetPlan, EventInput, Priority } from '../contracts.js';
import { PRIORITIES } from '../contracts.js';
import { allocateLargestRemainder, round1 } from './money.js';
import {
  BASE_SPLITS,
  CATEGORY_NOTES,
  CONSTRAINT_NUDGES,
  CONTINGENCY_PERCENT,
  PRIORITY_FLOOR_PERCENT,
  PRIORITY_MULTIPLIER,
} from './rules/budgetSplits.js';
import { dietaryLabels } from './rules/labels.js';

/** The parts of an event that decide how money is split. */
export type BudgetContext = Pick<
  EventInput,
  'eventType' | 'priorities' | 'constraints' | 'currency' | 'guestCount'
>;

interface WeightedCategory {
  category: Priority;
  weight: number;
  reasons: string[];
}

/**
 * Splits `total` into budget lines: a fixed ~10% contingency, the rest by event-type rules
 * adjusted for priorities and constraints. Amounts are integers that sum exactly to `total`.
 */
export function allocateBudget(context: BudgetContext, total: number): BudgetPlan {
  const contingency = Math.round((total * CONTINGENCY_PERCENT) / 100);
  const weighted = weighCategories(context).filter((c) => c.weight > 0);
  const amounts = allocateLargestRemainder(
    total - contingency,
    weighted.map((c) => c.weight),
  );

  // Largest first for the dashboard bars; the stable sort keeps category order on ties.
  const lines: BudgetLine[] = weighted
    .map((c, i) => toLine(c.category, amounts[i] ?? 0, total, describe(c, context)))
    .sort((a, b) => b.amount - a.amount);
  lines.push(toLine('contingency', contingency, total, 'Buffer for surprises and price changes'));

  return {
    total,
    currency: context.currency,
    perGuest: Math.round(total / context.guestCount),
    lines,
  };
}

function weighCategories(context: BudgetContext): WeightedCategory[] {
  const base = BASE_SPLITS[context.eventType];
  const weighted = Object.fromEntries(
    PRIORITIES.map((category): [Priority, WeightedCategory] => [
      category,
      { category, weight: base[category], reasons: [] },
    ]),
  ) as Record<Priority, WeightedCategory>;

  for (const constraint of context.constraints) {
    for (const nudge of CONSTRAINT_NUDGES[constraint] ?? []) {
      const entry = weighted[nudge.category];
      entry.weight += nudge.addPercent;
      entry.reasons.push(`Includes ${nudge.note}`);
    }
  }

  for (const priority of context.priorities) {
    const entry = weighted[priority];
    entry.weight = Math.max(entry.weight, PRIORITY_FLOOR_PERCENT) * PRIORITY_MULTIPLIER;
    entry.reasons.unshift('Boosted: your priority');
  }

  return PRIORITIES.map((category) => weighted[category]);
}

function describe(entry: WeightedCategory, context: BudgetContext): string {
  const parts = [CATEGORY_NOTES[entry.category]];
  if (entry.category === 'food') {
    const diets = dietaryLabels(context.constraints);
    parts[0] = `Catering for ${context.guestCount} guest${context.guestCount === 1 ? '' : 's'}`;
    if (diets.length > 0) parts.push(diets.join(', '));
  }
  return [...parts, ...entry.reasons].join(' · ');
}

function toLine(
  category: BudgetLine['category'],
  amount: number,
  total: number,
  note: string,
): BudgetLine {
  return { category, amount, percent: round1((amount / total) * 100), note };
}
