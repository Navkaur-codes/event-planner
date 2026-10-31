import { describe, expect, it } from 'vitest';
import { EnginePlanSchema, LIMITS, type EnginePlan } from '../src/contracts.js';
import { buildPlan, recalculateBudget } from '../src/engine/index.js';
import { resolveToday } from '../src/today.js';
import { makeInput } from './fixtures.js';

function expectValidPlan(plan: EnginePlan, todayIso: string): void {
  expect(() => EnginePlanSchema.parse(plan)).not.toThrow();
  const dates = plan.timeline.milestones.map((m) => m.dueDate);
  expect(dates).toEqual([...dates].sort());
  expect(dates.every((d) => d >= todayIso && d <= plan.input.eventDate)).toBe(true);
}

const codes = (plan: EnginePlan) => plan.warnings.map((w) => w.code);

describe('engine edge cases', () => {
  it('plans an event happening today: everything due today, critical warning', () => {
    const plan = buildPlan(
      makeInput({ eventType: 'wedding', eventDate: '2026-11-01', budget: 5_000_000 }),
      new Date('2026-11-01T08:00:00Z'),
    );
    expectValidPlan(plan, '2026-11-01');
    expect(plan.timeline.compressed).toBe(true);
    expect(plan.timeline.milestones.every((m) => m.daysBefore === 0)).toBe(true);
    expect(plan.warnings.find((w) => w.code === 'short-notice')?.message).toContain('Only 0 days');
  });

  it('plans a leap-day event', () => {
    const plan = buildPlan(
      makeInput({ eventDate: '2028-02-29' }),
      new Date('2027-12-01T00:00:00Z'),
    );
    expectValidPlan(plan, '2027-12-01');
    expect(plan.timeline.compressed).toBe(false);
    expect(plan.timeline.milestones.at(-1)).toMatchObject({
      id: 'm-confirm',
      dueDate: '2028-02-27',
    });
  });

  it('rolls milestones back across Dec → Jan', () => {
    const plan = buildPlan(
      makeInput({ eventDate: '2027-01-02' }),
      new Date('2026-12-30T12:00:00Z'),
    );
    expectValidPlan(plan, '2026-12-30');
    expect(plan.timeline.compressed).toBe(true);
    const dates = new Set(plan.timeline.milestones.map((m) => m.dueDate));
    expect(dates.has('2026-12-30')).toBe(true);
    expect(dates.has('2027-01-01')).toBe(true);
  });

  it('handles a single guest', () => {
    const plan = buildPlan(makeInput({ guestCount: 1 }), new Date('2026-11-01T00:00:00Z'));
    expectValidPlan(plan, '2026-11-01');
    expect(plan.budget.perGuest).toBe(plan.budget.total);
    expect(codes(plan)).not.toContain('low-per-guest');
  });

  it('handles the maximum budget and guest count', () => {
    const plan = buildPlan(
      makeInput({
        eventType: 'community',
        budget: LIMITS.budget.max,
        guestCount: LIMITS.guestCount.max,
      }),
      new Date('2026-11-01T00:00:00Z'),
    );
    expectValidPlan(plan, '2026-11-01');
    expect(plan.budget.total).toBe(LIMITS.budget.max);
    expect(plan.budget.perGuest).toBe(20_000);
    expect(codes(plan)).toContain('permits-large-crowd');
  });

  it('plans from the local date when an IST user is past midnight (today = next UTC day)', () => {
    // 00:30 IST on 1 Nov is still 31 Oct in UTC; resolveToday picks the browser's 1 Nov.
    const serverNow = new Date('2026-10-31T19:00:00Z');
    const today = resolveToday('2026-11-01', serverNow);
    expect(today.toISOString()).toBe('2026-11-01T00:00:00.000Z');

    const input = makeInput({ eventDate: '2026-11-02' });
    const local = buildPlan(input, today);
    expectValidPlan(local, '2026-11-01');
    expect(local.generatedAt).toBe('2026-11-01T00:00:00.000Z');
    expect(local.timeline.milestones[0]?.dueDate).toBe('2026-11-01');
    expect(local.warnings.find((w) => w.code === 'short-notice')?.message).toContain('Only 1 day ');

    // With the UTC server clock the same plan would start "yesterday" for this user.
    expect(buildPlan(input, serverNow).timeline.milestones[0]?.dueDate).toBe('2026-10-31');
  });
});

describe('recalculateBudget performance', () => {
  it('runs 1,000 slider recalculations in under 200 ms', () => {
    const input = makeInput({
      eventType: 'wedding',
      priorities: ['decor', 'food', 'photography'],
      constraints: ['outdoor', 'jain', 'eco_friendly', 'wheelchair_access'],
    });
    recalculateBudget(input, {}); // warm-up so JIT compilation is not timed
    const start = Date.now();
    for (let i = 0; i < 1_000; i++) {
      recalculateBudget(input, { budget: 100_000 + i * 997, guestCount: 1 + (i % 500) });
    }
    expect(Date.now() - start).toBeLessThan(200);
  });
});
