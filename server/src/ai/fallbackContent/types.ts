/** Shape of one language's fallback content; ../fallback.ts picks and combines it. */
import type { Constraint, EventType, ThemeIdea } from '@utsav/shared';

/** Vibe families recognised from the host's free-text vibe. */
export type VibeId = 'royal' | 'garden' | 'retro' | 'cosmic' | 'beach' | 'modern';

/** Menus by diet, most restrictive first (see menuFor in ../fallback.ts). */
export type MenuId = 'veganJain' | 'vegan' | 'jain' | 'vegetarian' | 'halal' | 'standard';

/** One extra idea per constraint, added on top of the base list. */
export type ConstraintTexts = Partial<Record<Constraint, string>>;

/** Themes plus matching decor, from a vibe or an event type's defaults. */
export interface ThemePack {
  themes: ThemeIdea[];
  decor: string[];
}

/** Base content for one event type. */
export interface TypeProfile {
  label: string;
  pack: ThemePack;
  activities: string[];
  vendorQuestions: string[];
  personalTouches: string[];
}

/** Values the summary sentence is built from; all already validated input. */
export interface SummaryParts {
  title: string;
  city: string;
  guestCount: number;
  typeLabel: string;
  vibeLabel: string | undefined;
  needs: string[];
}

/** Everything the deterministic fallback says, in one language. */
export interface FallbackContent {
  vibes: Record<VibeId, ThemePack & { label: string }>;
  types: Record<EventType, TypeProfile>;
  menus: Record<MenuId, readonly string[]>;
  foodAdditions: ConstraintTexts;
  decorAdditions: ConstraintTexts;
  activityAdditions: ConstraintTexts;
  questionAdditions: ConstraintTexts;
  touchAdditions: ConstraintTexts;
  constraintLabels: Record<Constraint, string>;
  summary(parts: SummaryParts): string;
}
