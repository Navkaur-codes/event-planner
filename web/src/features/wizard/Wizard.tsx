import type { EventInput, EventType, PlanResponse } from '@utsav/shared';
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { todayIso } from '../../lib/clock';
import { loadMotion, motionIfLoaded } from '../../motion/load';
import { ErrorPanel, LoadingPanel } from './RequestPanels';
import { STEP_COMPONENTS } from './steps';
import { usePlanRequest } from './usePlanRequest';
import {
  STEPS,
  draftFromInput,
  emptyDraft,
  errorsForStep,
  firstStepWithErrors,
  stepAt,
  validateDraft,
  withoutError,
  type DraftErrors,
  type EventDraft,
} from './wizardModel';

const EVENT_NOUN: Record<EventType, string> = {
  wedding: 'wedding',
  birthday: 'birthday',
  community: 'community event',
};

const INVALID_CONTROL =
  '[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea';

interface WizardProps {
  eventType: EventType;
  /** Prefill when editing an existing plan. */
  source: EventInput | null;
  onEventTypeChange: (eventType: EventType) => void;
  onPlanReady: (response: PlanResponse) => void;
  onExit: () => void;
}

/** The 4-step planning wizard; validates each step with the shared schema, then submits. */
export function Wizard({ eventType, source, onEventTypeChange, onPlanReady, onExit }: WizardProps) {
  const [draft, setDraft] = useState<EventDraft>(() =>
    source ? draftFromInput(source) : emptyDraft(eventType),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [errorFocusRequest, setErrorFocusRequest] = useState(0);
  const { state: request, submit, cancel } = usePlanRequest(onPlanReady);

  const formRef = useRef<HTMLFormElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const shownStepRef = useRef(stepIndex);

  const step = stepAt(stepIndex);
  const StepComponent = STEP_COMPONENTS[stepIndex] ?? STEP_COMPONENTS[0];
  const isLast = stepIndex === STEPS.length - 1;
  const today = todayIso();

  useEffect(() => {
    void loadMotion();
  }, []);

  // New step (or back from loading): focus its heading and slide it in (instant if reduced motion).
  useLayoutEffect(() => {
    headingRef.current?.focus();
    if (shownStepRef.current === stepIndex) return;
    shownStepRef.current = stepIndex;
    const motion = motionIfLoaded();
    if (!motion || !panelRef.current) return;
    return motion.stepTransition(panelRef.current, directionRef.current);
  }, [stepIndex, request.status]);

  useEffect(() => {
    if (errorFocusRequest === 0) return;
    formRef.current?.querySelector<HTMLElement>(INVALID_CONTROL)?.focus();
  }, [errorFocusRequest]);

  function update<K extends keyof EventDraft>(field: K, value: EventDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? withoutError(current, field) : current));
    if (field === 'eventType') onEventTypeChange(value as EventType);
  }

  function goTo(index: number, nextErrors: DraftErrors = {}) {
    directionRef.current = index >= stepIndex ? 1 : -1;
    setStepIndex(index);
    setErrors(nextErrors);
  }

  function handleNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { input, errors: allErrors } = validateDraft(draft, today);
    const stepErrors = errorsForStep(allErrors, step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setErrorFocusRequest((n) => n + 1);
      return;
    }
    if (!isLast) return goTo(stepIndex + 1);
    if (input) return void submit(input);
    // An earlier step became invalid (e.g. the date passed): send the person back there.
    const target = firstStepWithErrors(allErrors);
    goTo(target, errorsForStep(allErrors, stepAt(target)));
    setErrorFocusRequest((n) => n + 1);
  }

  const eventNoun = EVENT_NOUN[draft.eventType];

  return (
    <div className="wizard">
      <header className="wizard__header">
        <button type="button" className="link-button" onClick={onExit}>
          <span aria-hidden="true">← </span>Back to start
        </button>
        <h1>
          Plan your <span className="underline-accent">{eventNoun}</span>
        </h1>
      </header>

      <ol className="stepper" aria-label="Wizard progress">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className="stepper__item"
            data-state={i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'todo'}
            aria-current={i === stepIndex ? 'step' : undefined}
          >
            <span className="stepper__num" aria-hidden="true">
              {i < stepIndex ? '✓' : i + 1}
            </span>
            {s.title}
            {i < stepIndex && <span className="visually-hidden"> (done)</span>}
          </li>
        ))}
      </ol>

      {request.status === 'loading' && <LoadingPanel eventNoun={eventNoun} onCancel={cancel} />}
      {request.status === 'error' && (
        <ErrorPanel
          error={request.error}
          onRetry={() => void submit(request.input)}
          onEdit={cancel}
        />
      )}
      {request.status === 'idle' && (
        <form
          ref={formRef}
          className="sticker wizard__card"
          noValidate
          onSubmit={handleNext}
          aria-labelledby="step-heading"
        >
          <div ref={panelRef}>
            <fieldset className="wizard__step">
              <legend>
                <h2 id="step-heading" ref={headingRef} tabIndex={-1}>
                  <span className="wizard__step-count">
                    Step {stepIndex + 1} of {STEPS.length}:
                  </span>{' '}
                  {step.title}
                </h2>
              </legend>
              <StepComponent draft={draft} errors={errors} update={update} today={today} />
            </fieldset>
          </div>
          <div className="button-row button-row--end">
            {stepIndex > 0 && (
              <button
                type="button"
                className="button button--ghost"
                onClick={() => goTo(stepIndex - 1)}
              >
                Back
              </button>
            )}
            <button type="submit" className="button button--primary">
              {isLast ? 'Make my plan' : 'Next'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
