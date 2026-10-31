/** Numeric thresholds the checklist and warnings rules compare against. */
import type { CityTier, Currency, EventType } from '../../contracts.js';

/** Above this many guests, crowd control, permits and transport become must-haves. */
export const LARGE_EVENT_GUESTS = 150;

/** Community events above this size usually need police / municipal permission. */
export const PERMIT_WARNING_GUESTS = 1000;

/** Events closer than this many days are flagged as critical. */
export const SHORT_NOTICE_DAYS = 14;

/**
 * Rough minimum spend per guest in INR for a modest event, by type and city tier. Below the
 * minimum we warn; below half of it the warning becomes critical.
 */
export const MIN_PER_GUEST_INR: Record<EventType, Record<CityTier, number>> = {
  wedding: { metro: 2500, tier2: 1800, small_town: 1200 },
  birthday: { metro: 800, tier2: 600, small_town: 400 },
  community: { metro: 400, tier2: 300, small_town: 200 },
};

/** Approximate static conversion rates to INR (no live FX: the engine must stay offline). */
export const INR_PER_UNIT: Record<Currency, number> = {
  INR: 1,
  USD: 85,
  EUR: 92,
  GBP: 108,
};
