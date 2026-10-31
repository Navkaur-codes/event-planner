import { describe, expect, it } from 'vitest';
import { EventTypeSchema, type EventInput } from '../src/contracts.js';
import { buildChecklist } from '../src/engine/checklist.js';
import { buildPlan } from '../src/engine/index.js';
import { makeInput, TODAY } from './fixtures.js';

const ids = (input: EventInput) => buildChecklist(input).map((c) => c.id);
const codes = (input: EventInput, today = TODAY) => buildPlan(input, today).warnings;

describe('vendor checklist', () => {
  it.each(EventTypeSchema.options)('%s: unique ids, ordered must → should → nice', (eventType) => {
    const items = buildChecklist(makeInput({ eventType, constraints: [], guestCount: 40 }));
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    const rank = { must: 0, should: 1, nice: 2 };
    const ranks = items.map((i) => rank[i.priority]);
    expect(ranks).toEqual([...ranks].sort());
    expect(items.every((i) => !i.done)).toBe(true);
  });

  it('adds permits and transport only above 150 guests', () => {
    expect(ids(makeInput({ guestCount: 150 }))).not.toContain('c-permits');
    const big = ids(makeInput({ guestCount: 151 }));
    expect(big).toContain('c-permits');
    expect(big).toContain('c-transport');
  });

  it('turns constraints into concrete vendor tasks', () => {
    const items = buildChecklist(
      makeInput({
        constraints: [
          'jain',
          'vegan',
          'wheelchair_access',
          'eco_friendly',
          'outdoor',
          'elder_friendly',
        ],
      }),
    );
    const task = (id: string) => items.find((i) => i.id === id)?.task;
    expect(task('c-diet')).toBe('Confirm the caterer can serve: Jain (no root vegetables), vegan');
    expect(task('c-accessible')).toContain('ramp');
    expect(task('c-eco-decor')).toContain('single-use plastic');
    expect(task('c-eco-food')).toBeDefined();
    expect(task('c-outdoor')).toContain('tent');
    expect(task('c-elders')).toBeDefined();
  });

  it('names the guest count in the caterer task', () => {
    const items = buildChecklist(makeInput({ eventType: 'community', guestCount: 300 }));
    expect(items.find((i) => i.id === 'c-caterer')?.task).toContain('300');
  });

  it('books an officiant only for weddings with traditions', () => {
    expect(ids(makeInput({ eventType: 'wedding', traditions: 'Pheras at dusk' }))).toContain(
      'c-officiant',
    );
    expect(ids(makeInput({ eventType: 'wedding', traditions: '   ' }))).not.toContain(
      'c-officiant',
    );
    expect(ids(makeInput({ eventType: 'birthday', traditions: 'Havan' }))).not.toContain(
      'c-officiant',
    );
  });
});

describe('warnings', () => {
  it('returns none for a comfortable, well-funded plan', () => {
    expect(codes(makeInput())).toEqual([]);
  });

  it('flags short notice as critical, with correct plurals', () => {
    const in5 = codes(makeInput({ eventDate: '2026-11-05' }));
    expect(in5).toContainEqual(
      expect.objectContaining({ code: 'short-notice', severity: 'critical' }),
    );
    expect(in5.find((w) => w.code === 'short-notice')?.message).toContain('Only 5 days');
    const in1 = codes(makeInput({ eventDate: '2026-11-01' }));
    expect(in1.find((w) => w.code === 'short-notice')?.message).toContain('Only 1 day ');
    expect(in1.some((w) => w.code === 'compressed-timeline')).toBe(false);
  });

  it('warns about a compressed timeline that is not yet critical', () => {
    const wedding = makeInput({ eventType: 'wedding', eventDate: '2026-12-30', budget: 5_000_000 });
    expect(codes(wedding).map((w) => w.code)).toEqual(['compressed-timeline']);
  });

  it('grades a thin per-guest budget by how far below the minimum it is', () => {
    const base = { eventType: 'wedding', cityTier: 'metro', guestCount: 300 } as const;
    const warn = codes(makeInput({ ...base, eventDate: '2027-06-01', budget: 600_000 }));
    expect(warn).toContainEqual(
      expect.objectContaining({ code: 'low-per-guest', severity: 'warn' }),
    );
    const critical = codes(makeInput({ ...base, eventDate: '2027-06-01', budget: 300_000 }));
    expect(critical.find((w) => w.code === 'low-per-guest')).toMatchObject({
      severity: 'critical',
    });
    expect(critical.find((w) => w.code === 'low-per-guest')?.message).toContain('metro wedding');
  });

  it('converts non-INR budgets before comparing', () => {
    expect(codes(makeInput({ currency: 'USD', budget: 2_000 }))).toEqual([]);
    expect(codes(makeInput({ currency: 'GBP', budget: 1_000, guestCount: 400 }))).toContainEqual(
      expect.objectContaining({ code: 'low-per-guest' }),
    );
  });

  it('flags permits for very large community events', () => {
    const crowd = makeInput({ eventType: 'community', guestCount: 1_001, budget: 5_000_000 });
    expect(codes(crowd).map((w) => w.code)).toContain('permits-large-crowd');
    const smaller = makeInput({ eventType: 'community', guestCount: 1_000, budget: 5_000_000 });
    expect(codes(smaller).map((w) => w.code)).not.toContain('permits-large-crowd');
  });

  it('flags indoor + outdoor as conflicting', () => {
    expect(codes(makeInput({ constraints: ['indoor', 'outdoor'] })).map((w) => w.code)).toEqual([
      'conflicting-venue',
    ]);
  });

  it('stamps generatedAt from the given clock', () => {
    expect(buildPlan(makeInput(), TODAY).generatedAt).toBe('2026-10-31T10:30:00.000Z');
  });
});
