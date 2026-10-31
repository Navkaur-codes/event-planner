import type { BudgetCategory, BudgetPlan } from '@utsav/shared';

/** Per changed category: the change in amount, or "new" when the line did not exist before. */
export type BudgetChanges = Partial<Record<BudgetCategory, number | 'new'>>;

/** Which budget lines a refinement changed, so the dashboard can point them out. */
export function diffBudget(before: BudgetPlan, after: BudgetPlan): BudgetChanges {
  const previous = new Map(before.lines.map((line) => [line.category, line.amount]));
  const changes: BudgetChanges = {};
  for (const line of after.lines) {
    const old = previous.get(line.category);
    if (old === undefined) changes[line.category] = 'new';
    else if (old !== line.amount) changes[line.category] = line.amount - old;
  }
  return changes;
}
