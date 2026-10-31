import type { ChecklistItem, EventInput, ItemPriority } from '../contracts.js';
import type { ChecklistRule } from './rules/vendors.js';
import { BASE_CHECKLIST, CONDITIONAL_CHECKLIST } from './rules/vendors.js';

const PRIORITY_ORDER: Record<ItemPriority, number> = { must: 0, should: 1, nice: 2 };

/**
 * Builds the vendor checklist: the event type's base vendors plus every conditional rule
 * that matches the input, ordered must → should → nice (rule order within each group).
 */
export function buildChecklist(input: EventInput): ChecklistItem[] {
  const rules: ChecklistRule[] = [
    ...BASE_CHECKLIST[input.eventType],
    ...CONDITIONAL_CHECKLIST.filter((rule) => rule.when(input)),
  ];
  return rules
    .map((rule) => ({
      id: rule.id,
      vendor: rule.vendor,
      task: typeof rule.task === 'function' ? rule.task(input) : rule.task,
      priority: rule.priority,
      done: false,
    }))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
