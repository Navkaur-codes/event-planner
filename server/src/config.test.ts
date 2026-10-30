import { describe, expect, it } from 'vitest';
import { isAiConfigured, loadConfig } from './config.js';

describe('loadConfig', () => {
  it('applies defaults and treats empty values as unset', () => {
    const config = loadConfig({ GROQ_API_KEY: '', PORT: '' });
    expect(config.port).toBe(3000);
    expect(config.groqModel).toBe('llama-3.3-70b-versatile');
    expect(isAiConfigured(config)).toBe(false);
  });

  it('fails fast without a Groq key in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('GROQ_API_KEY is required');
  });

  it('reports invalid variable names without echoing their values', () => {
    expect(() => loadConfig({ PORT: 'not-a-port-gsk_secret' })).toThrow(/PORT/);
    expect(() => loadConfig({ PORT: 'not-a-port-gsk_secret' })).not.toThrow(/gsk_secret/);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(loadConfig({}))).toBe(true);
  });
});
