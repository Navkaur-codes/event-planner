/**
 * Budget rules as data. Each event type splits the non-contingency 90% of the budget across
 * categories; priorities and constraints then adjust those weights before renormalising.
 */
import type { Constraint, EventType, Priority } from '../../contracts.js';

/** Share of every budget held back for surprises. */
export const CONTINGENCY_PERCENT = 10;

/** Weight multiplier for each category the user marks as a priority. */
export const PRIORITY_MULTIPLIER = 1.3;

/** A prioritised category whose base share is tiny is lifted to at least this weight first. */
export const PRIORITY_FLOOR_PERCENT = 3;

/** Base percentage split per event type; each row sums to 100 − CONTINGENCY_PERCENT. */
export const BASE_SPLITS: Record<EventType, Record<Priority, number>> = {
  wedding: {
    venue: 24,
    food: 27,
    decor: 10,
    photography: 10,
    attire: 8,
    entertainment: 5,
    invitations: 2,
    gifts: 2,
    logistics: 2,
  },
  birthday: {
    food: 35,
    entertainment: 20,
    decor: 15,
    venue: 15,
    photography: 3,
    invitations: 1,
    gifts: 1,
    attire: 0,
    logistics: 0,
  },
  community: {
    food: 30,
    venue: 20,
    logistics: 15,
    entertainment: 15,
    decor: 5,
    photography: 3,
    invitations: 2,
    gifts: 0,
    attire: 0,
  },
};

/** What each category typically pays for, shown as the line's note. */
export const CATEGORY_NOTES: Record<Priority, string> = {
  venue: 'Hall, lawn or community space hire',
  food: 'Catering',
  decor: 'Decor, flowers and lighting',
  photography: 'Photos and video',
  entertainment: 'Music, performers and activities',
  attire: 'Outfits, makeup and styling',
  invitations: 'Invitations and stationery',
  gifts: 'Return gifts and favours',
  logistics: 'Transport, rentals and on-site coordination',
};

/** How a constraint shifts weight toward a category, with the reason shown to the user. */
export interface ConstraintNudge {
  category: Priority;
  addPercent: number;
  note: string;
}

/** Constraints that change where money is needed. Notes-only nudges add 0. */
export const CONSTRAINT_NUDGES: Partial<Record<Constraint, ConstraintNudge[]>> = {
  outdoor: [
    { category: 'logistics', addPercent: 3, note: 'tents, power and weather backup' },
    { category: 'decor', addPercent: 1, note: 'outdoor lighting' },
  ],
  wheelchair_access: [
    { category: 'logistics', addPercent: 1, note: 'ramps and accessible washroom' },
  ],
  elder_friendly: [{ category: 'logistics', addPercent: 1, note: 'comfortable seating, pick-ups' }],
  kid_friendly: [{ category: 'entertainment', addPercent: 2, note: 'kids activities' }],
  eco_friendly: [{ category: 'decor', addPercent: 0, note: 'reusable or rented decor' }],
};
