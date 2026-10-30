import { describe, expect, it } from 'vitest';
import {
  BudgetPlanSchema,
  EnginePlanSchema,
  EventInputSchema,
  PlanPatchSchema,
  type EventInput,
} from './contracts.js';
import { buildPlan } from './engine/index.js';

const validInput: EventInput = {
  eventType: 'birthday',
  title: 'Aarav turns 7',
  eventDate: '2026-12-20',
  city: 'Ludhiana',
  cityTier: 'tier2',
  guestCount: 40,
  budget: 60000,
  currency: 'INR',
  vibe: 'space explorers',
  priorities: ['food', 'entertainment'],
  constraints: ['vegetarian', 'kid_friendly'],
  traditions: '',
  notes: 'Grandparents attending',
  language: 'en',
};

describe('EventInputSchema', () => {
  it('accepts the documented example payload', () => {
    expect(EventInputSchema.parse(validInput)).toEqual(validInput);
  });

  it('rejects unknown fields', () => {
    expect(EventInputSchema.safeParse({ ...validInput, admin: true }).success).toBe(false);
  });

  it('rejects more than three or duplicate priorities', () => {
    const tooMany = { ...validInput, priorities: ['food', 'decor', 'venue', 'gifts'] };
    const duplicated = { ...validInput, priorities: ['food', 'food'] };
    expect(EventInputSchema.safeParse(tooMany).success).toBe(false);
    expect(EventInputSchema.safeParse(duplicated).success).toBe(false);
  });

  it('rejects out-of-range numbers, bad dates and oversized text', () => {
    expect(EventInputSchema.safeParse({ ...validInput, guestCount: 0 }).success).toBe(false);
    expect(EventInputSchema.safeParse({ ...validInput, budget: 10.5 }).success).toBe(false);
    expect(EventInputSchema.safeParse({ ...validInput, eventDate: '2026-02-30' }).success).toBe(
      false,
    );
    expect(EventInputSchema.safeParse({ ...validInput, notes: 'x'.repeat(501) }).success).toBe(
      false,
    );
  });

  it('trims free text', () => {
    expect(EventInputSchema.parse({ ...validInput, city: '  Pune  ' }).city).toBe('Pune');
  });
});

describe('BudgetPlanSchema', () => {
  it('rejects lines that do not sum to the total', () => {
    const result = BudgetPlanSchema.safeParse({
      total: 1000,
      currency: 'INR',
      perGuest: 100,
      lines: [{ category: 'contingency', amount: 900, percent: 90, note: '' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('PlanPatchSchema', () => {
  it('rejects fields the AI is not allowed to change', () => {
    expect(PlanPatchSchema.safeParse({ currency: 'USD' }).success).toBe(false);
  });
});

describe('engine port', () => {
  it('produces a schema-valid plan', () => {
    const plan = buildPlan(validInput, new Date('2026-10-31T00:00:00Z'));
    expect(EnginePlanSchema.safeParse(plan).success).toBe(true);
  });
});
