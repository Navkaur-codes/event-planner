/**
 * Deterministic interpreter for common refine requests. Used when the AI is
 * unavailable or its answer fails validation, so "cut the budget by 20%" always works.
 */
import {
  LIMITS,
  type Constraint,
  type EventInput,
  type Language,
  type PlanPatch,
} from '@utsav/shared';
import { en } from './fallbackContent/en.js';
import { hi } from './fallbackContent/hi.js';
import { truncateText } from './parse.js';

/** What a refine message means for the plan, and how to explain it to the host. */
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
// Hindi puts the number first: "बजट 20% कम करो", "बजट 10 प्रतिशत बढ़ाओ".
const PERCENT_HI = /(\d+(?:\.\d+)?)\s*(?:%|प्रतिशत)\s*(?:तक\s*)?(कम|घटा|बढ़ा|ज़्यादा|ज्यादा)/;
// "budget to 80000", "budget of 75k", "make the budget 2 lakh" — but never "budget 20%".
const BUDGET_TO = new RegExp(
  String.raw`\bbudget\b(?:[^\d₹$€£]{0,25}?\b(?:to|of|=|at|is))?\s*${AMOUNT}(?!\s*(?:%|percent))`,
  'i',
);
const GUESTS_ADD =
  /\b(?:add|invite|plus)\s+(\d+)\s+(?:more\s+)?(?:guests|people|persons)\b|\b(\d+)\s+more\s+(?:guests|people)\b|(\d+)\s*(?:और|अधिक|ज़्यादा|ज्यादा)\s*मेहमान/i;
const GUESTS_REMOVE =
  /\b(?:remove|cut|reduce|drop|minus)\s+(\d+)\s+(?:guests|people|persons)\b|\b(\d+)\s+(?:fewer|less)\s+(?:guests|people)\b/i;
const GUESTS_TO =
  /\b(?:guests?|guest count|headcount|people)\b[^\d]{0,15}?\b(?:to|of)\s+(\d+)\b|\b(?:for|make it)\s+(\d+)\s+(?:guests|people)\b/i;

const MAX_EXPLANATION = 300;

interface Phrases {
  budgetTo(amount: string): string;
  budgetDown(percent: number): string;
  budgetUp(percent: number): string;
  guests(count: number): string;
  added(labels: string): string;
  removed(labels: string): string;
  label(constraint: Constraint): string;
  sentence(changes: string[]): string;
  focus(text: string): string;
}

/** Explanation wording per language; constraint names reuse the fallback labels. */
const PHRASES: Record<Language, Phrases> = {
  en: {
    budgetTo: (amount) => `set the budget to ${amount}`,
    budgetDown: (percent) => `reduced the budget by ${percent}%`,
    budgetUp: (percent) => `increased the budget by ${percent}%`,
    guests: (count) => `changed the guest count to ${count}`,
    added: (labels) => `added ${labels}`,
    removed: (labels) => `removed ${labels}`,
    label: (constraint) => en.constraintLabels[constraint],
    sentence: (changes) => `I ${joinWith('and', changes)}.`,
    focus: (text) => `Kept your plan as it is and refreshed the ideas around: ${text}`,
  },
  hi: {
    budgetTo: (amount) => `बजट ${amount} कर दिया`,
    budgetDown: (percent) => `बजट ${percent}% घटा दिया`,
    budgetUp: (percent) => `बजट ${percent}% बढ़ा दिया`,
    guests: (count) => `मेहमानों की संख्या ${count} कर दी`,
    added: (labels) => `${labels} जोड़ा`,
    removed: (labels) => `${labels} हटाया`,
    label: (constraint) => hi.constraintLabels[constraint],
    sentence: (changes) => `मैंने ${joinWith('और', changes)}।`,
    focus: (text) => `आपकी योजना वैसी ही रखी और सुझाव इस पर केंद्रित किए: ${text}`,
  },
};

