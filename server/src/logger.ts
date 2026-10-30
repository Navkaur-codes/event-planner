/**
 * Minimal structured logger (JSON lines) that redacts secrets before anything is written.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogMeta = Record<string, unknown>;

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SECRET_PATTERNS: readonly RegExp[] = [
  /gsk_[A-Za-z0-9]+/g,
  /(bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
  /("?(?:authorization|api[_-]?key|groq_api_key)"?\s*[:=]\s*"?)[^\s",}]+/gi,
];

/** Replaces known secret shapes and any explicitly provided secret values with [REDACTED]. */
export function redact(text: string, secrets: readonly string[] = []): string {
  let output = text;
  for (const secret of secrets) {
    if (secret) output = output.split(secret).join('[REDACTED]');
  }
  for (const pattern of SECRET_PATTERNS) {
    output = output.replace(pattern, (match, prefix?: string) =>
      typeof prefix === 'string' && match.startsWith(prefix) ? `${prefix}[REDACTED]` : '[REDACTED]',
    );
  }
  return output;
}

interface LoggerOptions {
  level?: LogLevel;
  secrets?: readonly string[];
  write?: (line: string) => void;
}

/** Creates a logger; `write` is injectable so tests can capture output. */
export function createLogger(options: LoggerOptions = {}): Logger {
  const minLevel = LEVEL_ORDER[options.level ?? 'info'];
  const secrets = options.secrets ?? [];
  const write = options.write ?? ((line: string) => process.stdout.write(`${line}\n`));

  const log = (level: LogLevel, message: string, meta?: LogMeta) => {
    if (LEVEL_ORDER[level] < minLevel) return;
    const entry = { time: new Date().toISOString(), level, message, ...meta };
    write(redact(JSON.stringify(entry, errorReplacer), secrets));
  };

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  };
}

function errorReplacer(_key: string, value: unknown): unknown {
  return value instanceof Error ? { name: value.name, message: value.message } : value;
}
