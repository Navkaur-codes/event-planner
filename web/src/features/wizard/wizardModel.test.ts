import { describe, expect, it } from 'vitest';
import { planRequest } from '../../mocks/fixtures';
import {
  STEPS,
  draftFromInput,
  emptyDraft,
  errorsForStep,
  firstStepWithErrors,
  stepAt,
  validateDraft,
  withoutError,
} from './wizardModel';

const TODAY = '2026-10-31';

describe('validateDraft', () => {
  it('accepts a complete draft and returns a typed EventInput', () => {
    const { input, errors } = validateDraft(draftFromInput(planRequest), TODAY);
    expect(errors).toEqual({});
    expect(input).toEqual(planRequest);
  });

  it('reports friendly errors for every missing required field', () => {
    const { input, errors } = validateDraft(emptyDraft('wedding'), TODAY);
    expect(input).toBeNull();
    expect(Object.keys(errors).sort()).toEqual([
      'budget',
      'city',
      'eventDate',
      'guestCount',
      'title',
    ]);
  });

  it('rejects fractional or out-of-range numbers and past dates', () => {
    const draft = {
      ...draftFromInput(planRequest),
      guestCount: '2.5',
      budget: '999',
      eventDate: '2026-10-30',
    };
    const { errors } = validateDraft(draft, TODAY);
    expect(errors.guestCount).toMatch(/whole number of guests/);
    expect(errors.budget).toMatch(/1,000 to 10,00,00,000/);
    expect(errors.eventDate).toMatch(/has passed/);
  });

  it('accepts today as the event date', () => {
    expect(
      validateDraft({ ...draftFromInput(planRequest), eventDate: TODAY }, TODAY).input,
    ).not.toBeNull();
  });
});

describe('step helpers', () => {
  it('splits errors by step and finds the first step with errors', () => {
    const { errors } = validateDraft({ ...draftFromInput(planRequest), budget: '' }, TODAY);
    expect(errorsForStep(errors, stepAt(0))).toEqual({});
    expect(Object.keys(errorsForStep(errors, stepAt(1)))).toEqual(['budget']);
    expect(firstStepWithErrors(errors)).toBe(1);
    expect(withoutError(errors, 'budget')).toEqual({});
  });

  it('covers every EventInput field exactly once across the four steps', () => {
    const fields = STEPS.flatMap((step) => step.fields).sort();
    expect(fields).toEqual(Object.keys(planRequest).sort());
    expect(() => stepAt(STEPS.length)).toThrow(RangeError);
  });
});
