import { afterEach, describe, expect, it, vi } from 'vitest';
import { planRequest, planResponse } from '../mocks/fixtures';
import { jsonResponse } from '../test/helpers';
import { PlannerError, createPlan } from './client';

afterEach(() => vi.unstubAllGlobals());

async function failureOf(promise: Promise<unknown>): Promise<PlannerError> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(PlannerError);
  return error as PlannerError;
}

describe('createPlan', () => {
  it('returns the schema-validated plan', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(planResponse)));
    await expect(createPlan(planRequest)).resolves.toEqual(planResponse);
  });

  it('turns API errors into friendly messages and keeps validation issues', async () => {
    const body = {
      error: {
        code: 'VALIDATION',
        message: 'Some details need fixing.',
        issues: [{ path: 'eventDate', message: 'Date must be today or later' }],
      },
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body, 400)));
    const error = await failureOf(createPlan(planRequest));
    expect(error.code).toBe('VALIDATION');
    expect(error.message).toMatch(/A few details need another look/);
    expect(error.issues).toHaveLength(1);
  });

  it('never shows raw server text for unexpected failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>boom</html>', { status: 502 })),
    );
    const error = await failureOf(createPlan(planRequest));
    expect(error.code).toBe('INTERNAL');
    expect(error.message).not.toMatch(/boom/);
  });

  it('rejects a response that breaks the contract', async () => {
    const broken = { ...planResponse, aiStatus: 'maybe' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(broken)));
    expect((await failureOf(createPlan(planRequest))).code).toBe('BAD_RESPONSE');
  });

  it('reports network failures kindly but rethrows aborts untouched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect((await failureOf(createPlan(planRequest))).code).toBe('NETWORK');

    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(createPlan(planRequest, controller.signal)).rejects.toBe(abort);
  });
});
