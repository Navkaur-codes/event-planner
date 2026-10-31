import type { EventType, PlanResponse } from '@utsav/shared';
import { lazy, Suspense, useCallback, useEffect } from 'react';
import { Landing } from './features/landing/Landing';
import { Wizard } from './features/wizard/Wizard';
import { usePlanStore } from './state/usePlanStore';

// The dashboard (and the GSAP chunk it pulls in) is split out of the first page load and
// prefetched while the wizard is open, so the plan appears without a wait.
const loadDashboard = () => import('./features/plan/PlanDashboard');
const PlanDashboard = lazy(loadDashboard);

/** Root: landing → wizard → plan dashboard, themed by the chosen event type. */
export function App() {
  const [state, dispatch] = usePlanStore();
  const { view, eventType, response } = state;

  useEffect(() => {
    if (eventType) document.body.dataset.event = eventType;
    else delete document.body.dataset.event;
  }, [eventType]);

  useEffect(() => {
    if (view === 'wizard') void loadDashboard();
  }, [view]);

  const handlePlanReady = useCallback(
    (planResponse: PlanResponse) => dispatch({ type: 'planReady', response: planResponse }),
    [dispatch],
  );
  const handleEventTypeChange = useCallback(
    (type: EventType) => dispatch({ type: 'setEventType', eventType: type }),
    [dispatch],
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="bunting" aria-hidden="true" />
      <div className="bunting bunting--rani" aria-hidden="true" />
      <main id="main" className="page">
        {view === 'landing' && (
          <Landing
            onStart={(type) => dispatch({ type: 'start', eventType: type })}
            savedTitle={response?.plan.input.title ?? null}
            onOpenSaved={() => dispatch({ type: 'openPlan' })}
          />
        )}
        {view === 'wizard' && (
          <Wizard
            eventType={eventType ?? 'wedding'}
            source={state.draftSource}
            onEventTypeChange={handleEventTypeChange}
            onPlanReady={handlePlanReady}
            onExit={() => dispatch({ type: 'home' })}
          />
        )}
        {view === 'plan' && response && (
          <Suspense
            fallback={
              <p className="status-pill" role="status">
                Opening your plan…
              </p>
            }
          >
            <PlanDashboard
              response={response}
              celebrated={state.celebrated}
              onCelebrated={() => dispatch({ type: 'celebrated' })}
              onToggleItem={(id) => dispatch({ type: 'toggleItem', id })}
              onEdit={() => dispatch({ type: 'edit' })}
              onNewEvent={() => dispatch({ type: 'home' })}
            />
          </Suspense>
        )}
      </main>
    </>
  );
}