/** Hindi keywords per constraint (Devanagari has no \b word boundaries in JS regex). */
const HINDI_KEYWORDS: Partial<Record<Constraint, RegExp>> = {
  alcohol_free: /शराब[- ]?मुक्त|बिना शराब|शराब नहीं/,
  vegan: /वीगन/,
  jain: /जैन/,
  vegetarian: /शाकाहारी/,
  halal: /हलाल/,
  eco_friendly: /पर्यावरण|इको/,
  wheelchair_access: /व्हीलचेयर|सुलभ/,
  kid_friendly: /बच्च/,
  elder_friendly: /बुज़ुर्ग|बुजुर्ग|दादा|नाना/,
  outdoor: /खुले में|बाहर|लॉन/,
  indoor: /हॉल|अंदर/,
};

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
  const say = PHRASES[input.language];
  const patch: PlanPatch = {};
  const changes: string[] = [];

  const budgetTo = BUDGET_TO.exec(message);
  const percent = percentChange(message);
  if (budgetTo?.[1]) {
    const budget = clamp(toAmount(budgetTo[1], budgetTo[2]), LIMITS.budget);
    patch.budget = budget;
    changes.push(say.budgetTo(budget.toLocaleString('en-IN')));
  } else if (percent !== undefined) {
    const sign = percent < 0 ? -1 : 1;
    const value = Math.min(Math.abs(percent), sign < 0 ? 90 : 200);
    patch.budgetChangePercent = sign * value;
    changes.push(sign < 0 ? say.budgetDown(value) : say.budgetUp(value));
  }

  const guestCount = guestsFrom(input.guestCount, message);
  if (guestCount !== undefined && guestCount !== input.guestCount) {
    patch.guestCount = guestCount;
    changes.push(say.guests(guestCount));
  }

  const { add, remove } = constraintsFrom(message);
  const toAdd = add.filter((c) => !input.constraints.includes(c));
  const toRemove = remove.filter((c) => input.constraints.includes(c));
  if (toAdd.length > 0) {
    patch.addConstraints = toAdd;
    changes.push(say.added(toAdd.map(say.label).join(', ')));
  }
  if (toRemove.length > 0) {
    patch.removeConstraints = toRemove;
    changes.push(say.removed(toRemove.map(say.label).join(', ')));
  }

  if (changes.length === 0) {
    const focus = truncateText(message.trim(), 200);
    return {
      patch: { ideaFocus: focus },
      explanation: truncateText(say.focus(focus), MAX_EXPLANATION),
    };
  }
  return { patch, explanation: truncateText(say.sentence(changes), MAX_EXPLANATION) };
}

/** Numbers stated in a message, with k/lakh/crore applied (used to check AI patches too). */
export function numbersIn(message: string): Set<number> {
  const found = new Set<number>();
  for (const match of message.matchAll(new RegExp(AMOUNT, 'gi'))) {
    if (match[1]) found.add(toAmount(match[1], match[2]));
  }
  return found;
}

/** Signed budget change in percent, from English ("cut by 20%") or Hindi ("20% कम करो"). */
function percentChange(message: string): number | undefined {
  const english = PERCENT.exec(message);
  if (english?.[1] && english[2]) {
    return (DECREASE_VERB.test(english[1]) ? -1 : 1) * Number(english[2]);
  }
  const hindi = PERCENT_HI.exec(message);
  if (hindi?.[1] && hindi[2]) return (/कम|घटा/.test(hindi[2]) ? -1 : 1) * Number(hindi[1]);
  return undefined;
}

function guestsFrom(current: number, message: string): number | undefined {
  const add = GUESTS_ADD.exec(message);
  const remove = GUESTS_REMOVE.exec(message);
  const to = GUESTS_TO.exec(message);
  const n = (match: RegExpExecArray) => Number(match[1] ?? match[2] ?? match[3]);
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
    const match = pattern.exec(message) ?? HINDI_KEYWORDS[constraint]?.exec(message);
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

/** Join "a, b and c" with the language's own "and". */
function joinWith(and: string, items: string[]): string {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1) ?? ''}`;
}
