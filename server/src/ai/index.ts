/**
 * GenAI layer — STEP 0 STUB.
 * Session B replaces this with the Groq-backed implementation, keeping the exact
 * export names and signatures from docs/contracts.md §3, and flips IMPLEMENTATION.
 */
import type {
  AiIdeas,
  AiStatus,
  EnginePlan,
  EventInput,
  PlanPatch,
  PortStatus,
} from '@utsav/shared';

export const IMPLEMENTATION: PortStatus = 'stub';

interface AiOptions {
  signal?: AbortSignal;
}

/** Deterministic ideas used whenever the AI is unavailable. */
export function fallbackIdeas(input: EventInput): AiIdeas {
  return {
    summary: `A joyful ${input.eventType} for ${input.guestCount} guests in ${input.city}.`,
    themes: [
      { name: 'Classic celebration', description: 'Warm colours, fresh flowers and good music.' },
    ],
    decor: ['Marigold garlands and fairy lights'],
    food: ['A seasonal menu that suits every guest'],
    activities: ['A short welcome toast and a group photo'],
    vendorQuestions: ['What is included in the quoted price?'],
    personalTouches: ['A handwritten welcome board'],
  };
}

/** Generates personalized ideas for a plan. Stub: always returns the fallback. */
export async function generateIdeas(
  input: EventInput,
  _plan: EnginePlan,
  _options: AiOptions = {},
): Promise<{ ideas: AiIdeas; aiStatus: AiStatus }> {
  return { ideas: fallbackIdeas(input), aiStatus: 'fallback' };
}

/** Turns a free-text request into a structured patch. Stub: only records the focus. */
export async function interpretRefinement(
  _input: EventInput,
  message: string,
  _options: AiOptions = {},
): Promise<{ patch: PlanPatch; explanation: string; aiStatus: AiStatus }> {
  return {
    patch: { ideaFocus: message.slice(0, 200) },
    explanation: 'Noted your request for the ideas section.',
    aiStatus: 'fallback',
  };
}
