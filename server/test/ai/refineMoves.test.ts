import { applyPatch, buildPlan } from '@utsav/shared';
import { describe, expect, it } from 'vitest';
import { parsePatch } from '../../src/ai/parsePatch.js';
import { languageFrom, parseRefinement, prioritiesFrom } from '../../src/ai/refineParser.js';
import { birthdayInput } from '../fixtures.js';

const today = new Date('2099-01-01T00:00:00Z');
const shareOf = (input: typeof birthdayInput, category: string) =>
  buildPlan(input, today).budget.lines.find((line) => line.category === category)?.amount ?? 0;

describe('money moves between budget categories', () => {
  it('"more money for photography" boosts photography and really shifts the budget', () => {
    const { patch, explanation } = parseRefinement(
      birthdayInput,
      'we want more money for photography',
    );
    expect(patch.priorities).toEqual(['photography', 'food', 'entertainment']);
    expect(explanation).toMatch(/photography a bigger share/);
    const after = applyPatch(birthdayInput, patch);
    expect(shareOf(after, 'photography')).toBeGreaterThan(shareOf(birthdayInput, 'photography'));
  });

  it('"spend less on food" drops it from the priorities', () => {
    expect(prioritiesFrom(birthdayInput, 'spend less on food')).toEqual(['entertainment']);
  });

  it('splits "more decor, less food" by the verb next to each category', () => {
    expect(prioritiesFrom(birthdayInput, 'more budget for decor but less on food')).toEqual([
      'decor',
      'entertainment',
    ]);
  });

  it('keeps at most three priorities and ignores messages with no category or verb', () => {
    const full = { ...birthdayInput, priorities: ['food', 'entertainment', 'venue'] as const };
    expect(
      prioritiesFrom({ ...full, priorities: [...full.priorities] }, 'more money for gifts'),
    ).toEqual(['gifts', 'food', 'entertainment']);
    expect(prioritiesFrom(birthdayInput, 'cut the budget by 20%')).toBeUndefined();
    expect(prioritiesFrom(birthdayInput, 'add a DJ and a magician')).toBeUndefined();
    expect(prioritiesFrom(birthdayInput, 'invite more people')).toBeUndefined();
    expect(prioritiesFrom(birthdayInput, 'more colourful decor')).toBeUndefined();
  });

  it('understands Hindi: "फोटो पर ज़्यादा खर्च"', () => {
    expect(prioritiesFrom(birthdayInput, 'फोटो पर ज़्यादा खर्च करो')?.[0]).toBe('photography');
  });
});

describe('idea language requests', () => {
  it('switches the ideas to Hindi and back', () => {
    expect(languageFrom(birthdayInput, 'give me ideas in Hindi')).toBe('hi');
    expect(languageFrom({ ...birthdayInput, language: 'hi' }, 'show it in English')).toBe('en');
    expect(languageFrom(birthdayInput, 'show it in English')).toBeUndefined();
    expect(parseRefinement(birthdayInput, 'give me ideas in Hindi').patch).toEqual({
      language: 'hi',
    });
  });
});

describe('AI patches are backed up by the rules', () => {
  it('adds the priority shift when the model only wrote an idea focus', () => {
    const raw = JSON.stringify({
      patch: { ideaFocus: 'Allocate more budget to photography' },
      explanation: 'Noted.',
    });
    const result = parsePatch(raw, birthdayInput, 'we want more money for photography');
    expect(result.ok && result.value.patch.priorities?.[0]).toBe('photography');
  });

  it('keeps a new city only when the host wrote it, with its size', () => {
    const raw = JSON.stringify({
      patch: { city: 'Delhi', cityTier: 'metro' },
      explanation: 'Moved to Delhi.',
    });
    const moved = parsePatch(raw, birthdayInput, 'move it to delhi');
    expect(moved.ok && moved.value.patch).toEqual({ city: 'Delhi', cityTier: 'metro' });
    expect(applyPatch(birthdayInput, { city: 'Delhi', cityTier: 'metro' })).toMatchObject({
      city: 'Delhi',
      cityTier: 'metro',
    });

    const invented = parsePatch(raw, birthdayInput, 'make it fancier');
    expect(invented).toEqual({ ok: false, failure: 'unstated_numbers' });
  });
});
