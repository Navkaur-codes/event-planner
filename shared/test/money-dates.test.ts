import { describe, expect, it } from 'vitest';
import { daysUntil, dayToIso, isoToDay } from '../src/engine/dates.js';
import { allocateLargestRemainder, clampInt, round1 } from '../src/engine/money.js';

describe('allocateLargestRemainder', () => {
  it('splits exactly and hands leftover units to the largest remainders', () => {
    expect(allocateLargestRemainder(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(allocateLargestRemainder(100, [0.5, 0.3, 0.2])).toEqual([50, 30, 20]);
    expect(allocateLargestRemainder(7, [2, 5])).toEqual([2, 5]);
  });

  it('breaks remainder ties toward the earlier index', () => {
    expect(allocateLargestRemainder(1, [1, 1])).toEqual([1, 0]);
  });

  it('always sums to the total for awkward weights', () => {
    const weights = [35.1, 26, 15.6, 15, 3.9, 1, 1];
    for (const total of [1, 99, 1_001, 54_321, 90_000_000]) {
      const parts = allocateLargestRemainder(total, weights);
      expect(parts.reduce((s, p) => s + p, 0)).toBe(total);
      expect(parts.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
    }
  });

  it('handles no slots and all-zero weights without inventing money', () => {
    expect(allocateLargestRemainder(50, [])).toEqual([]);
    expect(allocateLargestRemainder(50, [0, 0])).toEqual([50, 0]);
  });
});

describe('number helpers', () => {
  it('rounds to one decimal and clamps integers', () => {
    expect(round1(12.345)).toBe(12.3);
    expect(clampInt(2.6, 1, 10)).toBe(3);
    expect(clampInt(-4, 1, 10)).toBe(1);
    expect(clampInt(99, 1, 10)).toBe(10);
  });
});

describe('date helpers', () => {
  it('round-trips ISO dates including a leap day', () => {
    expect(dayToIso(isoToDay('2028-02-29'))).toBe('2028-02-29');
    expect(dayToIso(isoToDay('2028-02-29') + 1)).toBe('2028-03-01');
  });

  it('counts whole UTC days regardless of the time of day', () => {
    expect(daysUntil('2027-01-01', new Date('2026-12-31T23:59:59Z'))).toBe(1);
    expect(daysUntil('2026-10-31', new Date('2026-10-31T00:00:00Z'))).toBe(0);
    expect(daysUntil('2026-10-30', new Date('2026-10-31T12:00:00Z'))).toBe(-1);
  });
});
