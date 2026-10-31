import { describe, expect, it } from 'vitest';
import {
  CityTierSchema,
  EnginePlanSchema,
  EventTypeSchema,
  LIMITS,
  type EnginePlan,
} from '../src/contracts.js';
import { buildPlan, IMPLEMENTATION } from '../src/engine/index.js';
import { makeInput, TODAY } from './fixtures.js';

const GUESTS = [1, 40, 300, 5000];
const BUDGETS = { min: LIMITS.budget.min, typical: 750_000, max: LIMITS.budget.max };

const cases = EventTypeSchema.options.flatMap((eventType) =>
  CityTierSchema.options.flatMap((cityTier) =>
    GUESTS.flatMap((guestCount) =>
      Object.entries(BUDGETS).map(([label, budget]) => ({
        eventType,
        cityTier,
        guestCount,
        label,
        budget,
      })),
    ),
  ),
);

function expectBudgetInvariants(plan: EnginePlan): void {
  const { lines, total } = plan.budget;
  expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(total);
  const contingency = lines.filter((l) => l.category === 'contingency');
  expect(contingency).toHaveLength(1);
  expect(Math.abs((contingency[0]?.amount ?? 0) - total / 10)).toBeLessThanOrEqual(1);
  for (const line of lines) {
    expect(Number.isInteger(line.amount)).toBe(true);
    expect(line.amount).toBeGreaterThanOrEqual(0);
  }
}

describe('engine sweep: every type × tier × guests × budget', () => {
  it('reports itself as the real implementation', () => {
    expect(IMPLEMENTATION).toBe('real');
  });

  it.each(cases)(
    '$eventType / $cityTier / $guestCount guests / $label budget',
    ({ eventType, cityTier, guestCount, budget }) => {
      const input = makeInput({
        eventType,
        cityTier,
        guestCount,
        budget,
        priorities: ['decor', 'attire', 'logistics'],
        constraints: ['outdoor', 'jain', 'wheelchair_access'],
        traditions: 'Anand Karaj',
      });
      const plan = buildPlan(input, TODAY);
      expect(() => EnginePlanSchema.parse(plan)).not.toThrow();
      expectBudgetInvariants(plan);
    },
  );

  it.each(EventTypeSchema.options)(
    '%s: budget invariants hold for awkward totals and no priorities',
    (eventType) => {
      for (const budget of [1_000, 1_001, 1_009, 33_333, 99_999_999]) {
        const plan = buildPlan(
          makeInput({ eventType, budget, priorities: [], constraints: [] }),
          TODAY,
        );
        expect(() => EnginePlanSchema.parse(plan)).not.toThrow();
        expectBudgetInvariants(plan);
      }
    },
  );
});
