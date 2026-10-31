import { PlanResponseSchema, type PlanResponse } from '@utsav/shared';
import { z } from 'zod';

/** Bump the version when the saved shape changes; older saves are then ignored. */
export const STORAGE_KEY = 'utsav:plan:v1';

const SavedPlanSchema = z.strictObject({
  version: z.literal(1),
  response: PlanResponseSchema,
  celebrated: z.boolean(),
});

export type SavedPlan = z.infer<typeof SavedPlanSchema>;

/** Reads the saved plan; returns null when absent, unreadable or failing the schema. */
export function loadSavedPlan(): SavedPlan | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = SavedPlanSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Saves the plan; storage being full or blocked (private mode) is ignored on purpose. */
export function savePlan(response: PlanResponse, celebrated: boolean): void {
  const saved: SavedPlan = { version: 1, response, celebrated };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // The plan still works for this visit; it just will not survive a reload.
  }
}

/** Removes the saved plan. */
export function clearSavedPlan(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
