import type { EventInput, EventType, PlanResponse } from '@utsav/shared';
import { useEffect, useReducer } from 'react';
import { loadSavedPlan, savePlan } from './storage';

export type View = 'landing' | 'wizard' | 'plan';

export interface PlanState {
  view: View;
  /** Drives the per-event theme; null on the landing page before a choice. */
  eventType: EventType | null;
  /** Prefill for the wizard when editing an existing plan. */
  draftSource: EventInput | null;
  response: PlanResponse | null;
  /** True once the first-plan confetti has played for the saved plan. */
  celebrated: boolean;
}

export type PlanAction =
  | { type: 'start'; eventType: EventType }
  | { type: 'setEventType'; eventType: EventType }
  | { type: 'edit' }
  | { type: 'planReady'; response: PlanResponse }
  | { type: 'toggleItem'; id: string }
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
      };
    case 'toggleItem':
      return state.response
        ? { ...state, response: toggleChecklistItem(state.response, action.id) }
        : state;
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

function initialState(): PlanState {
  const saved = loadSavedPlan();
  if (!saved) {
    return {
      view: 'landing',
      eventType: null,
      draftSource: null,
      response: null,
      celebrated: false,
    };
  }
  return {
    view: 'plan',
    eventType: saved.response.plan.input.eventType,
    draftSource: null,
    response: saved.response,
    celebrated: saved.celebrated,
  };
}

/** App state with the latest plan (and checklist ticks) persisted to localStorage. */
export function usePlanStore() {
  const [state, dispatch] = useReducer(planReducer, undefined, initialState);
  const { response, celebrated } = state;

  useEffect(() => {
    if (response) savePlan(response, celebrated);
  }, [response, celebrated]);

  return [state, dispatch] as const;
}
