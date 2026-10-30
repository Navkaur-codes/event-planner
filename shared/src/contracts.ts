/**
 * Shared contracts (v1) — the single source of truth for every shape that crosses
 * a boundary between the engine, the API and the web app. Mirrors docs/contracts.md.
 * All objects are strict: unknown keys are rejected.
 */
import { z } from 'zod';

export const CONTRACTS_VERSION = 'v1';

// ---------------------------------------------------------------- helpers

/** Trimmed free text with an upper length bound. */
const text = (max: number) => z.string().trim().max(max);
/** Trimmed, non-empty text with an upper length bound. */
const requiredText = (max: number) => z.string().trim().min(1).max(max);
/** Array whose items must be unique. */
const uniqueArray = <T extends z.ZodType>(item: T, max: number) =>
  z
    .array(item)
    .max(max)
    .refine((items) => new Set(items).size === items.length, { message: 'Items must be unique' });

const isoDate = z.iso.date();
const money = z.number().int().nonnegative();

// ---------------------------------------------------------------- enums

export const EventTypeSchema = z.enum(['wedding', 'birthday', 'community']);
export const CurrencySchema = z.enum(['INR', 'USD', 'EUR', 'GBP']);
export const CityTierSchema = z.enum(['metro', 'tier2', 'small_town']);
export const LanguageSchema = z.enum(['en', 'hi']);

export const PRIORITIES = [
  'venue',
  'food',
  'decor',
  'photography',
  'entertainment',
  'attire',
  'invitations',
  'gifts',
  'logistics',
] as const;
export const PrioritySchema = z.enum(PRIORITIES);
export const BudgetCategorySchema = z.enum([...PRIORITIES, 'contingency']);

export const ConstraintSchema = z.enum([
  'vegetarian',
  'vegan',
  'jain',
  'halal',
  'alcohol_free',
  'eco_friendly',
  'wheelchair_access',
  'kid_friendly',
  'elder_friendly',
  'outdoor',
  'indoor',
]);

export const VendorTypeSchema = z.enum([
  'venue',
  'caterer',
  'decorator',
  'photographer',
  'dj_music',
  'makeup_attire',
  'invitations_printer',
  'cake_baker',
  'transport',
  'priest_officiant',
  'sound_lighting',
  'permits_security',
  'rentals',
]);

export const SeveritySchema = z.enum(['info', 'warn', 'critical']);
export const ItemPrioritySchema = z.enum(['must', 'should', 'nice']);
export const AiStatusSchema = z.enum(['ai', 'fallback']);
export const PortStatusSchema = z.enum(['real', 'stub']);

export const LIMITS = {
  guestCount: { min: 1, max: 5000 },
  budget: { min: 1_000, max: 100_000_000 },
  maxPriorities: 3,
  refineMessage: 300,
} as const;

// ---------------------------------------------------------------- input

export const EventInputSchema = z.strictObject({
  eventType: EventTypeSchema,
  title: requiredText(80),
  eventDate: isoDate,
  city: requiredText(60),
  cityTier: CityTierSchema,
  guestCount: z.number().int().min(LIMITS.guestCount.min).max(LIMITS.guestCount.max),
  budget: z.number().int().min(LIMITS.budget.min).max(LIMITS.budget.max),
  currency: CurrencySchema,
  vibe: text(200),
  priorities: uniqueArray(PrioritySchema, LIMITS.maxPriorities),
  constraints: uniqueArray(ConstraintSchema, ConstraintSchema.options.length),
  traditions: text(200),
  notes: text(500),
  language: LanguageSchema,
});

// ---------------------------------------------------------------- engine output

export const BudgetLineSchema = z.strictObject({
  category: BudgetCategorySchema,
  amount: money,
  percent: z.number().min(0).max(100),
  note: text(200),
});

export const BudgetPlanSchema = z
  .strictObject({
    total: money,
    currency: CurrencySchema,
    perGuest: money,
    lines: z.array(BudgetLineSchema).min(1),
  })
  .refine((plan) => plan.lines.reduce((sum, line) => sum + line.amount, 0) === plan.total, {
    message: 'Budget lines must sum exactly to the total',
  })
  .refine((plan) => plan.lines.filter((line) => line.category === 'contingency').length === 1, {
    message: 'Budget must contain exactly one contingency line',
  });

export const MilestoneSchema = z.strictObject({
  id: requiredText(60),
  title: requiredText(120),
  dueDate: isoDate,
  daysBefore: z.number().int().nonnegative(),
  category: z.union([BudgetCategorySchema, z.literal('planning')]),
  done: z.boolean(),
});

