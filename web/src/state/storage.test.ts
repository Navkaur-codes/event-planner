import { PlanResponseSchema } from '@utsav/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fallbackPlanResponse, planResponse } from '../mocks/fixtures';
import { MAX_PLAN_FILE_BYTES, planFileName, readPlanFile } from './planFile';
import { STORAGE_KEY, clearSavedPlan, loadSavedPlan, parseSavedPlan, savePlan } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

const saved = { version: 2 as const, response: planResponse, celebrated: true, actuals: {} };

function file(content: string, name = 'plan.json'): File {
  return new File([content], name, { type: 'application/json' });
}

describe('fixtures', () => {
  it('are valid against the shared contracts', () => {
    expect(PlanResponseSchema.safeParse(planResponse).success).toBe(true);
    expect(PlanResponseSchema.safeParse(fallbackPlanResponse).success).toBe(true);
  });
});

describe('plan storage', () => {
  it('round-trips a plan and tracker under a versioned key', () => {
    savePlan({ response: planResponse, celebrated: false, actuals: { food: 20000 } });
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"version":2');
    expect(loadSavedPlan()).toEqual({
      version: 2,
      response: planResponse,
      celebrated: false,
      actuals: { food: 20000 },
    });
    clearSavedPlan();
    expect(loadSavedPlan()).toBeNull();
  });

  it('migrates a version 1 save (no tracker yet)', () => {
    window.localStorage.setItem(
      'utsav:plan:v1',
      JSON.stringify({ version: 1, response: planResponse, celebrated: true }),
    );
    expect(loadSavedPlan()).toEqual(saved);
  });

  it('ignores corrupt JSON, unknown versions and schema-invalid plans', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadSavedPlan()).toBeNull();

    expect(parseSavedPlan({ ...saved, version: 3 })).toBeNull();
    expect(parseSavedPlan({ ...saved, actuals: { food: -5 } })).toBeNull();
    expect(parseSavedPlan({ ...saved, actuals: { cake: 5 } })).toBeNull();

    const broken = structuredClone(planResponse);
    broken.plan.budget.total += 1; // lines no longer add up
    expect(parseSavedPlan({ ...saved, response: broken })).toBeNull();
  });

  it('survives storage that throws (private mode, quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => savePlan(saved)).not.toThrow();
    expect(loadSavedPlan()).toBeNull();
  });
});

describe('plan files', () => {
  it('reads back an exported plan', async () => {
    await expect(readPlanFile(file(JSON.stringify(saved)))).resolves.toEqual({ ok: true, saved });
  });

  it('rejects tampered, non-JSON and oversized files with a friendly message', async () => {
    const tampered = structuredClone(saved);
    tampered.response.plan.budget.total = 1; // lines no longer add up
    for (const content of [JSON.stringify(tampered), 'hello', '{"version":2}']) {
      const result = await readPlanFile(file(content));
      expect(result).toEqual({
        ok: false,
        message: expect.stringMatching(/isn’t a valid Utsav plan/),
      });
    }
    const huge = await readPlanFile(file('x'.repeat(MAX_PLAN_FILE_BYTES + 1)));
    expect(huge).toEqual({ ok: false, message: expect.stringMatching(/too big/) });
  });

  it('names downloads safely from the title', () => {
    expect(planFileName('Aarav turns 7!')).toBe('utsav-aarav-turns-7.json');
    expect(planFileName('शादी')).toBe('utsav-plan.json');
  });
});
