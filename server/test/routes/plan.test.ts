import {
  ApiErrorSchema,
  EnginePlanSchema,
  PlanResponseSchema,
  RefineResponseSchema,
} from '@utsav/shared';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/logger.js';
import { aiIdeas, birthdayInput, completion, httpError, testConfig } from '../fixtures.js';

const create = vi.hoisted(() => vi.fn());
vi.mock('groq-sdk', () => ({
  default: class {
    chat = { completions: { create } };
  },
}));

// The default AI service reads config on first use; give it a fake key (Groq is mocked).
beforeAll(() => {
  vi.stubEnv('GROQ_API_KEY', 'gsk_fake_test_key');
});

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(completion(JSON.stringify(aiIdeas)));
});

afterEach(() => {
  vi.useRealTimers();
});

const app = createApp({
  config: testConfig({ rateLimitPerMin: 1_000 }),
  logger: createLogger({ write: () => undefined }),
  webDist: 'no-web-dist',
});

const postPlan = (body: unknown) =>
  request(app)
    .post('/api/plan')
    .send(body as object);

describe('POST /api/plan', () => {
  it('returns 200 with a contract-valid plan and AI ideas', async () => {
    const res = await postPlan({ ...birthdayInput, notes: 'unique-success-case' });
    expect(res.status).toBe(200);
    const body = PlanResponseSchema.parse(res.body);
    expect(body.aiStatus).toBe('ai');
    expect(body.ideas).toEqual(aiIdeas);
    expect(body.plan.input.title).toBe(birthdayInput.title);
    expect(body.plan.budget.total).toBe(birthdayInput.budget);
  });

  it('returns 200 with fallback ideas when Groq is rate-limited', async () => {
    create.mockReset();
    create.mockRejectedValue(httpError(429));
    const res = await postPlan({ ...birthdayInput, notes: 'unique-429-case' });
    expect(res.status).toBe(200);
    expect(PlanResponseSchema.parse(res.body).aiStatus).toBe('fallback');
  });

  it('builds the plan with the request clock as "today"', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-05T10:00:00Z'), toFake: ['Date'] });
    const res = await postPlan({ ...birthdayInput, notes: 'unique-clock-case' });
    expect(EnginePlanSchema.parse(res.body.plan).generatedAt.slice(0, 10)).toBe('2026-11-05');
  });

  it.each([
    ['a missing field', { ...birthdayInput, city: undefined }, 'city'],
    ['a wrong type', { ...birthdayInput, guestCount: 'forty' }, 'guestCount'],
    ['an unknown field', { ...birthdayInput, isAdmin: true }, ''],
    ['an invalid date', { ...birthdayInput, eventDate: '2099-13-40' }, 'eventDate'],
    ['over-long notes', { ...birthdayInput, notes: 'x'.repeat(501) }, 'notes'],
    [
      'too many priorities',
      { ...birthdayInput, priorities: ['food', 'venue', 'decor', 'gifts'] },
      'priorities',
    ],
  ])('returns 400 ApiError for %s', async (_case, body, path) => {
    const res = await postPlan(body);
    expect(res.status).toBe(400);
    const error = ApiErrorSchema.parse(res.body).error;
    expect(error.code).toBe('VALIDATION');
    expect(error.issues?.map((issue) => issue.path)).toContain(path);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 400 for an event date in the past', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-05T10:00:00Z'), toFake: ['Date'] });
    const res = await postPlan({ ...birthdayInput, eventDate: '2026-11-04' });
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(res.body).error.issues).toEqual([
      { path: 'eventDate', message: 'Event date must be today or later.' },
    ]);
  });

  it('accepts an event today', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-05T10:00:00Z'), toFake: ['Date'] });
    const res = await postPlan({ ...birthdayInput, eventDate: '2026-11-05' });
    expect(res.status).toBe(200);
  });
});

describe('clientToday (CCR-02: plan with the browser’s local date)', () => {
  // 18:00 UTC is 23:30 IST: an Indian user is already on the next calendar day.
  const serverNow = new Date('2026-11-05T18:00:00Z');
  const istTomorrow = '2026-11-06';

  beforeEach(() => {
    vi.useFakeTimers({ now: serverNow, toFake: ['Date'] });
  });

  it('plans from the client’s day just after local midnight, and strips clientToday', async () => {
    const res = await postPlan({
      ...birthdayInput,
      eventDate: istTomorrow,
      clientToday: istTomorrow,
    });
    expect(res.status).toBe(200);
    const body = PlanResponseSchema.parse(res.body);
    expect(body.plan.generatedAt.slice(0, 10)).toBe(istTomorrow);
    expect(body.plan.input).not.toHaveProperty('clientToday');
  });

  it('rejects a date that is already past on the client’s calendar', async () => {
    const res = await postPlan({
      ...birthdayInput,
      eventDate: '2026-11-05',
      clientToday: istTomorrow,
    });
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(res.body).error.issues?.[0]?.path).toBe('eventDate');
  });

  it('ignores an implausible clientToday and uses the server day', async () => {
    const res = await postPlan({ ...birthdayInput, clientToday: '2027-03-01' });
    expect(res.status).toBe(200);
    expect(PlanResponseSchema.parse(res.body).plan.generatedAt.slice(0, 10)).toBe('2026-11-05');
  });

  it('rejects a malformed clientToday', async () => {
    const res = await postPlan({ ...birthdayInput, clientToday: 'tomorrow' });
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(res.body).error.issues?.[0]?.path).toBe('clientToday');
  });

  it('applies to /refine too', async () => {
    const res = await request(app)
      .post('/api/refine')
      .send({ input: birthdayInput, message: 'More fun games', clientToday: istTomorrow });
    expect(res.status).toBe(200);
    const body = RefineResponseSchema.parse(res.body);
    expect(body.result.plan.generatedAt.slice(0, 10)).toBe(istTomorrow);
  });
});

describe('POST /api/refine', () => {
  it('returns 200 with a contract-valid RefineResponse', async () => {
    const res = await request(app)
      .post('/api/refine')
      .send({ input: birthdayInput, message: 'Make it more eco-friendly' });
    expect(res.status).toBe(200);
    expect(RefineResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('returns 400 for an empty message', async () => {
    const res = await request(app).post('/api/refine').send({ input: birthdayInput, message: ' ' });
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(res.body).error.issues?.[0]?.path).toBe('message');
  });
});
