/**
 * GenAI layer: personalized ideas from Groq, validated and cached, with a
 * deterministic fallback so a plan never depends on the AI being up.
 * Public API matches docs/contracts.md §3.
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
import { AiCallError, completeJson } from './groqClient.js';
import { parseIdeas } from './parse.js';
import { buildIdeasPrompt } from './prompts.js';

export { fallbackIdeas } from './fallback.js';

export const IMPLEMENTATION: PortStatus = 'real';

export interface AiOptions {
  signal?: AbortSignal;
}

export interface IdeasResult {
  ideas: AiIdeas;
  aiStatus: AiStatus;
}

export interface AiService {
  generateIdeas(input: EventInput, plan: EnginePlan, options?: AiOptions): Promise<IdeasResult>;
}

interface AiDependencies {
  config: AppConfig;
  logger: Logger;
  cache?: LruCache<AiIdeas>;
}

// Covers a short hidden reasoning pass plus the ~700-token JSON answer.
const IDEAS_MAX_TOKENS = 2_000;
const IDEAS_TEMPERATURE = 0.7;
const CACHE_LIMITS = { maxEntries: 200, ttlMs: 60 * 60 * 1_000 } as const;

/**
 * Creates the AI service with explicit dependencies (used directly by tests).
 * Logs only status, model, latency and failure reason — never prompts or keys.
 */
export function createAiService({
  config,
  logger,
  cache = createLruCache<AiIdeas>(CACHE_LIMITS),
}: AiDependencies): AiService {
  return {
    async generateIdeas(input, plan, options = {}) {
      const fallback = (reason: string, status?: number): IdeasResult => {
        logger.warn('ai.ideas', { aiStatus: 'fallback', reason, status });
        return { ideas: fallbackIdeas(input), aiStatus: 'fallback' };
      };
      if (!isAiConfigured(config) || !config.groqApiKey) return fallback('not_configured');

      const prompt = buildIdeasPrompt(input, plan);
      const key = cacheKey(config.groqModel, prompt.system, prompt.user);
      const cached = cache.get(key);
      if (cached) {
        logger.info('ai.ideas', { aiStatus: 'ai', cacheHit: true });
        return { ideas: cached, aiStatus: 'ai' };
      }

      const started = performance.now();
      try {
        const completion = await completeJson(
          {
            apiKey: config.groqApiKey,
            model: config.groqModel,
            fallbackModel: config.groqFallbackModel,
            timeoutMs: config.aiTimeoutMs,
          },
          { ...prompt, maxTokens: IDEAS_MAX_TOKENS, temperature: IDEAS_TEMPERATURE },
          options.signal,
        );
        const latencyMs = Math.round(performance.now() - started);
        const parsed = parseIdeas(completion.content);
        if (!parsed.ok) return fallback(`invalid_output:${parsed.failure}`);
        const { ideas } = parsed;
        cache.set(key, ideas);
        logger.info('ai.ideas', {
          aiStatus: 'ai',
          cacheHit: false,
          model: completion.model,
          latencyMs,
        });
        return { ideas, aiStatus: 'ai' };
      } catch (error) {
        if (error instanceof AiCallError) return fallback(error.reason, error.status);
        return fallback('unexpected');
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
  options: AiOptions = {},
): Promise<IdeasResult> {
  return service().generateIdeas(input, plan, options);
}

/**
 * Turns a free-text request into a structured patch.
 * Phase 1 placeholder: records the message as the idea focus; the AI version lands in Phase 2.
 */
export async function interpretRefinement(
  _input: EventInput,
  message: string,
  _options: AiOptions = {},
): Promise<{ patch: PlanPatch; explanation: string; aiStatus: AiStatus }> {
  return {
    patch: { ideaFocus: message.slice(0, 200) },
    explanation: 'Noted your request for the ideas section.',
    aiStatus: 'fallback',
  };
}
