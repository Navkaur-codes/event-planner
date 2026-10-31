import { LIMITS, applyPatch } from '@utsav/shared';
import { describe, expect, it } from 'vitest';
import { numbersIn, parseRefinement } from '../../src/ai/refineParser.js';
import { birthdayInput } from '../fixtures.js';

const patchFor = (message: string, input = birthdayInput) => parseRefinement(input, message).patch;

describe('parseRefinement', () => {
  it.each([
    ['reduce budget by 20%', -20],
    ['Cut the budget by 15 percent', -15],
    ['please lower it 10%', -10],
    ['increase budget by 25%', 25],
    ['Raise the budget 50 %', 50],
  ])('reads "%s" as budgetChangePercent %d', (message, percent) => {
    expect(patchFor(message)).toEqual({ budgetChangePercent: percent });
  });

  it('turns "reduce budget by 20%" on the 60,000 fixture into exactly 48,000', () => {
    const next = applyPatch(birthdayInput, patchFor('reduce budget by 20%'));
    expect(next.budget).toBe(birthdayInput.budget * 0.8);
  });

  it.each([
    ['increase budget to 80000', 80_000],
    ['set the budget to ₹80,000', 80_000],
    ['budget of 75k', 75_000],
    ['Make the budget 2 lakh', 200_000],
    ['budget 20% lower', undefined],
    ['change budget to 2 lakh', 200_000],
  ])('reads "%s" as an absolute budget', (message, budget) => {
    expect(patchFor(message).budget).toBe(budget);
  });

  it('clamps budgets to the contract limits', () => {
    expect(patchFor('budget to 5').budget).toBe(LIMITS.budget.min);
    expect(patchFor('cut budget by 95%').budgetChangePercent).toBe(-90);
  });

  it.each([
    ['add 30 guests', birthdayInput.guestCount + 30],
    ['invite 10 more people', birthdayInput.guestCount + 10],
    ['15 more guests please', birthdayInput.guestCount + 15],
    ['remove 5 guests', birthdayInput.guestCount - 5],
    ['10 fewer people', birthdayInput.guestCount - 10],
    ['change guest count to 60', 60],
    ['make it for 25 guests', 25],
  ])('reads "%s" as guestCount %d', (message, guests) => {
    expect(patchFor(message).guestCount).toBe(guests);
  });

  it.each([
    ['make it vegan', 'vegan'],
    ['Make it more eco-friendly', 'eco_friendly'],
    ['move it outdoors', 'outdoor'],
    ['it must be wheelchair accessible', 'wheelchair_access'],
    ['no alcohol please', 'alcohol_free'],
    ['grandparents are coming', 'elder_friendly'],
  ])('reads "%s" as adding %s', (message, constraint) => {
    expect(patchFor(message).addConstraints).toEqual([constraint]);
  });

  it('removes a constraint the host negates', () => {
    expect(patchFor('it is no longer vegetarian').removeConstraints).toEqual(['vegetarian']);
    expect(patchFor('drop the kid friendly stuff').removeConstraints).toEqual(['kid_friendly']);
  });

  it('ignores constraints that are already set and conflicting indoor/outdoor', () => {
    expect(patchFor('keep it vegetarian')).toEqual({ ideaFocus: 'keep it vegetarian' });
    expect(patchFor('indoor or outdoor, either works').addConstraints).toBeUndefined();
  });

  it('combines several changes in one explanation', () => {
    const { patch, explanation } = parseRefinement(
      birthdayInput,
      'cut budget by 10%, add 5 guests and make it eco friendly',
    );
    expect(patch).toEqual({
      budgetChangePercent: -10,
      guestCount: birthdayInput.guestCount + 5,
      addConstraints: ['eco_friendly'],
    });
    expect(explanation).toMatch(/^I reduced the budget by 10%, .+ and added eco friendly\.$/);
  });

  it('falls back to an idea focus when nothing structural is asked', () => {
    const message = 'more space-themed games for the kids corner';
    const { patch, explanation } = parseRefinement(
      { ...birthdayInput, constraints: ['kid_friendly'] },
      message,
    );
    expect(patch).toEqual({ ideaFocus: message });
    expect(explanation).toContain(message);
  });

  it('never sets numbers that are not in the message', () => {
    expect(patchFor('make it cheaper')).toEqual({ ideaFocus: 'make it cheaper' });
    expect(patchFor('invite more people')).toEqual({ ideaFocus: 'invite more people' });
  });
});

describe('numbersIn', () => {
  it('reads plain numbers, separators and k/lakh/crore units', () => {
    expect([...numbersIn('cut 20% to 80,000 or 75k, 2 lakh, 1.5 crore')]).toEqual([
      20, 80_000, 75_000, 200_000, 15_000_000,
    ]);
  });
});
