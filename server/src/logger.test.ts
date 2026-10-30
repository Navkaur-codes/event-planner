import { describe, expect, it } from 'vitest';
import { createLogger, redact } from './logger.js';

describe('redact', () => {
  it('masks Groq keys, bearer tokens and api-key assignments', () => {
    expect(redact('key gsk_abc123XYZ here')).toBe('key [REDACTED] here');
    expect(redact('Authorization: Bearer abc.def')).not.toContain('abc.def');
    expect(redact('GROQ_API_KEY=supersecret')).toBe('GROQ_API_KEY=[REDACTED]');
  });

  it('masks explicitly provided secret values', () => {
    expect(redact('value=plainsecret', ['plainsecret'])).not.toContain('plainsecret');
  });
});

describe('createLogger', () => {
  it('writes redacted JSON lines and respects the level', () => {
    const lines: string[] = [];
    const logger = createLogger({ level: 'info', write: (line) => lines.push(line) });
    logger.debug('hidden');
    logger.info('call failed', { detail: 'gsk_leakedkey99' });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ level: 'info', message: 'call failed' });
    expect(lines[0]).not.toContain('gsk_leakedkey99');
  });
});
