import type { BudgetCategory, EventInput, EventType, PlanResponse } from '@utsav/shared';
import { useEffect, useReducer } from 'react';
import { diffBudget, type BudgetChanges } from '../lib/budgetDiff';
import { loadSavedPlan, savePlan, type Actuals, type SavedPlan } from './storage';

export type View = 'landing' | 'wizard' | 'plan';

/** What the latest refinement did, shown until the next plan arrives. */
export interface LastRefine {
  explanation: string;
  changes: BudgetChanges;
}

export interface PlanState {
  view: View;
  /** Drives the per-event theme; null on the landing page before a choice. */
  eventType: EventType | null;
  /** Prefill for the wizard when editing an existing plan. */
  draftSource: EventInput | null;
  response: PlanResponse | null;
  /** True once the first-plan confetti has played for the saved plan. */
  celebrated: boolean;
  /** Actual spend per budget line (the tracker). */
  actuals: Actuals;
  lastRefine: LastRefine | null;
  /** Changes whenever a different plan is loaded, so the dashboard starts fresh. */
  planId: number;
}

export type PlanAction =
  | { type: 'start'; eventType: EventType }
  | { type: 'setEventType'; eventType: EventType }
  | { type: 'edit' }
  | { type: 'planReady'; response: PlanResponse }
  | { type: 'refined'; response: PlanResponse; explanation: string }
  | { type: 'imported'; saved: SavedPlan }
  | { type: 'toggleItem'; id: string }
  | { type: 'setActual'; category: BudgetCategory; amount: number | null }
  | { type: 'celebrated' }
  | { type: 'openPlan' }
  | { type: 'home' };

/** Pure state transitions for the whole app flow: landing → wizard → plan. */
export function planReducer(state: PlanState, action: PlanAction): PlanState {
  switch (action.type) {
    case 'start':
      return { ...state, view: 'wizard', eventType: action.eventType, draftSource: null };
    case 'setEventType':
      return { ...state, eventType: action.eventType };
    case 'edit':
      return state.response
        ? { ...state, view: 'wizard', draftSource: state.response.plan.input }
        : state;
    case 'planReady':
      return {
        ...state,
        view: 'plan',
        eventType: action.response.plan.input.eventType,
        response: action.response,
        celebrated: false,
        actuals: {},
        lastRefine: null,
        planId: state.planId + 1,
      };
    case 'refined':
      if (!state.response) return state;
      return {
        ...state,
        response: keepTicks(state.response, action.response),
        lastRefine: {
          explanation: action.explanation,
          changes: diffBudget(state.response.plan.budget, action.response.plan.budget),
        },
      };
    case 'imported':
      return {
        ...state,
        view: 'plan',
        eventType: action.saved.response.plan.input.eventType,
        response: action.saved.response,
        celebrated: true,
        actuals: action.saved.actuals,
        lastRefine: null,
        planId: state.planId + 1,
      };
    case 'toggleItem':
      return state.response
        ? { ...state, response: toggleChecklistItem(state.response, action.id) }
        : state;
    case 'setActual': {
      const actuals: Actuals = Object.fromEntries(
        Object.entries(state.actuals).filter(([category]) => category !== action.category),
      );
      if (action.amount !== null) actuals[action.category] = action.amount;
      return { ...state, actuals };
    }
    case 'celebrated':
      return { ...state, celebrated: true };
    case 'openPlan':
      return state.response
        ? { ...state, view: 'plan', eventType: state.response.plan.input.eventType }
        : state;
    case 'home':
      return { ...state, view: 'landing', eventType: null };
  }
}

function toggleChecklistItem(response: PlanResponse, id: string): PlanResponse {
  const checklist = response.plan.checklist.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  );
  return { ...response, plan: { ...response.plan, checklist } };
}

/** A refined plan keeps the ticks of checklist items that still exist (ids are stable). */
function keepTicks(previous: PlanResponse, next: PlanResponse): PlanResponse {
  const done = new Set(previous.plan.checklist.filter((item) => item.done).map((item) => item.id));
  const checklist = next.plan.checklist.map((item) => ({ ...item, done: done.has(item.id) }));
  return { ...next, plan: { ...next.plan, checklist } };
}

function initialState(): PlanState {
  const empty: PlanState = {
    view: 'landing',
    eventType: null,
    draftSource: null,
    response: null,
    celebrated: false,
    actuals: {},
    lastRefine: null,
    planId: 0,
  };
  const saved = loadSavedPlan();
  if (!saved) return empty;
  return {
    ...empty,
    view: 'plan',
    eventType: saved.response.plan.input.eventType,
    response: saved.response,
    celebrated: saved.celebrated,
    actuals: saved.actuals,
  };
}

/** App state with the latest plan, checklist ticks and tracker persisted to localStorage. */
export function usePlanStore() {
  const [state, dispatch] = useReducer(planReducer, undefined, initialState);
  const { response, celebrated, actuals } = state;

  useEffect(() => {
    if (response) savePlan({ response, celebrated, actuals });
  }, [response, celebrated, actuals]);

  return [state, dispatch] as const;
}
