/**
 * Deterministic ideas used whenever the AI is unavailable: themes by vibe, menus by
 * diet and additions per constraint, in the host's language. Always schema-valid.
 * The words themselves live in ./fallbackContent (one file per language).
 */
import type { AiIdeas, Constraint, EventInput, Language } from '@utsav/shared';
import { en } from './fallbackContent/en.js';
import { hi } from './fallbackContent/hi.js';
import type { ConstraintTexts, FallbackContent, MenuId, VibeId } from './fallbackContent/types.js';

const CONTENT: Record<Language, FallbackContent> = { en, hi };

// Keywords in English and Hindi, since hosts type their vibe in either.
const VIBE_MATCHERS: readonly [VibeId, RegExp][] = [
  ['royal', /royal|palace|rajasthan|maharaja|regal|heritage|haveli|शाही|राजसी|महल|राजस्थान|हवेली/i],
  ['garden', /garden|floral|boho|nature|spring|botanical|flower|बगीच|बाग़|बाग|फूल|बोहो/i],
  ['retro', /retro|90s|80s|70s|vintage|bollywood|disco|रेट्रो|बॉलीवुड|डिस्को|पुराने ज़माने/i],
  ['cosmic', /space|galaxy|star|astronaut|cosmic|planet|rocket|अंतरिक्ष|तारे|ग्रह|रॉकेट/i],
  ['beach', /beach|tropical|sea|ocean|goa|island|समुद्र|बीच|गोवा/i],
  ['modern', /minimal|modern|elegant|chic|classy|contemporary|आधुनिक|सादगी|मिनिमल/i],
];

const NOT_ECO = /balloon|plastic|glitter|गुब्बार|प्लास्टिक|ग्लिटर/i;
const MAX = { list: 6, touches: 4, additions: 3 } as const;

/** Deterministic, schema-valid ideas varied by language, event type, vibe and constraints. */
export function fallbackIdeas(input: EventInput): AiIdeas {
  const content = CONTENT[input.language];
  const has = (constraint: Constraint) => input.constraints.includes(constraint);
  const profile = content.types[input.eventType];
  const vibeId = VIBE_MATCHERS.find(([, pattern]) => pattern.test(input.vibe))?.[0];
  const vibe = vibeId ? content.vibes[vibeId] : undefined;
  const pack = vibe ?? profile.pack;
  const ecoSafe = (items: readonly string[]) =>
    has('eco_friendly') ? items.filter((item) => !NOT_ECO.test(item)) : items;
  const additions = (table: ConstraintTexts) => additionsFor(input.constraints, table);

  return {
    summary: content.summary({
      title: input.title,
      city: input.city,
      guestCount: input.guestCount,
      typeLabel: profile.label,
      vibeLabel: vibe?.label,
      needs: input.constraints.map((c) => content.constraintLabels[c]),
    }),
    themes: pack.themes,
    decor: withAdditions(ecoSafe(pack.decor), additions(content.decorAdditions), MAX.list),
    food: withAdditions(content.menus[menuFor(has)], additions(content.foodAdditions), MAX.list),
    activities: withAdditions(profile.activities, additions(content.activityAdditions), MAX.list),
    vendorQuestions: withAdditions(
      profile.vendorQuestions,
      additions(content.questionAdditions),
      MAX.list,
    ),
    personalTouches: withAdditions(
      profile.personalTouches,
      additions(content.touchAdditions),
      MAX.touches,
    ),
  };
}

/** The strictest diet wins: a vegan Jain menu satisfies vegan, Jain and vegetarian. */
function menuFor(has: (constraint: Constraint) => boolean): MenuId {
  if (has('vegan') && has('jain')) return 'veganJain';
  if (has('vegan')) return 'vegan';
  if (has('jain')) return 'jain';
  if (has('vegetarian')) return 'vegetarian';
  if (has('halal')) return 'halal';
  return 'standard';
}

function additionsFor(constraints: readonly Constraint[], table: ConstraintTexts): string[] {
  return constraints.flatMap((constraint) => table[constraint] ?? []).slice(0, MAX.additions);
}

/** Constraint-specific items always survive; base items fill the remaining slots. */
function withAdditions(base: readonly string[], additions: string[], max: number): string[] {
  return [...base.slice(0, max - additions.length), ...additions];
}
