/**
 * Planning engine — STEP 0 STUB.
 * Session A replaces this file's internals with the real engine, keeping the exact
 * export names and signatures from docs/contracts.md §3, and flips IMPLEMENTATION.
 * The stub is deterministic and always returns schema-valid output.
 */
import type {
  BudgetLine,
  BudgetPlan,
  EnginePlan,
  EventInput,
  Milestone,
  PlanPatch,
  PortStatus,
} from '../contracts.js';
import { BudgetCategorySchema } from '../contracts.js';

export const IMPLEMENTATION: PortStatus = 'stub';

const DAY_MS = 86_400_000;
const CONTINGENCY_SHARE = 0.1;

/** Builds a full plan for the event. Pure: `today` is the only clock. */
export function buildPlan(input: EventInput, today: Date): EnginePlan {
  return {
    input,
    budget: recalculateBudget(input, {}),
    timeline: { milestones: stubMilestones(input.eventDate, today), compressed: false },
    checklist: [
      {
        id: 'c-venue',
        vendor: 'venue',
        task: 'Shortlist and book a venue',
        priority: 'must',
        done: false,
      },
      {
        id: 'c-food',
        vendor: 'caterer',
        task: 'Taste and confirm the menu',
        priority: 'must',
        done: false,
      },
    ],
    warnings: [],
    generatedAt: today.toISOString(),
  };
}

/** Applies a validated refinement patch to the input. Pure. */
export function applyPatch(input: EventInput, patch: PlanPatch): EventInput {
  const budget =
    patch.budget ??
    (patch.budgetChangePercent === undefined
      ? input.budget
      : Math.round(input.budget * (1 + patch.budgetChangePercent / 100)));
  return {
    ...input,
    budget,
    guestCount: patch.guestCount ?? input.guestCount,
    eventDate: patch.eventDate ?? input.eventDate,
    priorities: patch.priorities ?? input.priorities,
    vibe: patch.vibe ?? input.vibe,
  };
}

/** Recomputes only the budget (used by the what-if sliders). Pure. */
export function recalculateBudget(
  input: EventInput,
  overrides: { budget?: number; guestCount?: number },
): BudgetPlan {
  const total = overrides.budget ?? input.budget;
  const guests = overrides.guestCount ?? input.guestCount;
  const categories = BudgetCategorySchema.options.filter((c) => c !== 'contingency');
  const contingency = Math.round(total * CONTINGENCY_SHARE);
  const share = Math.floor((total - contingency) / categories.length);
  const lines: BudgetLine[] = categories.map((category) => ({
    category,
    amount: share,
    percent: round1((share / total) * 100),
    note: 'Equal split (stub)',
  }));
  const remainder = total - contingency - share * categories.length;
  lines.push({
    category: 'contingency',
    amount: contingency + remainder,
    percent: round1(((contingency + remainder) / total) * 100),
    note: 'Buffer for surprises',
  });
  return { total, currency: input.currency, perGuest: Math.round(total / guests), lines };
}

function stubMilestones(eventDate: string, today: Date): Milestone[] {
  const event = Date.parse(`${eventDate}T00:00:00Z`);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const daysLeft = Math.max(0, Math.round((event - start) / DAY_MS));
  const steps = [
    { id: 'm-venue', title: 'Book the venue', fraction: 1, category: 'venue' },
    { id: 'm-invites', title: 'Send invitations', fraction: 0.5, category: 'invitations' },
    { id: 'm-confirm', title: 'Confirm all vendors', fraction: 0, category: 'planning' },
  ] as const;
  return steps.map((step) => {
    const daysBefore = Math.round(daysLeft * step.fraction);
    return {
      id: step.id,
      title: step.title,
      dueDate: new Date(event - daysBefore * DAY_MS).toISOString().slice(0, 10),
      daysBefore,
      category: step.category,
      done: false,
    };
  });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
