import { AiIdeasSchema, buildPlan } from '@utsav/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAiService } from '../../src/ai/index.js';
import { createLogger } from '../../src/logger.js';
import {
  aiIdeas,
  birthdayInput,
  completion,
  hangUntilAborted,
  httpError,
  testConfig,
} from '../fixtures.js';

const create = vi.hoisted(() => vi.fn());
vi.mock('groq-sdk', () => ({
  default: class {
    chat = { completions: { create } };
  },
}));

const plan = buildPlan(birthdayInput, new Date('2026-10-31T00:00:00Z'));

function makeService(config = testConfig()) {
  const lines: string[] = [];
  const logger = createLogger({ level: 'debug', write: (line) => lines.push(line) });
  return { service: createAiService({ config, logger }), lines };
}

beforeEach(() => {
  create.mockReset();
});

describe('generateIdeas', () => {
  it('returns validated AI ideas with aiStatus "ai"', async () => {
    create.mockResolvedValue(completion(JSON.stringify(aiIdeas)));
    const { service } = makeService();
    const result = await service.generateIdeas(birthdayInput, plan);
    expect(result).toEqual({ ideas: aiIdeas, aiStatus: 'ai' });
    const [body] = create.mock.calls[0] ?? [];
    expect(body).toMatchObject({
      model: testConfig().groqModel,
      response_format: { type: 'json_object' },
      max_completion_tokens: 2_000,
      reasoning_effort: 'low',
      include_reasoning: false,
    });
  });

  it('sends reasoning options only to gpt-oss reasoning models', async () => {
    create.mockResolvedValue(completion(JSON.stringify(aiIdeas)));
    const { service } = makeService(testConfig({ groqModel: 'qwen/qwen3.8-27b' }));
    await service.generateIdeas(birthdayInput, plan);
    const [body] = create.mock.calls[0] ?? [];
    expect(body).not.toHaveProperty('reasoning_effort');
    expect(body).not.toHaveProperty('include_reasoning');
  });

  // GATE-1 regression: gpt-oss spent its token budget on reasoning, and Groq returned
  // parseable JSON cut off after "themes" with finish_reason "length".
  const truncatedAnswer = {
    choices: [
      {
        finish_reason: 'length',
        message: { content: JSON.stringify({ summary: aiIdeas.summary, themes: aiIdeas.themes }) },
      },
    ],
  };

  it('treats a truncated answer as a failure and retries on the fallback model', async () => {
    create
      .mockResolvedValueOnce(truncatedAnswer)
      .mockResolvedValueOnce(completion(JSON.stringify(aiIdeas)));
    const { service } = makeService();
    const result = await service.generateIdeas(birthdayInput, plan);
    expect(result).toEqual({ ideas: aiIdeas, aiStatus: 'ai' });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('falls back and logs "truncated" when both models run out of tokens', async () => {
    create.mockResolvedValue(truncatedAnswer);
    const { service, lines } = makeService();
    const result = await service.generateIdeas(birthdayInput, plan);
    expect(result.aiStatus).toBe('fallback');
    expect(lines.join('\n')).toContain('"reason":"truncated"');
  });

  it('logs which fields failed validation, without their content', async () => {
    create.mockResolvedValue(completion(JSON.stringify({ summary: 'private plan text' })));
    const { service, lines } = makeService();
    await service.generateIdeas(birthdayInput, plan);
    const log = lines.join('\n');
    expect(log).toContain('"reason":"invalid_output:schema:themes,decor,food');
    expect(log).not.toContain('private plan text');
  });

  it.each([
    ['invalid JSON', () => create.mockResolvedValue(completion('{"summary": oops'))],
    ['schema-invalid JSON', () => create.mockResolvedValue(completion('{"summary": "hi"}'))],
    ['empty content', () => create.mockResolvedValue(completion(''))],
    ['a timeout on both models', () => create.mockImplementation(hangUntilAborted)],
    ['429 on both models', () => create.mockRejectedValue(httpError(429))],
    ['401 bad key', () => create.mockRejectedValue(httpError(401))],
    ['a network error', () => create.mockRejectedValue(new TypeError('fetch failed'))],
  ])('falls back on %s', async (_case, arrange) => {
    arrange();
    const { service } = makeService();
    const result = await service.generateIdeas(birthdayInput, plan);
    expect(result.aiStatus).toBe('fallback');
    expect(AiIdeasSchema.safeParse(result.ideas).success).toBe(true);
  });

  it('falls back without any network call when no key is configured', async () => {
    const { service } = makeService(testConfig({ groqApiKey: undefined }));
    const result = await service.generateIdeas(birthdayInput, plan);
    expect(result.aiStatus).toBe('fallback');
    expect(create).not.toHaveBeenCalled();
  });

  it('retries once on the fallback model after a 429', async () => {
    create
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValueOnce(completion(JSON.stringify(aiIdeas)));
    const { service } = makeService();
    const result = await service.generateIdeas(birthdayInput, plan);
    expect(result.aiStatus).toBe('ai');
    const { groqModel, groqFallbackModel } = testConfig();
    expect(create.mock.calls.map(([body]) => (body as { model: string }).model)).toEqual([
      groqModel,
      groqFallbackModel,
    ]);
  });

  it('retries on the fallback model after a primary timeout, within the total budget', async () => {
    create
      .mockImplementationOnce(hangUntilAborted)
      .mockResolvedValueOnce(completion(JSON.stringify(aiIdeas)));
    const { service } = makeService();
    const started = Date.now();
    const result = await service.generateIdeas(birthdayInput, plan);
    expect(result.aiStatus).toBe('ai');
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('retries on the fallback model when the primary model is retired (404)', async () => {
    create
      .mockRejectedValueOnce(httpError(404))
      .mockResolvedValueOnce(completion(JSON.stringify(aiIdeas)));
    const { service } = makeService();
    expect((await service.generateIdeas(birthdayInput, plan)).aiStatus).toBe('ai');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('retries on the fallback model when the primary answer fails validation', async () => {
    create
      .mockResolvedValueOnce(completion(JSON.stringify({ ...aiIdeas, personalTouches: [] })))
      .mockResolvedValueOnce(completion(JSON.stringify(aiIdeas)));
    const { service, lines } = makeService();
    const result = await service.generateIdeas(birthdayInput, plan);
    expect(result).toEqual({ ideas: aiIdeas, aiStatus: 'ai' });
    const models = create.mock.calls.map(([body]) => (body as { model: string }).model);
    expect(models).toEqual([testConfig().groqModel, testConfig().groqFallbackModel]);
    expect(lines.join('\n')).toContain(`"model":"${testConfig().groqFallbackModel}"`);
  });

  it('reports the fallback model’s validation failure when both answers are unusable', async () => {
    create.mockResolvedValue(completion(JSON.stringify({ ...aiIdeas, personalTouches: [] })));
    const { service, lines } = makeService();
    expect((await service.generateIdeas(birthdayInput, plan)).aiStatus).toBe('fallback');
    expect(create).toHaveBeenCalledTimes(2);
    expect(lines.join('\n')).toContain('invalid_output:schema:personalTouches');
  });

  it('does not retry on other 4xx errors', async () => {
    create.mockRejectedValue(httpError(400));
    const { service } = makeService();
    await service.generateIdeas(birthdayInput, plan);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('stops when the caller aborts', async () => {
    create.mockImplementation(hangUntilAborted);
    const { service } = makeService(testConfig({ aiTimeoutMs: 10_000 }));
    const controller = new AbortController();
    const pending = service.generateIdeas(birthdayInput, plan, { signal: controller.signal });
    controller.abort();
    expect((await pending).aiStatus).toBe('fallback');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('serves the same input from cache (Groq called once)', async () => {
    create.mockResolvedValue(completion(JSON.stringify(aiIdeas)));
    const { service, lines } = makeService();
    const first = await service.generateIdeas(birthdayInput, plan);
    const second = await service.generateIdeas(birthdayInput, plan);
    expect(second).toEqual(first);
    expect(create).toHaveBeenCalledTimes(1);
    expect(lines.some((line) => line.includes('"cacheHit":true'))).toBe(true);
  });

  it('does not cache fallbacks, so the next request tries the AI again', async () => {
    create.mockRejectedValueOnce(httpError(500)).mockRejectedValueOnce(httpError(500));
    create.mockResolvedValue(completion(JSON.stringify(aiIdeas)));
    const { service } = makeService();
    expect((await service.generateIdeas(birthdayInput, plan)).aiStatus).toBe('fallback');
    expect((await service.generateIdeas(birthdayInput, plan)).aiStatus).toBe('ai');
  });

  it('never logs the key, prompts or user text', async () => {
    create.mockResolvedValue(completion(JSON.stringify(aiIdeas)));
    const { service, lines } = makeService();
    await service.generateIdeas(birthdayInput, plan);
    create.mockRejectedValue(httpError(429));
    await service.generateIdeas({ ...birthdayInput, title: 'Another party' }, plan);
    const log = lines.join('\n');
    expect(log).not.toContain('gsk_');
    expect(log).not.toContain(birthdayInput.notes);
    expect(log).not.toContain('Another party');
  });
});
