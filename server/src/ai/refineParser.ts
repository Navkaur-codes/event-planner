/**
 * Deterministic interpreter for common refine requests. Used when the AI is
 * unavailable or its answer fails validation, so "cut the budget by 20%" always works.
 */
import { LIMITS, type Constraint, type EventInput, type PlanPatch } from '@utsav/shared';
import { truncateText } from './parse.js';

export interface Interpretation {
  patch: PlanPatch;
  explanation: string;
}

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  thousand: 1_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  crore: 10_000_000,
  cr: 10_000_000,
};
const AMOUNT = String.raw`(?:₹|rs\.?|inr|\$|€|£)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lac|crore|cr)?\b`;

const PERCENT =
  /\b(cut|reduce|lower|decrease|trim|drop|slash|increase|raise|boost|grow|add|up)\b[^%\d]{0,30}?(\d+(?:\.\d+)?)\s*(?:%|percent)/i;
const DECREASE_VERB = /^(cut|reduce|lower|decrease|trim|drop|slash)$/i;
// "budget to 80000", "budget of 75k", "make the budget 2 lakh" — but never "budget 20%".
const BUDGET_TO = new RegExp(
  String.raw`\bbudget\b(?:[^\d₹$€£]{0,25}?\b(?:to|of|=|at|is))?\s*${AMOUNT}(?!\s*(?:%|percent))`,
  'i',
);
const GUESTS_ADD =
  /\b(?:add|invite|plus)\s+(\d+)\s+(?:more\s+)?(?:guests|people|persons)\b|\b(\d+)\s+more\s+(?:guests|people)\b/i;
const GUESTS_REMOVE =
  /\b(?:remove|cut|reduce|drop|minus)\s+(\d+)\s+(?:guests|people|persons)\b|\b(\d+)\s+(?:fewer|less)\s+(?:guests|people)\b/i;
const GUESTS_TO =
  /\b(?:guests?|guest count|headcount|people)\b[^\d]{0,15}?\b(?:to|of)\s+(\d+)\b|\b(?:for|make it)\s+(\d+)\s+(?:guests|people)\b/i;

