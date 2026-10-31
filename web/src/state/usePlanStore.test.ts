import type { PlanResponse } from '@utsav/shared';
import { describe, expect, it } from 'vitest';
import { diffBudget } from '../lib/budgetDiff';
import { planResponse } from '../mocks/fixtures';
import { planReducer, type PlanState } from './usePlanStore';

const base: PlanState = {
  view: 'plan',
  eventType: 'birthday',
  draftSource: null,
  response: planResponse,
  celebrated: true,
  actuals: {},
  lastRefine: null,
  planId: 1,
};

/** The fixture with the budget cut to 48,000 (food and venue lower) and one checklist item new. */
const refined: PlanResponse = {
  ...planResponse,
  plan: {
    ...planResponse.plan,
    budget: {
      ...planResponse.plan.budget,
      total: 48000,
      perGuest: 1200,
      lines: [
        { category: 'food', amount: 15000, percent: 31.3, note: '' },
        { category: 'entertainment', amount: 12000, percent: 25, note: '' },
        { category: 'venue', amount: 9000, percent: 18.8, note: '' },
        { category: 'decor', amount: 4200, percent: 8.8, note: '' },
        { category: 'gifts', amount: 3000, percent: 6.3, note: '' },
        { category: 'contingency', amount: 4800, percent: 10, note: '' },
      ],
    },
    checklist: [
      ...planResponse.plan.checklist,
      { id: 'c-eco', vendor: 'decorator', task: 'Reusable decor', priority: 'should', done: false },
    ],
  },
};

describe('diffBudget', () => {
  it('reports changed amounts and new lines only', () => {
    expect(diffBudget(planResponse.plan.budget, refined.plan.budget)).toEqual({
      food: -3000,
      venue: -6000,
      decor: -4800,
      gifts: 'new',
      contingency: -1200,
    });
  });
});

describe('planReducer', () => {
  it('applies a refinement in place, keeping ticks and noting what changed', () => {
    const ticked = planReducer(base, { type: 'toggleItem', id: 'c-cake' });
    const next = planReducer(ticked, {
      type: 'refined',
      response: refined,
      explanation: 'Cut 20%',
    });
    expect(next.view).toBe('plan');
    expect(next.planId).toBe(base.planId);
    expect(next.response?.plan.budget.total).toBe(48000);
    expect(next.response?.plan.checklist.find((i) => i.id === 'c-cake')?.done).toBe(true);
    expect(next.response?.plan.checklist.find((i) => i.id === 'c-eco')?.done).toBe(false);
    expect(next.lastRefine?.explanation).toBe('Cut 20%');
    expect(next.lastRefine?.changes.gifts).toBe('new');
  });

  it('sets and clears tracker amounts', () => {
    const withFood = planReducer(base, { type: 'setActual', category: 'food', amount: 20000 });
    expect(withFood.actuals).toEqual({ food: 20000 });
    expect(
      planReducer(withFood, { type: 'setActual', category: 'food', amount: null }).actuals,
    ).toEqual({});
  });

  it('starts fresh for a new or imported plan', () => {
    const busy: PlanState = {
      ...base,
      actuals: { food: 1 },
      lastRefine: { explanation: 'x', changes: {} },
    };
    const fresh = planReducer(busy, { type: 'planReady', response: planResponse });
    expect(fresh).toMatchObject({ actuals: {}, lastRefine: null, celebrated: false, planId: 2 });

    const imported = planReducer(busy, {
      type: 'imported',
      saved: { version: 2, response: planResponse, celebrated: false, actuals: { venue: 5 } },
    });
    expect(imported).toMatchObject({ actuals: { venue: 5 }, celebrated: true, planId: 2 });
  });
});
