import { describe, expect, it } from 'vitest';
import { BudgetPlanSchema } from '../src/contracts.js';
import { buildPlan, recalculateBudget } from '../src/engine/index.js';
import { makeInput, TODAY } from './fixtures.js';

const plain = makeInput({ priorities: [], constraints: [] });

function amountOf(plan: ReturnType<typeof recalculateBudget>, category: string): number {
  return plan.lines.find((l) => l.category === category)?.amount ?? 0;
}

describe('budget allocation', () => {
  it('follows the birthday base split exactly when there are no adjustments', () => {
    const budget = recalculateBudget(plain, {});
    expect(budget.lines.map((l) => [l.category, l.amount])).toEqual([
      ['food', 21_000],
      ['entertainment', 12_000],
      ['venue', 9_000],
      ['decor', 9_000],
      ['photography', 1_800],
      ['invitations', 600],
      ['gifts', 600],
      ['contingency', 6_000],
    ]);
    expect(budget.perGuest).toBe(1_500);
    expect(budget.lines.find((l) => l.category === 'food')?.percent).toBe(35);
  });

  it('omits categories with no share and keeps contingency last', () => {
    const budget = recalculateBudget(plain, {});
    expect(budget.lines.some((l) => l.category === 'attire')).toBe(false);
    expect(budget.lines.at(-1)?.category).toBe('contingency');
  });

  it('boosts chosen priorities and explains why', () => {
    const boosted = recalculateBudget(makeInput({ priorities: ['decor'], constraints: [] }), {});
    expect(amountOf(boosted, 'decor')).toBeGreaterThan(
      amountOf(recalculateBudget(plain, {}), 'decor'),
    );
    expect(boosted.lines.find((l) => l.category === 'decor')?.note).toContain(
      'Boosted: your priority',
    );
  });

  it('gives a zero-share category a floor when it is prioritised', () => {
    const budget = recalculateBudget(makeInput({ priorities: ['attire'], constraints: [] }), {});
    expect(amountOf(budget, 'attire')).toBeGreaterThan(0);
  });

  it('nudges money toward logistics for outdoor events and names dietary needs on food', () => {
    const outdoor = recalculateBudget(
      makeInput({ priorities: [], constraints: ['outdoor', 'jain', 'halal'] }),
      {},
    );
    expect(amountOf(outdoor, 'logistics')).toBeGreaterThan(0);
    expect(outdoor.lines.find((l) => l.category === 'logistics')?.note).toContain('tents');
    const food = outdoor.lines.find((l) => l.category === 'food')?.note ?? '';
    expect(food).toContain('Catering for 40 guests');
    expect(food).toContain('Jain');
    expect(food).toContain('halal');
  });

  it('uses the singular for a single guest', () => {
    const budget = recalculateBudget(plain, { guestCount: 1 });
    expect(budget.lines.find((l) => l.category === 'food')?.note).toBe('Catering for 1 guest');
  });

  it('is what buildPlan uses for the full plan', () => {
    const input = makeInput();
    expect(buildPlan(input, TODAY).budget).toEqual(recalculateBudget(input, {}));
  });
});

describe('recalculateBudget (what-if sliders)', () => {
  it('applies overrides and keeps the plan valid', () => {
    const budget = recalculateBudget(makeInput(), { budget: 90_000, guestCount: 60 });
    expect(budget.total).toBe(90_000);
    expect(budget.perGuest).toBe(1_500);
    expect(BudgetPlanSchema.safeParse(budget).success).toBe(true);
  });

  it('clamps out-of-range slider values to the input limits', () => {
    const low = recalculateBudget(makeInput(), { budget: 10, guestCount: 0 });
    expect(low.total).toBe(1_000);
    expect(low.perGuest).toBe(1_000);
    const high = recalculateBudget(makeInput(), { budget: 5e9, guestCount: 9_999.6 });
    expect(high.total).toBe(100_000_000);
    expect(high.perGuest).toBe(20_000);
  });

  it('is deterministic', () => {
    const input = makeInput({ priorities: ['venue', 'food', 'gifts'] });
    expect(recalculateBudget(input, {})).toEqual(recalculateBudget(input, {}));
  });
});
