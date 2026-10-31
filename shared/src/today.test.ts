import { describe, expect, it } from 'vitest';
import { PlanRequestSchema, RefineRequestSchema } from './contracts.js';
import { resolveToday } from './today.js';

// 23:30 IST on 1 Nov 2026 is still 31 Oct in UTC.
const serverNow = new Date('2026-10-31T18:00:00Z');

describe('resolveToday', () => {
  it('uses the server clock when the client sends no date', () => {
    expect(resolveToday(undefined, serverNow)).toBe(serverNow);
  });

  it("uses the browser's local date when it is a day ahead (e.g. India after midnight)", () => {
    expect(resolveToday('2026-11-01', serverNow).toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('accepts a local date one day behind (e.g. the Americas)', () => {
    expect(resolveToday('2026-10-30', serverNow).toISOString()).toBe('2026-10-30T00:00:00.000Z');
  });

  it('ignores implausible client dates so nobody can plan in the past', () => {
    expect(resolveToday('2026-10-01', serverNow)).toBe(serverNow);
    expect(resolveToday('2026-11-02', serverNow)).toBe(serverNow);
    expect(resolveToday('not-a-date', serverNow)).toBe(serverNow);
  });
});

describe('request schemas (contracts v1.1)', () => {
  const input = {
    eventType: 'birthday',
    title: 'Aarav turns 7',
    eventDate: '2026-12-20',
    city: 'Ludhiana',
    cityTier: 'tier2',
    guestCount: 40,
    budget: 60000,
    currency: 'INR',
    vibe: '',
    priorities: [],
    constraints: [],
    traditions: '',
    notes: '',
    language: 'en',
  };

  it('accepts an optional clientToday on plan and refine requests', () => {
    expect(PlanRequestSchema.safeParse({ ...input, clientToday: '2026-11-01' }).success).toBe(true);
    expect(PlanRequestSchema.safeParse(input).success).toBe(true);
    expect(
      RefineRequestSchema.safeParse({ input, message: 'cut 20%', clientToday: '2026-11-01' })
        .success,
    ).toBe(true);
  });

  it('still rejects unknown fields and malformed dates', () => {
    expect(PlanRequestSchema.safeParse({ ...input, admin: true }).success).toBe(false);
    expect(PlanRequestSchema.safeParse({ ...input, clientToday: '1/11/2026' }).success).toBe(false);
  });
});
