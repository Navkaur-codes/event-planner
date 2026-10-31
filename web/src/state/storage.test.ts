import { PlanResponseSchema } from '@utsav/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fallbackPlanResponse, planResponse } from '../mocks/fixtures';
import { STORAGE_KEY, clearSavedPlan, loadSavedPlan, savePlan } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('fixtures', () => {
  it('are valid against the shared contracts', () => {
    expect(PlanResponseSchema.safeParse(planResponse).success).toBe(true);
    expect(PlanResponseSchema.safeParse(fallbackPlanResponse).success).toBe(true);
  });
});

describe('plan storage', () => {
  it('round-trips a plan under a versioned key', () => {
    savePlan(planResponse, false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"version":1');
    expect(loadSavedPlan()).toEqual({ version: 1, response: planResponse, celebrated: false });
    clearSavedPlan();
    expect(loadSavedPlan()).toBeNull();
  });

  it('ignores corrupt JSON, other versions and schema-invalid plans', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadSavedPlan()).toBeNull();

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, response: planResponse, celebrated: true }),
    );
    expect(loadSavedPlan()).toBeNull();

    const broken = structuredClone(planResponse);
    broken.plan.budget.total += 1; // lines no longer add up
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, response: broken, celebrated: true }),
    );
    expect(loadSavedPlan()).toBeNull();
  });

  it('survives storage that throws (private mode, quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => savePlan(planResponse, true)).not.toThrow();
    expect(loadSavedPlan()).toBeNull();
  });
});
