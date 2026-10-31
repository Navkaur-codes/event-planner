import { parseSavedPlan, type SavedPlan } from './storage';

/** A real plan file is a few kB; anything far bigger is not one. */
export const MAX_PLAN_FILE_BYTES = 200_000;

const NOT_A_PLAN =
  'That file isn’t a valid Utsav plan — it may have been edited or damaged. Your current plan is unchanged.';

export type PlanFileResult = { ok: true; saved: SavedPlan } | { ok: false; message: string };

/** Reads and schema-validates an imported plan file; never throws. */
export async function readPlanFile(file: File): Promise<PlanFileResult> {
  if (file.size > MAX_PLAN_FILE_BYTES) {
    return { ok: false, message: 'That file is too big to be a Utsav plan. Nothing was changed.' };
  }
  try {
    const saved = parseSavedPlan(JSON.parse(await file.text()));
    return saved ? { ok: true, saved } : { ok: false, message: NOT_A_PLAN };
  } catch {
    return { ok: false, message: NOT_A_PLAN };
  }
}

/** A safe download name from the event title, e.g. "utsav-aarav-turns-7.json". */
export function planFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `utsav-${slug || 'plan'}.json`;
}

/** Downloads the plan as a JSON file the person can import later. */
export function downloadPlanFile(saved: SavedPlan): void {
  const blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = planFileName(saved.response.plan.input.title);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
