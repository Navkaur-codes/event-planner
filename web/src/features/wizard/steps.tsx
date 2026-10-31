import {
  ConstraintSchema,
  PRIORITIES,
  type Constraint,
  type EventType,
  type Priority,
} from '@utsav/shared';
import {
  CATEGORY_LABELS,
  CITY_TIER_LABELS,
  CONSTRAINT_LABELS,
  CURRENCY_LABELS,
  EVENT_LABELS,
  LANGUAGE_LABELS,
} from '../../lib/labels';
import { CheckboxGroup, RadioGroup, SelectField, TextField } from './fields';
import type { DraftErrors, EventDraft } from './wizardModel';

export interface StepProps {
  draft: EventDraft;
  errors: DraftErrors;
  update: <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => void;
  today: string;
}

const PRIORITY_OPTIONS = Object.fromEntries(
  PRIORITIES.map((p) => [p, CATEGORY_LABELS[p]]),
) as Record<Priority, string>;

const CONSTRAINT_OPTIONS = Object.fromEntries(
  ConstraintSchema.options.map((c) => [c, CONSTRAINT_LABELS[c]]),
) as Record<Constraint, string>;

const TITLE_PLACEHOLDER: Record<EventType, string> = {
  wedding: 'Meera & Kabir’s wedding',
  birthday: 'Aarav turns 7',
  community: 'Diwali mela on our street',
};

/** Step 1: what, when, where and how many. */
export function StepBasics({ draft, errors, update, today }: StepProps) {
  return (
    <>
      <RadioGroup
        name="eventType"
        label="What are you celebrating?"
        options={EVENT_LABELS}
        value={draft.eventType}
        error={errors.eventType}
        onChange={(value) => update('eventType', value)}
      />
      <TextField
        name="title"
        label="Event name"
        maxLength={80}
        autoComplete="off"
        placeholder={TITLE_PLACEHOLDER[draft.eventType]}
        value={draft.title}
        error={errors.title}
        onChange={(value) => update('title', value)}
      />
      <div className="field-row">
        <TextField
          name="eventDate"
          label="Date"
          type="date"
          min={today}
          value={draft.eventDate}
          error={errors.eventDate}
          onChange={(value) => update('eventDate', value)}
        />
        <TextField
          name="guestCount"
          label="Number of guests"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={draft.guestCount}
          error={errors.guestCount}
          onChange={(value) => update('guestCount', value)}
        />
      </div>
      <div className="field-row">
        <TextField
          name="city"
          label="City"
          maxLength={60}
          autoComplete="address-level2"
          value={draft.city}
          error={errors.city}
          onChange={(value) => update('city', value)}
        />
        <SelectField
          name="cityTier"
          label="City size"
          hint="Helps us estimate local prices."
          options={CITY_TIER_LABELS}
          value={draft.cityTier}
          error={errors.cityTier}
          onChange={(value) => update('cityTier', value)}
        />
      </div>
    </>
  );
}

/** Step 2: total budget and what matters most. */
export function StepBudget({ draft, errors, update }: StepProps) {
  return (
    <>
      <div className="field-row">
        <TextField
          name="budget"
          label="Total budget"
          hint="Whole amount, no commas — e.g. 500000."
          type="number"
          inputMode="numeric"
          min={1000}
          step={1}
          value={draft.budget}
          error={errors.budget}
          onChange={(value) => update('budget', value)}
        />
        <SelectField
          name="currency"
          label="Currency"
          options={CURRENCY_LABELS}
          value={draft.currency}
          error={errors.currency}
          onChange={(value) => update('currency', value)}
        />
      </div>
      <CheckboxGroup
        name="priorities"
        label="Top priorities (up to 3)"
        hint="These get a bigger slice of the budget."
        options={PRIORITY_OPTIONS}
        values={draft.priorities}
        error={errors.priorities}
        onChange={(values) => update('priorities', values)}
      />
    </>
  );
}

/** Step 3: the feel of the day and the language for ideas. */
export function StepStyle({ draft, errors, update }: StepProps) {
  return (
    <>
      <TextField
        name="vibe"
        label="Vibe (optional)"
        hint="A few words, like “boho garden” or “retro 90s”."
        maxLength={200}
        value={draft.vibe}
        error={errors.vibe}
        onChange={(value) => update('vibe', value)}
      />
      <TextField
        name="traditions"
        label="Traditions or rituals (optional)"
        multiline
        maxLength={200}
        value={draft.traditions}
        error={errors.traditions}
        onChange={(value) => update('traditions', value)}
      />
      <RadioGroup
        name="language"
        label="Language for your ideas"
        options={LANGUAGE_LABELS}
        value={draft.language}
        error={errors.language}
        onChange={(value) => update('language', value)}
      />
    </>
  );
}

/** Step 4: dietary, access and venue needs, plus free notes. */
export function StepNeeds({ draft, errors, update }: StepProps) {
  return (
    <>
      <CheckboxGroup
        name="constraints"
        label="Anything we should plan around? (optional)"
        options={CONSTRAINT_OPTIONS}
        values={draft.constraints}
        error={errors.constraints}
        onChange={(values) => update('constraints', values)}
      />
      <TextField
        name="notes"
        label="Notes (optional)"
        hint="E.g. “Grandparents attending” or “Surprise party”."
        multiline
        maxLength={500}
        value={draft.notes}
        error={errors.notes}
        onChange={(value) => update('notes', value)}
      />
    </>
  );
}

export const STEP_COMPONENTS = [StepBasics, StepBudget, StepStyle, StepNeeds] as const;
