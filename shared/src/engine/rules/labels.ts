/** Human-readable labels for constraints that appear inside notes and tasks. */
import type { Constraint } from '../../contracts.js';

/** Dietary constraints and how a caterer would phrase them. */
export const DIETARY_LABELS: Partial<Record<Constraint, string>> = {
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  jain: 'Jain (no root vegetables)',
  halal: 'halal',
  alcohol_free: 'alcohol-free',
};

/** Dietary labels for the chosen constraints, in the user's order. */
export function dietaryLabels(constraints: readonly Constraint[]): string[] {
  return constraints.flatMap((c) => {
    const label = DIETARY_LABELS[c];
    return label ? [label] : [];
  });
}
