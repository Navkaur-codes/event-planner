import type { Currency, EventInput, Severity, Warning } from '../contracts.js';
import {
  INR_PER_UNIT,
  MIN_PER_GUEST_INR,
  PERMIT_WARNING_GUESTS,
  SHORT_NOTICE_DAYS,
} from './rules/thresholds.js';

/** Facts about a plan that warning rules inspect. */
export interface WarningContext {
  input: EventInput;
  daysLeft: number;
  compressed: boolean;
}

interface WarningRule {
  code: string;
  evaluate: (ctx: WarningContext) => { severity: Severity; message: string } | null;
}

const TIER_LABEL = { metro: 'metro', tier2: 'tier-2 city', small_town: 'small-town' } as const;

/** Ordered warning rules; each returns null when it does not apply. */
export const WARNING_RULES: WarningRule[] = [
  {
    code: 'short-notice',
    evaluate: ({ daysLeft }) =>
      daysLeft < SHORT_NOTICE_DAYS
        ? {
            severity: 'critical',
            message: `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go: the timeline is compressed, so book key vendors today.`,
          }
        : null,
  },
  {
    code: 'compressed-timeline',
    evaluate: ({ daysLeft, compressed }) =>
      compressed && daysLeft >= SHORT_NOTICE_DAYS
        ? {
            severity: 'warn',
            message: `Less lead time than usual (${daysLeft} days): milestones have been brought closer together.`,
          }
        : null,
  },
  {
    code: 'low-per-guest',
    evaluate: ({ input }) => {
      const rate = INR_PER_UNIT[input.currency];
      const perGuestInr = (input.budget * rate) / input.guestCount;
      const minimumInr = MIN_PER_GUEST_INR[input.eventType][input.cityTier];
      if (perGuestInr >= minimumInr) return null;
      const perGuest = formatMoney(input.budget / input.guestCount, input.currency);
      const minimum = formatMoney(Math.ceil(minimumInr / rate), input.currency);
      return {
        severity: perGuestInr < minimumInr / 2 ? 'critical' : 'warn',
        message: `About ${perGuest} per guest is below the usual ${minimum} for a ${TIER_LABEL[input.cityTier]} ${input.eventType}. Consider fewer guests or a bigger budget.`,
      };
    },
  },
  {
    code: 'permits-large-crowd',
    evaluate: ({ input }) =>
      input.eventType === 'community' && input.guestCount > PERMIT_WARNING_GUESTS
        ? {
            severity: 'warn',
            message: `More than ${PERMIT_WARNING_GUESTS} people usually needs police and municipal permission; apply early.`,
          }
        : null,
  },
  {
    code: 'conflicting-venue',
    evaluate: ({ input }) =>
      input.constraints.includes('outdoor') && input.constraints.includes('indoor')
        ? {
            severity: 'warn',
            message:
              'Both indoor and outdoor are selected: pick one, or budget for a venue with both spaces.',
          }
        : null,
  },
];

/** Runs every warning rule against the plan context, in rule order. */
export function evaluateWarnings(ctx: WarningContext): Warning[] {
  return WARNING_RULES.flatMap((rule) => {
    const hit = rule.evaluate(ctx);
    return hit ? [{ code: rule.code, ...hit }] : [];
  });
}

const moneyFormats = new Map<Currency, Intl.NumberFormat>();

function formatMoney(amount: number, currency: Currency): string {
  let format = moneyFormats.get(currency);
  if (!format) {
    format = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    moneyFormats.set(currency, format);
  }
  return format.format(Math.round(amount));
}
