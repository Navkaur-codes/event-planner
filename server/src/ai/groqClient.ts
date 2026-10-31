/**
 * Thin wrapper over groq-sdk: JSON mode, a hard time budget and one retry on a
 * smaller model. Knows nothing about events — callers pass ready-made prompts.
 */
import Groq from 'groq-sdk';

/** Why a Groq call produced no usable content; short labels that are safe to log. */
export type AiFailureReason =
  | 'timeout'
  | 'rate_limited'
  | 'upstream'
  | 'model_unavailable'
  | 'rejected'
  | 'aborted'
  | 'empty'
  | 'truncated'
  | 'unusable';

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

/** Credentials, models and time budget for one completion (from config). */
export interface GroqSettings {
  apiKey: string;
  model: string;
  fallbackModel: string;
  /** Total budget for primary + fallback attempts. */
  timeoutMs: number;
}

/** Prompts and generation limits for one JSON completion. */
export interface JsonCompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  /** When the primary model's answer fails this check, the fallback model gets one try. */
  isUsable?: (content: string) => boolean;
}

/** Raw JSON text from the model that answered (validated by the caller). */
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
  'truncated',
  'unusable',
]);

// Reasoning models spend completion tokens on hidden reasoning before the JSON;
// keeping it short leaves room for the answer and cuts latency.
const REASONING_MODEL = /^openai\/gpt-oss/;

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
 * fallback model after a timeout, 429, 5xx, 404, a truncated answer or one that
 * fails `request.isUsable`. The fallback model's answer is returned as is, so the
 * caller's own validation decides (and can log why) if it is still unusable.
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
    if (request.isUsable && !request.isUsable(content)) throw new AiCallError('unusable');
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
        max_completion_tokens: request.maxTokens,
        ...(REASONING_MODEL.test(model)
          ? { reasoning_effort: 'low' as const, include_reasoning: false }
          : {}),
      },
      { signal: controller.signal },
    );
    const choice = completion.choices[0];
    // A cut-off answer can still be valid JSON (missing fields), so reject it here.
    if (choice?.finish_reason === 'length') throw new AiCallError('truncated');
    const content = choice?.message.content;
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
