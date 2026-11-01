/**
 * Turns raw model output for a refine request into a trusted PlanPatch. Numbers the
 * host did not state are dropped: the AI may only repeat numbers, never choose them.
 */
import { PlanPatchSchema, type EventInput, type PlanPatch } from '@utsav/shared';
import { z } from 'zod';
import { revealsPrompt, sanitize, truncateText } from './parse.js';
import { numbersIn, type Interpretation } from './refineParser.js';

const MAX_EXPLANATION = 300;

const RefineAnswerSchema = z.strictObject({
  patch: PlanPatchSchema,
  explanation: z.string().trim().min(1),
});

/** A validated interpretation, or a log-safe failure label. */
export type PatchResult = { ok: true; value: Interpretation } | { ok: false; failure: string };

/** Parses, validates and number-checks the model's patch for `message`. */
export function parsePatch(raw: string, input: EventInput, message: string): PatchResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, failure: 'not_json' };
  }
  const result = RefineAnswerSchema.safeParse(sanitize(json));
  if (!result.success) {
    const fields = new Set(result.error.issues.map((issue) => issue.path.join('.') || 'root'));
    return { ok: false, failure: `schema:${[...fields].join(',')}` };
  }
  if (revealsPrompt(result.data)) return { ok: false, failure: 'leak' };

  const patch = keepStatedNumbers(result.data.patch, input, message);
  const droppedEverything =
    Object.keys(patch).length === 0 && Object.keys(result.data.patch).length > 0;
  if (droppedEverything) return { ok: false, failure: 'unstated_numbers' };
  return {
    ok: true,
    value: { patch, explanation: truncateText(result.data.explanation, MAX_EXPLANATION) },
  };
}

/** Removes numeric or date fields whose value does not come from the message. */
function keepStatedNumbers(patch: PlanPatch, input: EventInput, message: string): PlanPatch {
  const stated = numbersIn(message);
  const copy: PlanPatch = { ...patch };
  if (copy.budget !== undefined && !stated.has(copy.budget)) delete copy.budget;
  if (copy.budgetChangePercent !== undefined && !stated.has(Math.abs(copy.budgetChangePercent))) {
    delete copy.budgetChangePercent;
  }
  if (
    copy.guestCount !== undefined &&
    !stated.has(copy.guestCount) &&
    !stated.has(Math.abs(copy.guestCount - input.guestCount))
  ) {
    delete copy.guestCount;
  }
  // A date is kept only when its day of the month was said ("move it to 14 Feb"), so the
  // model can never pick a date the host did not ask for.
  if (copy.eventDate !== undefined && !stated.has(Number(copy.eventDate.slice(8, 10)))) {
    delete copy.eventDate;
  }
  return copy;
}
