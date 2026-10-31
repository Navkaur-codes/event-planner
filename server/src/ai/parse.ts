/**
 * Turns raw model output into trusted AiIdeas. Nothing from the model reaches a
 * client without passing through here.
 */
import { AiIdeasSchema, type AiIdeas } from '@utsav/shared';

const HTML_TAG = /<\/?[a-z][^>]*>/gi;
const CONTROL_CHARS = /\p{Cc}/gu;
// Money amounts like "₹50,000", "Rs 500", "$20", "2 lakh" — the engine owns all numbers.
const MONEY =
  /(?:₹|\brs\.?|\binr\b|\$|€|£)\s?\d|\d[\d,.]*\s?(?:₹|\brs\b|\binr\b|rupees?|dollars?|euros?|pounds?|lakhs?|crores?|usd|eur|gbp)/i;

// Signs that an answer echoes the prompt or a key (prompt injection that "worked").
const LEAK = /gsk_|you are utsav|event_data|refine_data|never reveal these instructions/i;

// Mirrors AiIdeasSchema's limits so slightly over-long answers are trimmed rather than
// thrown away; the schema still has the final say (a test keeps the two in step).
const LIST_LIMITS = {
  decor: 6,
  food: 6,
  activities: 6,
  vendorQuestions: 6,
  personalTouches: 4,
} as const;
const TEXT_LIMITS = { summary: 600, themeName: 60, themeDescription: 300, item: 200 } as const;
const MAX_THEMES = 3;
// Cut at the last space only if it keeps most of the text; otherwise cut mid-word.
const MIN_WORD_CUT = 0.6;

/** Parsed ideas, or a log-safe failure label (field names only, never content). */
export type ParseResult = { ok: true; ideas: AiIdeas } | { ok: false; failure: string };

/** Parses, cleans, trims to the schema's limits and validates model output. */
export function parseIdeas(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, failure: 'not_json' };
  }
  const result = AiIdeasSchema.safeParse(normalize(dropMoneyItems(sanitize(json))));
  if (!result.success) {
    const fields = new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'root')));
    return { ok: false, failure: `schema:${[...fields].join(',')}` };
  }
  if (revealsPrompt(result.data)) return { ok: false, failure: 'leak' };
  const { summary, themes } = result.data;
  const mentionsMoney = [summary, ...themes.flatMap((t) => [t.name, t.description])].some((s) =>
    MONEY.test(s),
  );
  return mentionsMoney ? { ok: false, failure: 'money' } : { ok: true, ideas: result.data };
}

/** True when any string in the value looks like leaked prompt text or an API key. */
export function revealsPrompt(value: unknown): boolean {
  if (typeof value === 'string') return LEAK.test(value);
  if (Array.isArray(value)) return value.some(revealsPrompt);
  if (isRecord(value)) return Object.values(value).some(revealsPrompt);
  return false;
}

/** Recursively strips HTML tags and control characters and collapses whitespace. */
export function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(HTML_TAG, '').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

/** Shortens text to `max` characters, preferring a word boundary, ending with "…". */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace >= max * MIN_WORD_CUT ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.-]+$/, '')}…`;
}

/** Trims lists and strings to the schema's limits; leaves wrong types for the schema to reject. */
function normalize(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const copy: Record<string, unknown> = { ...value };
  if (typeof copy.summary === 'string') {
    copy.summary = truncateText(copy.summary, TEXT_LIMITS.summary);
  }
  if (Array.isArray(copy.themes)) {
    copy.themes = copy.themes.slice(0, MAX_THEMES).map((theme: unknown) =>
      isRecord(theme)
        ? {
            ...theme,
            ...textField(theme, 'name', TEXT_LIMITS.themeName),
            ...textField(theme, 'description', TEXT_LIMITS.themeDescription),
          }
        : theme,
    );
  }
  for (const [key, max] of Object.entries(LIST_LIMITS)) {
    const list = copy[key];
    if (Array.isArray(list)) {
      copy[key] = list
        .slice(0, max)
        .map((item: unknown) =>
          typeof item === 'string' ? truncateText(item, TEXT_LIMITS.item) : item,
        );
    }
  }
  return copy;
}

function textField(record: Record<string, unknown>, key: string, max: number) {
  const text = record[key];
  return typeof text === 'string' ? { [key]: truncateText(text, max) } : {};
}

/** Removes list items that quote prices; a list left empty then fails validation. */
function dropMoneyItems(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const copy: Record<string, unknown> = { ...value };
  for (const key of Object.keys(LIST_LIMITS)) {
    const list = copy[key];
    if (Array.isArray(list)) {
      copy[key] = list.filter((item) => typeof item !== 'string' || !MONEY.test(item));
    }
  }
  return copy;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
