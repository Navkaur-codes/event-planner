/**
 * GenAI layer: personalized ideas and refine-request interpretation from Groq,
 * validated (and ideas cached), with deterministic fallbacks so the planner never
 * depends on the AI being up. Public API matches docs/contracts.md §3.
 */
import type {
  AiIdeas,
  AiStatus,
  EnginePlan,
  EventInput,
  PlanPatch,
  PortStatus,
} from '@utsav/shared';
import { isAiConfigured, loadConfig, type AppConfig } from '../config.js';
import { createLogger, type Logger } from '../logger.js';
import { cacheKey, createLruCache, type LruCache } from './cache.js';
import { fallbackIdeas } from './fallback.js';
import { AiCallError, completeJson, type JsonCompletion } from './groqClient.js';
import { parseIdeas } from './parse.js';
import { parsePatch } from './parsePatch.js';
import { buildIdeasPrompt, buildRefinePrompt, type PromptPair } from './prompts.js';
import { parseRefinement } from './refineParser.js';

export { fallbackIdeas } from './fallback.js';

export const IMPLEMENTATION: PortStatus = 'real';

export interface AiOptions {
  signal?: AbortSignal;
}

export interface IdeasOptions extends AiOptions {
  /** What the ideas should lean towards (from a refine patch); treated as user data. */
  ideaFocus?: string;
}

export interface IdeasResult {
  ideas: AiIdeas;
  aiStatus: AiStatus;
}

export interface RefinementResult {
  patch: PlanPatch;
  explanation: string;
  aiStatus: AiStatus;
}

export interface AiService {
  generateIdeas(input: EventInput, plan: EnginePlan, options?: IdeasOptions): Promise<IdeasResult>;
  interpretRefinement(
    input: EventInput,
    message: string,
    options?: AiOptions,
  ): Promise<RefinementResult>;
}

interface AiDependencies {
  config: AppConfig;
  logger: Logger;
  cache?: LruCache<AiIdeas>;
}

// Each covers a short hidden reasoning pass plus the JSON answer.
const IDEAS = { maxTokens: 2_000, temperature: 0.7 } as const;
// Low temperature: a patch should be a faithful reading of the request, not creative.
const REFINE = { maxTokens: 800, temperature: 0.2 } as const;
const CACHE_LIMITS = { maxEntries: 200, ttlMs: 60 * 60 * 1_000 } as const;

/**
 * Creates the AI service with explicit dependencies (used directly by tests).
 * Logs only status, model, latency, failure reason and field names — never
 * prompts, user text or keys.
 */
export function createAiService({
  config,
  logger,
  cache = createLruCache<AiIdeas>(CACHE_LIMITS),
}: AiDependencies): AiService {
  const apiKey = isAiConfigured(config) ? config.groqApiKey : undefined;

  const call = (
    prompt: PromptPair,
    limits: { maxTokens: number; temperature: number },
    key: string,
    signal: AbortSignal | undefined,
  ): Promise<JsonCompletion> =>
    completeJson(
      {
        apiKey: key,
        model: config.groqModel,
        fallbackModel: config.groqFallbackModel,
        timeoutMs: config.aiTimeoutMs,
      },
      { ...prompt, ...limits },
      signal,
    );

  const failureOf = (error: unknown) =>
    error instanceof AiCallError
      ? { reason: error.reason, status: error.status }
      : { reason: 'unexpected' };

  return {
    async generateIdeas(input, plan, options = {}) {
      const fallback = (failure: { reason: string; status?: number }): IdeasResult => {
        logger.warn('ai.ideas', { aiStatus: 'fallback', ...failure });
        return { ideas: fallbackIdeas(input), aiStatus: 'fallback' };
      };
      if (!apiKey) return fallback({ reason: 'not_configured' });

      const prompt = buildIdeasPrompt(input, plan, options.ideaFocus);
      const key = cacheKey(config.groqModel, prompt.system, prompt.user);
      const cached = cache.get(key);
      if (cached) {
        logger.info('ai.ideas', { aiStatus: 'ai', cacheHit: true });
        return { ideas: cached, aiStatus: 'ai' };
      }

      const started = performance.now();
      try {
        const completion = await call(prompt, IDEAS, apiKey, options.signal);
        const parsed = parseIdeas(completion.content);
        if (!parsed.ok) return fallback({ reason: `invalid_output:${parsed.failure}` });
        cache.set(key, parsed.ideas);
        logger.info('ai.ideas', {
          aiStatus: 'ai',
          cacheHit: false,
          model: completion.model,
          latencyMs: Math.round(performance.now() - started),
        });
        return { ideas: parsed.ideas, aiStatus: 'ai' };
      } catch (error) {
        return fallback(failureOf(error));
      }
    },

    async interpretRefinement(input, message, options = {}) {
      const fallback = (failure: { reason: string; status?: number }): RefinementResult => {
        const { patch, explanation } = parseRefinement(input, message);
        logger.warn('ai.refine', {
          aiStatus: 'fallback',
          ...failure,
          patchFields: Object.keys(patch),
        });
        return { patch, explanation, aiStatus: 'fallback' };
      };
      if (!apiKey) return fallback({ reason: 'not_configured' });

      const started = performance.now();
      try {
        const completion = await call(
          buildRefinePrompt(input, message),
          REFINE,
          apiKey,
          options.signal,
        );
        const parsed = parsePatch(completion.content, input, message);
        if (!parsed.ok) return fallback({ reason: `invalid_output:${parsed.failure}` });
        logger.info('ai.refine', {
          aiStatus: 'ai',
          model: completion.model,
          latencyMs: Math.round(performance.now() - started),
          patchFields: Object.keys(parsed.value.patch),
        });
        return { ...parsed.value, aiStatus: 'ai' };
      } catch (error) {
        return fallback(failureOf(error));
      }
    },
  };
}

let defaultService: AiService | undefined;

// Built on first use, after index.ts has loaded .env.
function service(): AiService {
  if (!defaultService) {
    const config = loadConfig();
    defaultService = createAiService({
      config,
      logger: createLogger({
        level: config.env === 'test' ? 'error' : 'info',
        secrets: config.groqApiKey ? [config.groqApiKey] : [],
      }),
    });
  }
  return defaultService;
}

/** Generates personalized ideas for a plan; never throws — falls back instead. */
export function generateIdeas(
  input: EventInput,
  plan: EnginePlan,
  options: IdeasOptions = {},
): Promise<IdeasResult> {
  return service().generateIdeas(input, plan, options);
}

/**
 * Turns a free-text request into a validated PlanPatch and a one-line explanation;
 * never throws — falls back to fixed rules, then to an idea-focus-only patch.
 */
export function interpretRefinement(
  input: EventInput,
  message: string,
  options: AiOptions = {},
): Promise<RefinementResult> {
  return service().interpretRefinement(input, message, options);
}
