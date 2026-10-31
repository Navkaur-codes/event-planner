/**
 * Turns raw model output into trusted AiIdeas, or null. Nothing from the model
 * reaches a client without passing through here.
 */
import { AiIdeasSchema, type AiIdeas } from '@utsav/shared';

const HTML_TAG = /<\/?[a-z][^>]*>/gi;
const CONTROL_CHARS = /\p{Cc}/gu;
// Money amounts like "₹50,000", "Rs 500", "$20", "2 lakh" — the engine owns all numbers.
const MONEY =
  /(?:₹|\brs\.?|\binr\b|\$|€|£)\s?\d|\d[\d,.]*\s?(?:₹|\brs\b|\binr\b|rupees?|dollars?|euros?|pounds?|lakhs?|crores?|usd|eur|gbp)/i;

const LIST_KEYS = ['decor', 'food', 'activities', 'vendorQuestions', 'personalTouches'] as const;

/** Parses, cleans and validates model output; returns null when it is unusable. */
export function parseIdeas(raw: string): AiIdeas | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = AiIdeasSchema.safeParse(dropMoneyItems(sanitize(json)));
  if (!result.success) return null;
  const { summary, themes } = result.data;
  const mentionsMoney = [summary, ...themes.flatMap((t) => [t.name, t.description])].some((s) =>
    MONEY.test(s),
  );
  return mentionsMoney ? null : result.data;
}

/** Recursively strips HTML tags and control characters and collapses whitespace. */
export function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(HTML_TAG, '').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

/** Removes list items that quote prices; a list left empty then fails validation. */
function dropMoneyItems(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  const copy: Record<string, unknown> = { ...value };
  for (const key of LIST_KEYS) {
    const list = copy[key];
    if (Array.isArray(list)) {
      copy[key] = list.filter((item) => typeof item !== 'string' || !MONEY.test(item));
    }
  }
  return copy;
}
