import { AiIdeasSchema } from '@utsav/shared';
import { describe, expect, it } from 'vitest';
import { parseIdeas, sanitize, truncateText } from '../../src/ai/parse.js';
import { aiIdeas } from '../fixtures.js';

const raw = (patch: object) => JSON.stringify({ ...aiIdeas, ...patch });

/** The ideas from a successful parse, or undefined. */
const ideasOf = (input: string) => {
  const result = parseIdeas(input);
  return result.ok ? result.ideas : undefined;
};

const failureOf = (input: string) => {
  const result = parseIdeas(input);
  return result.ok ? undefined : result.failure;
};

describe('parseIdeas', () => {
  it('accepts valid ideas', () => {
    expect(ideasOf(JSON.stringify(aiIdeas))).toEqual(aiIdeas);
  });

  it.each([
    ['not JSON', 'Sure! Here are some ideas', 'not_json'],
    ['a JSON array', '[]', 'schema:root'],
    ['a truncated object', JSON.stringify({ summary: 'hi', themes: aiIdeas.themes }), 'schema:'],
    ['unknown keys', raw({ price: 100 }), 'schema:root'],
    ['an empty list', raw({ food: [] }), 'schema:food'],
    ['a wrong type', raw({ decor: 'lights' }), 'schema:decor'],
  ])('rejects %s with a log-safe failure label', (_case, input, label) => {
    expect(failureOf(input)).toContain(label);
  });

  it('names only the failing fields, never content', () => {
    const failure = failureOf(
      JSON.stringify({ summary: 'secret party plan', themes: aiIdeas.themes }),
    );
    expect(failure).toBe('schema:decor,food,activities,vendorQuestions,personalTouches');
  });

  it('trims over-long lists to the schema maximum instead of failing', () => {
    const ideas = ideasOf(
      raw({
        themes: Array(5).fill(aiIdeas.themes[0]),
        decor: Array.from({ length: 9 }, (_, i) => `Decor idea ${i}`),
        personalTouches: Array.from({ length: 7 }, (_, i) => `Touch ${i}`),
      }),
    );
    expect(ideas?.themes).toHaveLength(3);
    expect(ideas?.decor).toHaveLength(6);
    expect(ideas?.personalTouches).toHaveLength(4);
  });

  it('shortens over-long strings at a word boundary', () => {
    const long = `${'Marigold garlands '.repeat(20)}end`;
    const ideas = ideasOf(
      raw({
        summary: 'Joyful '.repeat(120),
        themes: [{ name: 'Royal '.repeat(20), description: 'Gold '.repeat(80) }],
        decor: [long],
      }),
    );
    expect(ideas).toBeDefined();
    expect(ideas?.decor[0]?.length).toBeLessThanOrEqual(200);
    expect(ideas?.decor[0]).toMatch(/garlands…$/);
    expect(ideas?.summary.length).toBeLessThanOrEqual(600);
  });

  it('always yields schema-valid ideas after trimming (limits match the schema)', () => {
    const huge = 'word '.repeat(400);
    const ideas = ideasOf(
      JSON.stringify({
        summary: huge,
        themes: Array(9).fill({ name: huge, description: huge }),
        decor: Array(9).fill(huge),
        food: Array(9).fill(huge),
        activities: Array(9).fill(huge),
        vendorQuestions: Array(9).fill(huge),
        personalTouches: Array(9).fill(huge),
      }),
    );
    expect(AiIdeasSchema.safeParse(ideas).success).toBe(true);
  });

  it('strips HTML tags and control characters', () => {
    const ideas = ideasOf(
      raw({ decor: ['<script>alert(1)</script>Fairy\u0007 lights <b>bright</b>'] }),
    );
    expect(ideas?.decor).toEqual(['alert(1)Fairy lights bright']);
  });

  it('drops list items that quote prices and rejects summaries that do', () => {
    const ideas = ideasOf(
      raw({ food: ['Chaat counter', 'Cake for ₹5,000', 'Buffet at Rs 800 a plate'] }),
    );
    expect(ideas?.food).toEqual(['Chaat counter']);
    expect(failureOf(raw({ food: ['Cake for $50'] }))).toBe('schema:food');
    expect(failureOf(raw({ summary: 'Spend about 2 lakh on decor.' }))).toBe('money');
  });

  it('drops Hindi price mentions too', () => {
    const ideas = ideasOf(raw({ food: ['चाट काउंटर', 'केक 5 हज़ार रुपये में', 'सजावट पर 2 लाख'] }));
    expect(ideas?.food).toEqual(['चाट काउंटर']);
  });

  it('drops blank or non-text list items instead of failing', () => {
    const ideas = ideasOf(raw({ personalTouches: ['', 42, null, 'Memory jar', '   '] }));
    expect(ideas?.personalTouches).toEqual(['Memory jar']);
    expect(failureOf(raw({ personalTouches: ['', null] }))).toBe('schema:personalTouches');
  });

  it('keeps ordinary numbers that are not money', () => {
    const ideas = ideasOf(raw({ activities: ['A 7-station treasure hunt for 40 kids'] }));
    expect(ideas?.activities).toEqual(['A 7-station treasure hunt for 40 kids']);
  });
});

describe('truncateText', () => {
  it('leaves short text alone and never exceeds the limit', () => {
    expect(truncateText('short', 10)).toBe('short');
    expect(truncateText('a'.repeat(50), 10)).toHaveLength(10);
    expect(truncateText('alpha beta gamma delta', 18)).toBe('alpha beta gamma…');
  });
});

describe('sanitize', () => {
  it('cleans nested strings and leaves other values alone', () => {
    expect(sanitize({ a: ['  x\n\ny  '], b: 3, c: null })).toEqual({ a: ['x y'], b: 3, c: null });
  });
});
