import { HealthResponseSchema, type HealthResponse } from '@utsav/shared';

/** Fetches and validates the API health report. */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Health check failed (${response.status})`);
  return HealthResponseSchema.parse(await response.json());
}