/** Keyword rules per constraint; checked in order so "no alcohol" is not read as a removal. */
const CONSTRAINT_KEYWORDS: readonly [Constraint, RegExp][] = [
  [
    'alcohol_free',
    /\b(alcohol[- ]free|no alcohol|without alcohol|dry (event|party|wedding)|teetotal)\b/i,
  ],
  ['vegan', /\bvegan\b/i],
  ['jain', /\bjain\b/i],
  ['vegetarian', /\b(vegetarian|veg only|pure veg|all veg)\b/i],
  ['halal', /\bhalal\b/i],
  ['eco_friendly', /\b(eco[- ]?friendly|eco|green|sustainable|zero[- ]waste|plastic[- ]free)\b/i],
  ['wheelchair_access', /\b(wheelchair|step[- ]free|accessible|accessibility)\b/i],
  ['kid_friendly', /\b(kid[- ]friendly|kids|children|child[- ]friendly)\b/i],
  ['elder_friendly', /\b(elder[- ]friendly|elders|elderly|seniors?|grandparents)\b/i],
  ['outdoor', /\b(outdoors?|outside|open[- ]air|lawn|garden venue)\b/i],
  ['indoor', /\b(indoors?|inside|banquet hall|indoor venue)\b/i],
];
const NEGATION =
  /\b(not|no longer|remove|drop|without|don'?t|do not|stop being|less)\s+(\w+\s+){0,2}$/i;

/** Interprets a refine message with fixed rules; never invents numbers not in the message. */
export function parseRefinement(input: EventInput, message: string): Interpretation {
  const patch: PlanPatch = {};
  const changes: string[] = [];

  const budgetTo = BUDGET_TO.exec(message);
  const percent = PERCENT.exec(message);
  if (budgetTo?.[1]) {
    const budget = clamp(toAmount(budgetTo[1], budgetTo[2]), LIMITS.budget);
    patch.budget = budget;
    changes.push(`set the budget to ${budget.toLocaleString('en-IN')}`);
  } else if (percent?.[1] && percent[2]) {
    const sign = DECREASE_VERB.test(percent[1]) ? -1 : 1;
    const value = Math.min(Number(percent[2]), sign < 0 ? 90 : 200);
    patch.budgetChangePercent = sign * value;
    changes.push(`${sign < 0 ? 'reduced' : 'increased'} the budget by ${value}%`);
  }

  const guestCount = guestsFrom(input.guestCount, message);
  if (guestCount !== undefined && guestCount !== input.guestCount) {
    patch.guestCount = guestCount;
    changes.push(`changed the guest count to ${guestCount}`);
  }

  const { add, remove } = constraintsFrom(message);
  const toAdd = add.filter((c) => !input.constraints.includes(c));
  const toRemove = remove.filter((c) => input.constraints.includes(c));
  if (toAdd.length > 0) {
    patch.addConstraints = toAdd;
    changes.push(`added ${toAdd.map(label).join(', ')}`);
  }
  if (toRemove.length > 0) {
    patch.removeConstraints = toRemove;
    changes.push(`removed ${toRemove.map(label).join(', ')}`);
  }

  if (changes.length === 0) {
    const focus = truncateText(message.trim(), 200);
    return {
      patch: { ideaFocus: focus },
      explanation: truncateText(
        `Kept your plan as it is and refreshed the ideas around: ${focus}`,
        300,
      ),
    };
  }
  return { patch, explanation: truncateText(`I ${joinChanges(changes)}.`, 300) };
}

/** Numbers stated in a message, with k/lakh/crore applied (used to check AI patches too). */
export function numbersIn(message: string): Set<number> {
  const found = new Set<number>();
  for (const match of message.matchAll(new RegExp(AMOUNT, 'gi'))) {
    if (match[1]) found.add(toAmount(match[1], match[2]));
  }
  return found;
}

function guestsFrom(current: number, message: string): number | undefined {
  const add = GUESTS_ADD.exec(message);
  const remove = GUESTS_REMOVE.exec(message);
  const to = GUESTS_TO.exec(message);
  const n = (match: RegExpExecArray) => Number(match[1] ?? match[2]);
  let next: number | undefined;
  if (add) next = current + n(add);
  else if (remove) next = current - n(remove);
  else if (to) next = n(to);
  return next === undefined ? undefined : clamp(next, LIMITS.guestCount);
}

function constraintsFrom(message: string): { add: Constraint[]; remove: Constraint[] } {
  const add: Constraint[] = [];
  const remove: Constraint[] = [];
  for (const [constraint, pattern] of CONSTRAINT_KEYWORDS) {
    const match = pattern.exec(message);
    if (!match) continue;
    const before = message.slice(0, match.index);
    const negated = constraint !== 'alcohol_free' && NEGATION.test(before);
    (negated ? remove : add).push(constraint);
  }
  // indoor/outdoor are exclusive; if both are mentioned, neither is safe to guess.
  const both = add.includes('indoor') && add.includes('outdoor');
  return { add: both ? add.filter((c) => c !== 'indoor' && c !== 'outdoor') : add, remove };
}

function toAmount(digits: string, unit: string | undefined): number {
  const value = Number(digits.replace(/,/g, ''));
  return Math.round(value * (unit ? (MULTIPLIERS[unit.toLowerCase()] ?? 1) : 1));
}

function clamp(value: number, limits: { min: number; max: number }): number {
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

function label(constraint: Constraint): string {
  return constraint.replace(/_/g, ' ');
}

function joinChanges(changes: string[]): string {
  return changes.length === 1
    ? (changes[0] ?? '')
    : `${changes.slice(0, -1).join(', ')} and ${changes.at(-1) ?? ''}`;
}
