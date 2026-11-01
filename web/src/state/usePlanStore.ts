import type { BudgetCategory, EventInput, EventType, PlanResponse } from '@utsav/shared';
import { useEffect, useReducer } from 'react';
import { diffBudget, type BudgetChanges } from '../lib/budgetDiff';
import {
  loadLibrary,
  saveToLibrary,
  type Actuals,
  type LibraryEntry,
  type SavedPlan,
} from './storage';

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
  /** Library id of the plan on screen; null before the first plan. */
  activeId: string | null;
  /** Plans saved in this browser, newest first (shown on the landing page). */
  library: LibraryEntry[];
}

export type PlanAction =
  | { type: 'start'; eventType: EventType }
  | { type: 'setEventType'; eventType: EventType }
  | { type: 'edit' }
  | { type: 'planReady'; response: PlanResponse; id: string }
  | { type: 'refined'; response: PlanResponse; explanation: string }
  | { type: 'imported'; saved: SavedPlan; id: string }
  | { type: 'toggleItem'; id: string }
  | { type: 'setActual'; category: BudgetCategory; amount: number | null }
  | { type: 'celebrated' }
  | { type: 'openSaved'; entry: LibraryEntry }
  | { type: 'libraryChanged'; library: LibraryEntry[] }
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
        activeId: action.id,
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
        activeId: action.id,
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
    case 'openSaved':
      return {
        ...state,
        view: 'plan',
        eventType: action.entry.plan.response.plan.input.eventType,
        response: action.entry.plan.response,
        celebrated: action.entry.plan.celebrated,
        actuals: action.entry.plan.actuals,
        lastRefine: null,
        planId: state.planId + 1,
        activeId: action.entry.id,
      };
    case 'libraryChanged': {
      // Deleting the plan that is open leaves nothing to show or save.
      const stillThere = action.library.some((entry) => entry.id === state.activeId);
      return stillThere || state.activeId === null
        ? { ...state, library: action.library }
        : {
            ...state,
            library: action.library,
            response: null,
            activeId: null,
            view: 'landing',
            eventType: null,
          };
    }
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

/** Every visit starts on the landing page; saved plans are listed there, not reopened. */
function initialState(): PlanState {
  return {
    view: 'landing',
    eventType: null,
    draftSource: null,
    response: null,
    celebrated: false,
    actuals: {},
    lastRefine: null,
    planId: 0,
    activeId: null,
    library: loadLibrary(),
  };
}

/** App state; the plan on screen (ticks and tracker included) is saved to the library. */
export function usePlanStore() {
  const [state, dispatch] = useReducer(planReducer, undefined, initialState);
  const { response, celebrated, actuals, activeId } = state;

  useEffect(() => {
    if (response && activeId) {
      dispatch({
        type: 'libraryChanged',
        library: saveToLibrary(activeId, { response, celebrated, actuals }),
      });
    }
  }, [response, celebrated, actuals, activeId]);

  return [state, dispatch] as const;
}
