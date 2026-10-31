import {
  ApiErrorSchema,
  HealthResponseSchema,
  PlanResponseSchema,
  type ApiErrorCode,
  type EventInput,
  type HealthResponse,
  type PlanRequest,
  type PlanResponse,
} from '@utsav/shared';
import type { z } from 'zod';
import { todayIso } from '../lib/clock';

/** Error shown to people: always carries a friendly, non-technical message. */
export class PlannerError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorCode | 'NETWORK' | 'BAD_RESPONSE',
    readonly issues: ReadonlyArray<{ path: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'PlannerError';
  }
}

const FRIENDLY: Record<PlannerError['code'], string> = {
  VALIDATION: 'A few details need another look before we can plan.',
  RATE_LIMITED: 'Lots of celebrations being planned right now — please wait a minute and retry.',
  NOT_FOUND: 'The planner could not find that. Please refresh the page and try again.',
  INTERNAL: 'Something went wrong on our side. Your details are safe — please try again.',
  NETWORK: 'We could not reach the planner. Check your connection and try again.',
  BAD_RESPONSE: 'The planner sent back something unexpected. Please try again.',
};

/** Fetches and validates the API health report. */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Health check failed (${response.status})`);
  return HealthResponseSchema.parse(await response.json());
}

/**
 * Asks the API for a full plan, sending the browser's local date so "today" matches the
 * person's calendar (CCR-02). Every failure becomes a friendly `PlannerError`.
 */
export function createPlan(input: EventInput, signal?: AbortSignal): Promise<PlanResponse> {
  const body: PlanRequest = { ...input, clientToday: todayIso() };
  return postJson('/api/plan', body, PlanResponseSchema, signal);
}

/**
 * POSTs JSON and validates the reply with `schema`. An abort rethrows the original
 * `AbortError`; anything else becomes a `PlannerError` with friendly text.
 */
async function postJson<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new PlannerError(FRIENDLY.NETWORK, 'NETWORK');
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toPlannerError(json);

  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new PlannerError(FRIENDLY.BAD_RESPONSE, 'BAD_RESPONSE');
  return parsed.data;
}

function toPlannerError(body: unknown): PlannerError {
  const parsed = ApiErrorSchema.safeParse(body);
  if (!parsed.success) return new PlannerError(FRIENDLY.INTERNAL, 'INTERNAL');
  const { code, issues = [] } = parsed.data.error;
  return new PlannerError(FRIENDLY[code], code, issues);
}
