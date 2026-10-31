import { describe, expect, it } from 'vitest';
import { parseIdeas, sanitize } from '../../src/ai/parse.js';
import { aiIdeas } from '../fixtures.js';

const raw = (patch: object) => JSON.stringify({ ...aiIdeas, ...patch });

describe('parseIdeas', () => {
  it('accepts valid ideas', () => {
    expect(parseIdeas(JSON.stringify(aiIdeas))).toEqual(aiIdeas);
  });

  it.each([
    ['not JSON', 'Sure! Here are some ideas'],
    ['a JSON array', '[]'],
    ['missing fields', '{"summary": "hi"}'],
    ['unknown keys', raw({ price: 100 })],
    ['too many themes', raw({ themes: Array(4).fill(aiIdeas.themes[0]) })],
    ['an over-long item', raw({ decor: ['x'.repeat(201)] })],
  ])('rejects %s', (_case, input) => {
    expect(parseIdeas(input)).toBeNull();
  });

  it('strips HTML tags and control characters', () => {
    const ideas = parseIdeas(
      raw({ decor: ['<script>alert(1)</script>Fairy\u0007 lights <b>bright</b>'] }),
    );
    expect(ideas?.decor).toEqual(['alert(1)Fairy lights bright']);
  });

  it('drops list items that quote prices and rejects summaries that do', () => {
    const ideas = parseIdeas(
      raw({ food: ['Chaat counter', 'Cake for ₹5,000', 'Buffet at Rs 800 a plate'] }),
    );
    expect(ideas?.food).toEqual(['Chaat counter']);
    expect(parseIdeas(raw({ food: ['Cake for $50'] }))).toBeNull();
    expect(parseIdeas(raw({ summary: 'Spend about 2 lakh on decor.' }))).toBeNull();
  });

  it('keeps ordinary numbers that are not money', () => {
    const ideas = parseIdeas(raw({ activities: ['A 7-station treasure hunt for 40 kids'] }));
    expect(ideas?.activities).toEqual(['A 7-station treasure hunt for 40 kids']);
  });
});

describe('sanitize', () => {
  it('cleans nested strings and leaves other values alone', () => {
    expect(sanitize({ a: ['  x\n\ny  '], b: 3, c: null })).toEqual({ a: ['x y'], b: 3, c: null });
  });
});
