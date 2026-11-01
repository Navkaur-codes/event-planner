import type {
  BudgetCategory,
  CityTier,
  Constraint,
  Currency,
  EventType,
  ItemPriority,
  Language,
  VendorType,
} from '@utsav/shared';

export const EVENT_LABELS: Record<EventType, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  community: 'Community event',
};

export const CITY_TIER_LABELS: Record<CityTier, string> = {
  metro: 'Metro city',
  tier2: 'Tier-2 city',
  small_town: 'Small town',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  INR: 'Indian rupee (₹)',
  USD: 'US dollar ($)',
  EUR: 'Euro (€)',
  GBP: 'British pound (£)',
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी)',
};

export const CATEGORY_LABELS: Record<BudgetCategory | 'planning', string> = {
  venue: 'Venue',
  food: 'Food & drinks',
  decor: 'Decor',
  photography: 'Photography',
  entertainment: 'Entertainment',
  attire: 'Attire',
  invitations: 'Invitations',
  gifts: 'Gifts & favours',
  logistics: 'Logistics',
  contingency: 'Contingency',
  planning: 'Planning',
};

export const CONSTRAINT_LABELS: Record<Constraint, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  jain: 'Jain food',
  halal: 'Halal',
  alcohol_free: 'Alcohol-free',
  eco_friendly: 'Eco-friendly',
  wheelchair_access: 'Wheelchair access',
  kid_friendly: 'Kid-friendly',
  elder_friendly: 'Elder-friendly',
  outdoor: 'Outdoor',
  indoor: 'Indoor',
};

export const VENDOR_LABELS: Record<VendorType, string> = {
  venue: 'Venue',
  caterer: 'Caterer',
  decorator: 'Decorator',
  photographer: 'Photographer',
  dj_music: 'DJ & music',
  makeup_attire: 'Makeup & attire',
  invitations_printer: 'Invitations printer',
  cake_baker: 'Cake baker',
  transport: 'Transport',
  priest_officiant: 'Priest / officiant',
  sound_lighting: 'Sound & lighting',
  permits_security: 'Permits & security',
  rentals: 'Rentals',
};

export const ITEM_PRIORITY_LABELS: Record<ItemPriority, string> = {
  must: 'Must do',
  should: 'Should do',
  nice: 'Nice to have',
};

// Intl formatters are costly to build and formatMoney runs per line, per render and per
// count-up frame, so each one is created once and reused.
const moneyFormats = new Map<Currency, Intl.NumberFormat>();
const longDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Formats whole currency units with the right symbol and grouping (e.g. ₹60,000). */
export function formatMoney(amount: number, currency: Currency): string {
  let format = moneyFormats.get(currency);
  if (!format) {
    format = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    moneyFormats.set(currency, format);
  }
  return format.format(amount);
}

/** Formats an ISO date as a friendly long date, e.g. "Sun, 20 Dec 2026". */
export function formatDate(iso: string): string {
  return longDate.format(new Date(`${iso}T00:00:00Z`));
}
