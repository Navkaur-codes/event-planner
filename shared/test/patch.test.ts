import { describe, expect, it } from 'vitest';
import { EventInputSchema, LIMITS, type EventInput, type PlanPatch } from '../src/contracts.js';
import { applyPatch } from '../src/engine/index.js';
import { makeInput } from './fixtures.js';

describe('applyPatch', () => {
  it('moves the event to a new city and size, and switches the idea language (v1.2)', () => {
    const moved = applyPatch(makeInput(), { city: '  Delhi ', cityTier: 'metro', language: 'hi' });
    expect(moved).toMatchObject({ city: 'Delhi', cityTier: 'metro', language: 'hi' });
    expect(EventInputSchema.safeParse(moved).success).toBe(true);
    const unchanged = applyPatch(makeInput(), {});
    expect(unchanged).toMatchObject({
      city: makeInput().city,
      cityTier: makeInput().cityTier,
      language: makeInput().language,
    });
  });

  it('applies a percentage change exactly', () => {
    expect(applyPatch(makeInput(), { budgetChangePercent: -20 }).budget).toBe(48_000);
  });

  it('lets an absolute budget win over a percentage', () => {
    expect(applyPatch(makeInput(), { budget: 75_000, budgetChangePercent: 50 }).budget).toBe(
      75_000,
    );
  });

  it('clamps numbers to the input limits', () => {
    expect(applyPatch(makeInput({ budget: 1_000 }), { budgetChangePercent: -90 }).budget).toBe(
      1_000,
    );
    expect(applyPatch(makeInput({ budget: 90_000_000 }), { budgetChangePercent: 200 }).budget).toBe(
      100_000_000,
    );
    expect(applyPatch(makeInput(), { guestCount: 9_000 }).guestCount).toBe(5_000);
  });

  it('treats constraints as sets and keeps indoor/outdoor exclusive', () => {
    const input = makeInput({ constraints: ['indoor', 'vegetarian'] });
    const patched = applyPatch(input, {
      addConstraints: ['outdoor', 'vegetarian'],
      removeConstraints: ['vegetarian'],
    });
    expect(patched.constraints).toEqual(['outdoor', 'vegetarian']);
    expect(applyPatch(input, { removeConstraints: ['indoor'] }).constraints).toEqual([
      'vegetarian',
    ]);
  });

  it('replaces priorities, trims vibe and updates the date and guests', () => {
    const patched = applyPatch(makeInput(), {
      priorities: ['venue'],
      vibe: '  retro 90s  ',
      eventDate: '2027-01-10',
      guestCount: 55,
      ideaFocus: 'more eco-friendly decor',
    });
    expect(patched).toMatchObject({
      priorities: ['venue'],
      vibe: 'retro 90s',
      eventDate: '2027-01-10',
      guestCount: 55,
    });
  });

  it('is pure and always returns a valid input', () => {
    const input = makeInput();
    const snapshot = JSON.parse(JSON.stringify(input)) as typeof input;
    const patched = applyPatch(input, { addConstraints: ['halal'], budgetChangePercent: 33.3 });
    expect(input).toEqual(snapshot);
    expect(EventInputSchema.safeParse(patched).success).toBe(true);
    expect(applyPatch(input, {})).toEqual(input);
  });
});

describe('applyPatch field matrix', () => {
  const base = makeInput({ constraints: ['indoor', 'vegetarian'] });

  // One patch per PlanPatch field, with the input fields it is allowed to change.
  const single: [string, PlanPatch, Partial<EventInput>][] = [
    ['budget', { budget: 80_000 }, { budget: 80_000 }],
    ['budgetChangePercent', { budgetChangePercent: 15 }, { budget: 69_000 }],
    ['guestCount', { guestCount: 75 }, { guestCount: 75 }],
    ['eventDate', { eventDate: '2027-02-14' }, { eventDate: '2027-02-14' }],
    [
      'addConstraints',
      { addConstraints: ['halal'] },
      { constraints: ['indoor', 'vegetarian', 'halal'] },
    ],
    ['removeConstraints', { removeConstraints: ['indoor'] }, { constraints: ['vegetarian'] }],
    ['priorities', { priorities: ['gifts', 'venue'] }, { priorities: ['gifts', 'venue'] }],
    ['vibe', { vibe: ' boho garden ' }, { vibe: 'boho garden' }],
    ['ideaFocus', { ideaFocus: 'more eco-friendly decor' }, {}],
  ];

  it.each(single)('%s alone changes only its own field', (_field, patch, changed) => {
    const patched = applyPatch(base, patch);
    expect(patched).toEqual({ ...base, ...changed });
    expect(EventInputSchema.safeParse(patched).success).toBe(true);
  });

  it('applies every field at once', () => {
    const patched = applyPatch(base, {
      budget: 120_000,
      budgetChangePercent: -50,
      guestCount: 10,
      eventDate: '2027-03-01',
      addConstraints: ['outdoor', 'eco_friendly'],
      removeConstraints: ['vegetarian'],
      priorities: ['decor'],
      vibe: '  sunset picnic ',
      ideaFocus: 'zero waste',
    });
    expect(patched).toEqual({
      ...base,
      budget: 120_000,
      guestCount: 10,
      eventDate: '2027-03-01',
      constraints: ['outdoor', 'eco_friendly'],
      priorities: ['decor'],
      vibe: 'sunset picnic',
    });
    expect(EventInputSchema.safeParse(patched).success).toBe(true);
  });

  it('adding indoor removes outdoor', () => {
    const outdoor = makeInput({ constraints: ['outdoor'] });
    expect(applyPatch(outdoor, { addConstraints: ['indoor'] }).constraints).toEqual(['indoor']);
  });

  it('dedupes and caps replaced priorities defensively', () => {
    const patch = { priorities: ['food', 'food', 'venue', 'decor', 'gifts'] } as PlanPatch;
    expect(applyPatch(base, patch).priorities).toEqual(['food', 'venue', 'decor']);
  });

  it.each([-90, -33.3, -20, -0.5, 0, 0.5, 12.5, 99.9, 200])(
    'budgetChangePercent %s% stays an integer within limits for any budget',
    (percent) => {
      for (const budget of [LIMITS.budget.min, 1_234, 60_000, 7_777_777, LIMITS.budget.max]) {
        const patched = applyPatch(makeInput({ budget }), { budgetChangePercent: percent });
        expect(patched.budget).toBe(
          Math.min(
            LIMITS.budget.max,
            Math.max(LIMITS.budget.min, Math.round(budget + (budget * percent) / 100)),
          ),
        );
        expect(EventInputSchema.safeParse(patched).success).toBe(true);
      }
    },
  );
});
