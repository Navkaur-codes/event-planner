import { describe, expect, it } from 'vitest';
import { EventInputSchema } from '../src/contracts.js';
import { applyPatch } from '../src/engine/index.js';
import { makeInput } from './fixtures.js';

describe('applyPatch', () => {
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
