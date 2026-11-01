import { PlanResponseSchema } from '@utsav/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fallbackPlanResponse, planResponse } from '../mocks/fixtures';
import { MAX_PLAN_FILE_BYTES, planFileName, readPlanFile } from './planFile';
import {
  LIBRARY_KEY,
  MAX_SAVED_PLANS,
  STORAGE_KEY,
  loadLibrary,
  newPlanId,
  parseSavedPlan,
  removeFromLibrary,
  saveToLibrary,
} from './storage';

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

describe('plan library', () => {
  const plan = { response: planResponse, celebrated: false, actuals: { food: 20000 } };

  it('saves plans newest first, updates in place and deletes', () => {
    saveToLibrary('a', plan, new Date('2026-11-01T10:00:00Z'));
    saveToLibrary('b', { ...plan, celebrated: true }, new Date('2026-11-01T11:00:00Z'));
    expect(loadLibrary().map((entry) => entry.id)).toEqual(['b', 'a']);

    saveToLibrary('a', { ...plan, actuals: { food: 1 } }, new Date('2026-11-01T12:00:00Z'));
    const library = loadLibrary();
    expect(library.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(library[0]?.plan).toEqual({ version: 2, ...plan, actuals: { food: 1 } });

    expect(removeFromLibrary('a').map((entry) => entry.id)).toEqual(['b']);
    expect(loadLibrary().map((entry) => entry.id)).toEqual(['b']);
  });

  it(`keeps at most ${MAX_SAVED_PLANS} plans`, () => {
    for (let i = 0; i < MAX_SAVED_PLANS + 3; i++) saveToLibrary(`p${i}`, plan);
    const library = loadLibrary();
    expect(library).toHaveLength(MAX_SAVED_PLANS);
    expect(library[0]?.id).toBe(`p${MAX_SAVED_PLANS + 2}`);
  });

  it('migrates the single plan saved by earlier versions (v2 and v1)', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    expect(loadLibrary().map((entry) => entry.plan)).toEqual([saved]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(LIBRARY_KEY)).toContain('"version":2');

    window.localStorage.clear();
    window.localStorage.setItem(
      'utsav:plan:v1',
      JSON.stringify({ version: 1, response: planResponse, celebrated: true }),
    );
    expect(loadLibrary()[0]?.plan).toEqual(saved);
  });

  it('drops tampered entries and ignores corrupt JSON', () => {
    const broken = structuredClone(planResponse);
    broken.plan.budget.total += 1; // lines no longer add up
    window.localStorage.setItem(
      LIBRARY_KEY,
      JSON.stringify([
        { id: 'ok', savedAt: '2026-11-01T10:00:00.000Z', plan: saved },
        { id: 'bad', savedAt: '2026-11-01T10:00:00.000Z', plan: { ...saved, response: broken } },
        { hacked: true },
      ]),
    );
    expect(loadLibrary().map((entry) => entry.id)).toEqual(['ok']);

    window.localStorage.setItem(LIBRARY_KEY, '{not json');
    expect(loadLibrary()).toEqual([]);
    window.localStorage.setItem(LIBRARY_KEY, '{"not":"an array"}');
    expect(loadLibrary()).toEqual([]);
  });

  it('validates single saved plans (also the export format)', () => {
    expect(parseSavedPlan({ ...saved, version: 3 })).toBeNull();
    expect(parseSavedPlan({ ...saved, actuals: { food: -5 } })).toBeNull();
    expect(parseSavedPlan({ ...saved, actuals: { cake: 5 } })).toBeNull();
  });

  it('gives each new plan a different id', () => {
    expect(newPlanId()).not.toBe(newPlanId());
  });

  it('survives storage that throws (private mode, quota)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(() => saveToLibrary('a', plan)).not.toThrow();
    expect(loadLibrary()).toEqual([]);
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
