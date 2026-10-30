import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ApiErrorSchema,
  HealthResponseSchema,
  PlanResponseSchema,
  RefineResponseSchema,
  type EventInput,
} from '@utsav/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

const silentLogger = createLogger({ write: () => undefined });
const missingWebDist = join(tmpdir(), 'utsav-no-web-dist');

function makeApp(env: NodeJS.ProcessEnv = {}, webDist = missingWebDist) {
  return createApp({
    config: loadConfig({ NODE_ENV: 'test', ...env }),
    logger: silentLogger,
    webDist,
  });
}

const input: EventInput = {
  eventType: 'wedding',
  title: 'Priya & Kabir',
  eventDate: '2099-02-14',
  city: 'Jaipur',
  cityTier: 'tier2',
  guestCount: 250,
  budget: 1_500_000,
  currency: 'INR',
  vibe: 'royal Rajasthani',
  priorities: ['venue', 'food', 'photography'],
  constraints: ['vegetarian'],
  traditions: 'Hindu ceremonies',
  notes: '',
  language: 'en',
};

describe('GET /api/health', () => {
  it('reports status, version, ports and whether AI is configured — never the key', async () => {
    const res = await request(makeApp({ GROQ_API_KEY: 'gsk_testsecretvalue123' })).get(
      '/api/health',
    );
    expect(res.status).toBe(200);
    const body = HealthResponseSchema.parse(res.body);
    expect(body.aiConfigured).toBe(true);
    expect(res.text).not.toContain('gsk_');
  });

  it('sends security headers', async () => {
    const res = await request(makeApp()).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('API error handling', () => {
  it('returns 404 ApiError for unknown API routes', async () => {
    const res = await request(makeApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(makeApp())
      .post('/api/plan')
      .set('Content-Type', 'application/json')
      .send('{"eventType":');
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('VALIDATION');
  });

  it('returns 413 for oversized bodies', async () => {
    const res = await request(makeApp())
      .post('/api/plan')
      .send({ ...input, notes: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
  });

  it('returns 400 with issues for invalid input', async () => {
    const res = await request(makeApp())
      .post('/api/plan')
      .send({ ...input, guestCount: -5 });
    expect(res.status).toBe(400);
    expect(ApiErrorSchema.parse(res.body).error.issues?.[0]?.path).toBe('guestCount');
  });

  it('rate-limits API requests per client', async () => {
    const app = makeApp({ RATE_LIMIT_PER_MIN: '2' });
    await request(app).post('/api/plan').send(input);
    await request(app).post('/api/plan').send(input);
    const res = await request(app).post('/api/plan').send(input);
    expect(res.status).toBe(429);
    expect(ApiErrorSchema.parse(res.body).error.code).toBe('RATE_LIMITED');
  });
});

describe('plan and refine routes (through ports)', () => {
  it('POST /api/plan returns a contract-valid PlanResponse', async () => {
    const res = await request(makeApp()).post('/api/plan').send(input);
    expect(res.status).toBe(200);
    expect(PlanResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('POST /api/refine returns a contract-valid RefineResponse', async () => {
    const res = await request(makeApp())
      .post('/api/refine')
      .send({ input, message: 'Make it more eco-friendly' });
    expect(res.status).toBe(200);
    expect(RefineResponseSchema.safeParse(res.body).success).toBe(true);
  });
});

describe('static web app', () => {
  it('serves index.html for client-side routes', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'utsav-web-'));
    mkdirSync(join(dist, 'assets'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Utsav</title>');
    const res = await request(makeApp({}, dist)).get('/plan/123');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Utsav</title>');
  });
});
