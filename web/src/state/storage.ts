import { BudgetCategorySchema, LIMITS, PlanResponseSchema } from '@utsav/shared';
import { z } from 'zod';

/** Bump the version when the saved shape changes; `parseSavedPlan` migrates older saves. */
export const STORAGE_KEY = 'utsav:plan:v2';
const LEGACY_STORAGE_KEY = 'utsav:plan:v1';

/** Actual spend per budget category, entered in the tracker. */
export const ActualsSchema = z.partialRecord(
  BudgetCategorySchema,
  z.number().int().nonnegative().max(LIMITS.budget.max),
);

/** The saved plan — also the format of exported plan files. */
export const SavedPlanSchema = z.strictObject({
  version: z.literal(2),
  response: PlanResponseSchema,
  celebrated: z.boolean(),
  actuals: ActualsSchema,
});

const SavedPlanV1Schema = z.strictObject({
  version: z.literal(1),
  response: PlanResponseSchema,
  celebrated: z.boolean(),
});

export type Actuals = z.infer<typeof ActualsSchema>;
export type SavedPlan = z.infer<typeof SavedPlanSchema>;

/** Validates unknown data as a saved plan (current or v1); null when it is not one. */
export function parseSavedPlan(data: unknown): SavedPlan | null {
  const current = SavedPlanSchema.safeParse(data);
  if (current.success) return current.data;
  const legacy = SavedPlanV1Schema.safeParse(data);
  return legacy.success ? { ...legacy.data, version: 2, actuals: {} } : null;
}

/** Reads the saved plan; returns null when absent, unreadable or failing the schema. */
export function loadSavedPlan(): SavedPlan | null {
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? parseSavedPlan(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Saves the plan; storage being full or blocked (private mode) is ignored on purpose. */
export function savePlan(plan: Omit<SavedPlan, 'version'>): void {
  const saved: SavedPlan = { version: 2, ...plan };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // The plan still works for this visit; it just will not survive a reload.
  }
}

/** Removes the saved plan. */
export function clearSavedPlan(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
