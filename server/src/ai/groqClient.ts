/**
 * Thin wrapper over groq-sdk: JSON mode, a hard time budget and one retry on a
 * smaller model. Knows nothing about events — callers pass ready-made prompts.
 */
import Groq from 'groq-sdk';

export type AiFailureReason =
  'timeout' | 'rate_limited' | 'upstream' | 'model_unavailable' | 'rejected' | 'aborted' | 'empty';

/** A Groq call that did not produce content; `reason` is safe to log. */
export class AiCallError extends Error {
  constructor(
    readonly reason: AiFailureReason,
    readonly status?: number,
  ) {
    super(`Groq call failed: ${reason}`);
    this.name = 'AiCallError';
  }
}

export interface GroqSettings {
  apiKey: string;
  model: string;
  fallbackModel: string;
  /** Total budget for primary + fallback attempts. */
  timeoutMs: number;
}

export interface JsonCompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
}

export interface JsonCompletion {
  content: string;
  model: string;
}

// The primary model gets most of the budget; the fast fallback model still fits in the rest.
const PRIMARY_SHARE = 0.6;
// 404 means the model was retired or renamed upstream; the other model may still work.
const RETRYABLE: ReadonlySet<AiFailureReason> = new Set([
  'timeout',
  'rate_limited',
  'upstream',
  'model_unavailable',
]);

let cachedClient: { apiKey: string; client: Groq } | undefined;

function clientFor(apiKey: string): Groq {
  if (cachedClient?.apiKey !== apiKey) {
    // Retries are handled here (model fallback), so the SDK's own retries are off.
    cachedClient = { apiKey, client: new Groq({ apiKey, maxRetries: 0 }) };
  }
  return cachedClient.client;
}

/**
 * Requests a JSON-object completion from the primary model, retrying once on the
 * fallback model after a timeout, 429 or 5xx.
 * @throws AiCallError when no attempt returns content.
 */
export async function completeJson(
  settings: GroqSettings,
  request: JsonCompletionRequest,
  signal?: AbortSignal,
): Promise<JsonCompletion> {
  const primaryBudget = Math.round(settings.timeoutMs * PRIMARY_SHARE);
  try {
    const content = await attempt(settings, settings.model, request, primaryBudget, signal);
    return { content, model: settings.model };
  } catch (error) {
    const canRetry =
      error instanceof AiCallError &&
      RETRYABLE.has(error.reason) &&
      settings.fallbackModel !== settings.model;
    if (!canRetry) throw error;
    const remaining = settings.timeoutMs - primaryBudget;
    const content = await attempt(settings, settings.fallbackModel, request, remaining, signal);
    return { content, model: settings.fallbackModel };
  }
}

async function attempt(
  settings: GroqSettings,
  model: string,
  request: JsonCompletionRequest,
  timeoutMs: number,
  signal: AbortSignal | undefined,
): Promise<string> {
  if (signal?.aborted) throw new AiCallError('aborted');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });
  try {
    const completion = await clientFor(settings.apiKey).chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        response_format: { type: 'json_object' },
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      },
      { signal: controller.signal },
    );
    const content = completion.choices[0]?.message.content;
    if (!content) throw new AiCallError('empty');
    return content;
  } catch (error) {
    if (error instanceof AiCallError) throw error;
    throw classify(error, signal?.aborted === true, controller.signal.aborted);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

function classify(error: unknown, callerAborted: boolean, timedOut: boolean): AiCallError {
  if (callerAborted) return new AiCallError('aborted');
  if (timedOut) return new AiCallError('timeout');
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== 'number') return new AiCallError('upstream'); // network failure
  if (status === 429) return new AiCallError('rate_limited', status);
  if (status === 404) return new AiCallError('model_unavailable', status);
  if (status >= 500) return new AiCallError('upstream', status);
  return new AiCallError('rejected', status);
}
