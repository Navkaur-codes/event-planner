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
  activeId: 'p-1',
  library: [],
  unsaved: false,
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
    const fresh = planReducer(busy, { type: 'planReady', response: planResponse, id: 'p-new' });
    expect(fresh).toMatchObject({
      actuals: {},
      lastRefine: null,
      celebrated: false,
      planId: 2,
      activeId: 'p-new',
    });

    const imported = planReducer(busy, {
      type: 'imported',
      saved: { version: 2, response: planResponse, celebrated: false, actuals: { venue: 5 } },
      id: 'p-imp',
    });
    expect(imported).toMatchObject({
      actuals: { venue: 5 },
      celebrated: true,
      planId: 2,
      activeId: 'p-imp',
    });
  });
});

describe('planReducer without a plan', () => {
  const empty: PlanState = { ...base, view: 'landing', eventType: null, response: null };

  it('ignores plan-only actions until a plan exists', () => {
    expect(planReducer(empty, { type: 'edit' })).toBe(empty);
    expect(planReducer(empty, { type: 'toggleItem', id: 'c-cake' })).toBe(empty);
    expect(planReducer(empty, { type: 'refined', response: refined, explanation: 'Cut 20%' })).toBe(
      empty,
    );
  });

  it('starts the wizard blank and switches the theme as the type changes', () => {
    const started = planReducer(empty, { type: 'start', eventType: 'wedding' });
    expect(started).toMatchObject({ view: 'wizard', eventType: 'wedding', draftSource: null });
    const switched = planReducer(started, { type: 'setEventType', eventType: 'community' });
    expect(switched.eventType).toBe('community');
  });
});

describe('planReducer navigation', () => {
  it('edits with the current details, returns home and reopens the plan', () => {
    const editing = planReducer(base, { type: 'edit' });
    expect(editing).toMatchObject({ view: 'wizard', draftSource: planResponse.plan.input });

    const home = planReducer(editing, { type: 'home' });
    expect(home).toMatchObject({ view: 'landing', eventType: null });
    expect(home.response).toBe(planResponse);
  });

  it('opens a saved plan from the library with its own ticks and tracker', () => {
    const entry = {
      id: 'p-9',
      savedAt: '2026-11-01T10:00:00.000Z',
      plan: { version: 2 as const, response: planResponse, celebrated: true, actuals: { food: 7 } },
    };
    const home = { ...base, view: 'landing' as const, response: null, activeId: null };
    expect(planReducer(home, { type: 'openSaved', entry })).toMatchObject({
      view: 'plan',
      eventType: planResponse.plan.input.eventType,
      response: planResponse,
      actuals: { food: 7 },
      activeId: 'p-9',
      planId: 2,
    });
  });

  it('updates the same saved plan when regenerated from "Edit details"', () => {
    const editing = planReducer(base, { type: 'edit' });
    const regenerated = planReducer(editing, {
      type: 'planReady',
      response: planResponse,
      id: 'p-new',
    });
    expect(regenerated).toMatchObject({ activeId: 'p-1', draftSource: null, unsaved: true });

    const fresh = planReducer(
      { ...base, draftSource: null },
      {
        type: 'planReady',
        response: planResponse,
        id: 'p-new',
      },
    );
    expect(fresh.activeId).toBe('p-new');
  });

  it('keeps ticks, tracked spend and the played confetti when an edited plan is regenerated', () => {
    const tickedId = planResponse.plan.checklist[0]?.id ?? '';
    const worked = planReducer(
      { ...base, actuals: { food: 12000, attire: 5000 }, celebrated: true },
      { type: 'toggleItem', id: tickedId },
    );
    const editing = planReducer(worked, { type: 'edit' });
    const regenerated = planReducer(editing, {
      type: 'planReady',
      response: planResponse,
      id: 'p-new',
    });
    // Attire is not in the regenerated budget, so its tracked spend is dropped.
    expect(regenerated.actuals).toEqual({ food: 12000 });
    expect(regenerated.celebrated).toBe(true);
    expect(regenerated.response?.plan.checklist.find((item) => item.id === tickedId)?.done).toBe(
      true,
    );

    const brandNew = planReducer(
      { ...worked, draftSource: null },
      { type: 'planReady', response: planResponse, id: 'p-new' },
    );
    expect(brandNew).toMatchObject({ actuals: {}, celebrated: false });
  });

  it('only marks real changes for saving, not opening a plan', () => {
    const entry = {
      id: 'p-2',
      savedAt: '2026-11-01T10:00:00.000Z',
      plan: { version: 2 as const, response: planResponse, celebrated: true, actuals: {} },
    };
    expect(planReducer({ ...base, unsaved: true }, { type: 'openSaved', entry }).unsaved).toBe(
      false,
    );
    expect(planReducer(base, { type: 'toggleItem', id: 'c-cake' }).unsaved).toBe(true);
    expect(planReducer(base, { type: 'setActual', category: 'food', amount: 5 }).unsaved).toBe(
      true,
    );
    expect(
      planReducer({ ...base, unsaved: true }, { type: 'libraryChanged', library: [entry] }).unsaved,
    ).toBe(false);
  });

  it('closes the open plan when it is deleted, but not when another one is', () => {
    const entry = {
      id: 'p-1',
      savedAt: '2026-11-01T10:00:00.000Z',
      plan: { version: 2 as const, response: planResponse, celebrated: true, actuals: {} },
    };
    const kept = planReducer(base, { type: 'libraryChanged', library: [entry] });
    expect(kept).toMatchObject({ response: planResponse, activeId: 'p-1', library: [entry] });

    const gone = planReducer(base, { type: 'libraryChanged', library: [] });
    expect(gone).toMatchObject({
      response: null,
      activeId: null,
      lastRefine: null,
      draftSource: null,
      view: 'landing',
      library: [],
    });
  });

  it('marks the celebration as played', () => {
    const next = planReducer({ ...base, celebrated: false }, { type: 'celebrated' });
    expect(next.celebrated).toBe(true);
  });
});
