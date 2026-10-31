/**
 * The only module that reads process.env. Validates configuration once at startup
 * so a misconfigured deploy fails fast instead of misbehaving at request time.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const APP_VERSION = '1.0.0';

/** Treats empty strings as "not set" so `KEY=` in .env falls back to defaults. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const EnvSchema = z.object({
  NODE_ENV: optional(z.enum(['development', 'test', 'production'])),
  PORT: optional(z.coerce.number().int().min(1).max(65_535)),
  GROQ_API_KEY: optional(z.string().trim().min(1)),
  GROQ_MODEL: optional(z.string().trim().min(1)),
  GROQ_FALLBACK_MODEL: optional(z.string().trim().min(1)),
  AI_TIMEOUT_MS: optional(z.coerce.number().int().min(1_000).max(60_000)),
  RATE_LIMIT_PER_MIN: optional(z.coerce.number().int().min(1).max(1_000)),
});

export interface AppConfig {
  readonly env: 'development' | 'test' | 'production';
  readonly port: number;
  readonly groqApiKey: string | undefined;
  readonly groqModel: string;
  readonly groqFallbackModel: string;
  readonly aiTimeoutMs: number;
  readonly rateLimitPerMin: number;
}

/**
 * Builds the app configuration from an environment object.
 * @throws if a value is invalid, or if GROQ_API_KEY is missing in production.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    // Only variable names are reported, never their values.
    const names = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration: ${names}`);
  }
  const values = parsed.data;
  const config: AppConfig = {
    env: values.NODE_ENV ?? 'development',
    port: values.PORT ?? 3000,
    groqApiKey: values.GROQ_API_KEY,
    groqModel: values.GROQ_MODEL ?? 'openai/gpt-oss-120b',
    groqFallbackModel: values.GROQ_FALLBACK_MODEL ?? 'openai/gpt-oss-20b',
    aiTimeoutMs: values.AI_TIMEOUT_MS ?? 15_000,
    rateLimitPerMin: values.RATE_LIMIT_PER_MIN ?? 20,
  };
  if (config.env === 'production' && !config.groqApiKey) {
    throw new Error('GROQ_API_KEY is required in production');
  }
  return Object.freeze(config);
}

/** True when a Groq key is configured; the AI layer falls back to templates otherwise. */
export function isAiConfigured(config: AppConfig): boolean {
  return Boolean(config.groqApiKey);
}

/** Loads the repo-root .env into process.env for local development, if it exists. */
export function loadDotEnv(): void {
  const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}