export const TimelineSchema = z.strictObject({
  milestones: z.array(MilestoneSchema),
  compressed: z.boolean(),
});

export const ChecklistItemSchema = z.strictObject({
  id: requiredText(60),
  vendor: VendorTypeSchema,
  task: requiredText(200),
  priority: ItemPrioritySchema,
  done: z.boolean(),
});

export const WarningSchema = z.strictObject({
  code: requiredText(60),
  severity: SeveritySchema,
  message: requiredText(300),
});

export const EnginePlanSchema = z.strictObject({
  input: EventInputSchema,
  budget: BudgetPlanSchema,
  timeline: TimelineSchema,
  checklist: z.array(ChecklistItemSchema),
  warnings: z.array(WarningSchema),
  generatedAt: z.iso.datetime(),
});

// ---------------------------------------------------------------- AI output

const ideaList = (min: number, max: number) => z.array(requiredText(200)).min(min).max(max);

export const ThemeIdeaSchema = z.strictObject({
  name: requiredText(60),
  description: requiredText(300),
});

export const AiIdeasSchema = z.strictObject({
  summary: requiredText(600),
  themes: z.array(ThemeIdeaSchema).min(1).max(3),
  decor: ideaList(1, 6),
  food: ideaList(1, 6),
  activities: ideaList(1, 6),
  vendorQuestions: ideaList(1, 6),
  personalTouches: ideaList(1, 4),
});

export const PlanResponseSchema = z.strictObject({
  plan: EnginePlanSchema,
  ideas: AiIdeasSchema,
  aiStatus: AiStatusSchema,
});

// ---------------------------------------------------------------- refine

export const RefineRequestSchema = z.strictObject({
  input: EventInputSchema,
  message: requiredText(LIMITS.refineMessage),
});

export const PlanPatchSchema = z.strictObject({
  budget: z.number().int().min(LIMITS.budget.min).max(LIMITS.budget.max).optional(),
  budgetChangePercent: z.number().min(-90).max(200).optional(),
  guestCount: z.number().int().min(LIMITS.guestCount.min).max(LIMITS.guestCount.max).optional(),
  eventDate: isoDate.optional(),
  addConstraints: uniqueArray(ConstraintSchema, ConstraintSchema.options.length).optional(),
  removeConstraints: uniqueArray(ConstraintSchema, ConstraintSchema.options.length).optional(),
  priorities: uniqueArray(PrioritySchema, LIMITS.maxPriorities).optional(),
  vibe: text(200).optional(),
  ideaFocus: text(200).optional(),
});

export const RefineResponseSchema = z.strictObject({
  patch: PlanPatchSchema,
  explanation: requiredText(300),
  result: PlanResponseSchema,
});

// ---------------------------------------------------------------- API envelopes

export const HealthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  version: requiredText(20),
  ports: z.strictObject({ engine: PortStatusSchema, ai: PortStatusSchema }),
  aiConfigured: z.boolean(),
});

export const ApiErrorCodeSchema = z.enum(['VALIDATION', 'RATE_LIMITED', 'NOT_FOUND', 'INTERNAL']);

export const ApiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: ApiErrorCodeSchema,
    message: requiredText(300),
    issues: z.array(z.strictObject({ path: z.string(), message: z.string() })).optional(),
  }),
});

// ---------------------------------------------------------------- types

export type EventType = z.infer<typeof EventTypeSchema>;
export type Currency = z.infer<typeof CurrencySchema>;
export type CityTier = z.infer<typeof CityTierSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
export type VendorType = z.infer<typeof VendorTypeSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type ItemPriority = z.infer<typeof ItemPrioritySchema>;
export type AiStatus = z.infer<typeof AiStatusSchema>;
export type PortStatus = z.infer<typeof PortStatusSchema>;
export type EventInput = z.infer<typeof EventInputSchema>;
export type BudgetLine = z.infer<typeof BudgetLineSchema>;
export type BudgetPlan = z.infer<typeof BudgetPlanSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type Timeline = z.infer<typeof TimelineSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type Warning = z.infer<typeof WarningSchema>;
export type EnginePlan = z.infer<typeof EnginePlanSchema>;
export type ThemeIdea = z.infer<typeof ThemeIdeaSchema>;
export type AiIdeas = z.infer<typeof AiIdeasSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type RefineRequest = z.infer<typeof RefineRequestSchema>;
export type PlanPatch = z.infer<typeof PlanPatchSchema>;
export type RefineResponse = z.infer<typeof RefineResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
