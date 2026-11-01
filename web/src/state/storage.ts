import { BudgetCategorySchema, LIMITS, PlanResponseSchema } from '@utsav/shared';
import { z } from 'zod';
import { now } from '../lib/clock';

/** Single-plan keys from earlier versions, read once and migrated into the library. */
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

// ---------------------------------------------------------------- plan library

/** Every plan made in this browser, newest first. Single-plan saves are migrated in. */
export const LIBRARY_KEY = 'utsav:plans:v3';
export const MAX_SAVED_PLANS = 10;

const LibraryEntrySchema = z.strictObject({
  id: z.string().min(1).max(40),
  savedAt: z.iso.datetime(),
  plan: SavedPlanSchema,
});

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;

/** A fresh, collision-safe id for a new plan in this browser. */
export function newPlanId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Reads the library; unreadable or tampered entries are dropped, never trusted. */
export function loadLibrary(): LibraryEntry[] {
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.flatMap((entry) => {
        const parsed = LibraryEntrySchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      });
    }
    return migrateSinglePlan();
  } catch {
    return [];
  }
}

/**
 * Saves (or updates) one plan and moves it to the top; returns the new library. Pass the
 * library already in memory to skip re-reading and re-validating storage on every change.
 */
export function saveToLibrary(
  id: string,
  plan: Omit<SavedPlan, 'version'>,
  at: Date = now(),
  existing: readonly LibraryEntry[] = loadLibrary(),
): LibraryEntry[] {
  const entry: LibraryEntry = { id, savedAt: at.toISOString(), plan: { version: 2, ...plan } };
  const library = [entry, ...existing.filter((saved) => saved.id !== id)].slice(0, MAX_SAVED_PLANS);
  writeLibrary(library);
  return library;
}

/** Deletes one plan; returns the new library. */
export function removeFromLibrary(id: string): LibraryEntry[] {
  const library = loadLibrary().filter((saved) => saved.id !== id);
  writeLibrary(library);
  return library;
}

function writeLibrary(library: LibraryEntry[]): void {
  try {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch {
    // Storage full or blocked (private mode): plans still work for this visit.
  }
}

/** Earlier versions kept one plan; it becomes the first library entry. */
function migrateSinglePlan(): LibraryEntry[] {
  const raw =
    window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (raw === null) return [];
  // Old keys are read once: a valid plan moves into the library, an unreadable one is dropped.
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  const plan = parseSavedPlan(parseJson(raw));
  if (!plan) return [];
  const library: LibraryEntry[] = [{ id: newPlanId(), savedAt: now().toISOString(), plan }];
  writeLibrary(library);
  return library;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
