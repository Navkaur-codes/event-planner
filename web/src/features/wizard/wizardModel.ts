import {
  EventInputSchema,
  LIMITS,
  type CityTier,
  type Constraint,
  type Currency,
  type EventInput,
  type EventType,
  type Language,
  type Priority,
} from '@utsav/shared';

/** What the form holds: like `EventInput`, but numbers stay as typed text until validated. */
export interface EventDraft {
  eventType: EventType;
  title: string;
  eventDate: string;
  city: string;
  cityTier: CityTier;
  guestCount: string;
  budget: string;
  currency: Currency;
  vibe: string;
  priorities: Priority[];
  constraints: Constraint[];
  traditions: string;
  notes: string;
  language: Language;
}

export type DraftField = keyof EventDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

export interface WizardStep {
  id: string;
  title: string;
  fields: readonly DraftField[];
}

export const STEPS: readonly WizardStep[] = [
  {
    id: 'basics',
    title: 'Basics',
    fields: ['eventType', 'title', 'eventDate', 'city', 'cityTier', 'guestCount'],
  },
  { id: 'budget', title: 'Budget', fields: ['budget', 'currency', 'priorities'] },
  { id: 'style', title: 'Style', fields: ['vibe', 'traditions', 'language'] },
  { id: 'needs', title: 'Needs', fields: ['constraints', 'notes'] },
];

/** The step at `index`; the wizard never asks for one outside `STEPS`. */
export function stepAt(index: number): WizardStep {
  const step = STEPS[index];
  if (!step) throw new RangeError(`No wizard step ${index}`);
  return step;
}

const number = new Intl.NumberFormat('en-IN');

/** Friendly text per field; the shared schema decides *whether* a value is valid. */
const FIELD_MESSAGES: Record<DraftField, string> = {
  eventType: 'Choose what you are celebrating.',
  title: 'Give your event a name (up to 80 characters).',
  eventDate: 'Choose the date of the event.',
  city: 'Tell us the city (up to 60 characters).',
  cityTier: 'Choose the kind of city.',
  guestCount: `Enter a whole number of guests from ${LIMITS.guestCount.min} to ${number.format(LIMITS.guestCount.max)}.`,
  budget: `Enter a whole budget from ${number.format(LIMITS.budget.min)} to ${number.format(LIMITS.budget.max)}.`,
  currency: 'Choose a currency.',
  priorities: `Pick up to ${LIMITS.maxPriorities} priorities.`,
  vibe: 'Keep the vibe under 200 characters.',
  traditions: 'Keep traditions under 200 characters.',
  notes: 'Keep notes under 500 characters.',
  constraints: 'Choose from the listed needs.',
  language: 'Choose a language for your ideas.',
};

/** A blank draft for the chosen event type. */
export function emptyDraft(eventType: EventType): EventDraft {
  return {
    eventType,
    title: '',
    eventDate: '',
    city: '',
    cityTier: 'metro',
    guestCount: '',
    budget: '',
    currency: 'INR',
    vibe: '',
    priorities: [],
    constraints: [],
    traditions: '',
    notes: '',
    language: 'en',
  };
}

/** A draft prefilled from an existing plan's input (the "Edit details" path). */
export function draftFromInput(input: EventInput): EventDraft {
  return { ...input, guestCount: String(input.guestCount), budget: String(input.budget) };
}

function toNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

/**
 * Validates the whole draft with the shared `EventInputSchema` plus the "not in the past" rule.
 * Returns the parsed input when everything is valid, and friendly errors keyed by field.
 */
export function validateDraft(
  draft: EventDraft,
  today: string,
): { input: EventInput | null; errors: DraftErrors } {
  const result = EventInputSchema.safeParse({
    ...draft,
    guestCount: toNumber(draft.guestCount),
    budget: toNumber(draft.budget),
  });
  const errors: DraftErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as DraftField | undefined;
      if (field && field in FIELD_MESSAGES) errors[field] = FIELD_MESSAGES[field];
    }
  }
  // ISO dates compare correctly as strings.
  if (!errors.eventDate && draft.eventDate < today) {
    errors.eventDate = 'That date has passed — pick today or a later date.';
  }
  const valid = result.success && Object.keys(errors).length === 0;
  return { input: valid ? result.data : null, errors };
}

/** Only the errors that belong to one wizard step. */
export function errorsForStep(errors: DraftErrors, step: WizardStep): DraftErrors {
  return Object.fromEntries(
    step.fields.filter((field) => errors[field]).map((field) => [field, errors[field]]),
  );
}

/** The errors without `field` (used when the person edits that field). */
export function withoutError(errors: DraftErrors, field: DraftField): DraftErrors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => key !== field));
}

/** Index of the first step that has an error, or -1. */
export function firstStepWithErrors(errors: DraftErrors): number {
  return STEPS.findIndex((step) => step.fields.some((field) => errors[field]));
}
