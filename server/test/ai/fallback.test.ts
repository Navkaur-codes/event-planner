import {
  AiIdeasSchema,
  ConstraintSchema,
  EventTypeSchema,
  LanguageSchema,
  type Constraint,
  type EventInput,
} from '@utsav/shared';
import { describe, expect, it } from 'vitest';
import { fallbackIdeas } from '../../src/ai/fallback.js';
import { birthdayInput } from '../fixtures.js';

const VIBES = [
  '',
  'royal Rajasthani',
  'boho garden',
  'retro 90s',
  'space explorers',
  'beach',
  'modern minimal',
  'something else',
];

/** Every subset of the 11 constraints (2,048 combinations). */
function allConstraintSets(): Constraint[][] {
  const options = ConstraintSchema.options;
  return Array.from({ length: 2 ** options.length }, (_, mask) =>
    options.filter((_option, bit) => mask & (1 << bit)),
  );
}

const longest: EventInput = {
  ...birthdayInput,
  title: 'T'.repeat(80),
  city: 'C'.repeat(60),
  guestCount: 5000,
  vibe: `garden ${'v'.repeat(190)}`,
};

const foodFor = (constraints: Constraint[]) =>
  fallbackIdeas({ ...birthdayInput, vibe: '', constraints }).food.join(' | ');

describe('fallbackIdeas', () => {
  it('is schema-valid for every language × event type × constraint combination', () => {
    for (const language of LanguageSchema.options) {
      for (const eventType of EventTypeSchema.options) {
        for (const constraints of allConstraintSets()) {
          const ideas = fallbackIdeas({ ...longest, language, eventType, constraints });
          expect(AiIdeasSchema.safeParse(ideas).success).toBe(true);
        }
      }
    }
  });

  it('is schema-valid for every language × event type × vibe', () => {
    for (const language of LanguageSchema.options) {
      for (const eventType of EventTypeSchema.options) {
        for (const vibe of VIBES) {
          const ideas = fallbackIdeas({ ...birthdayInput, language, eventType, vibe });
          expect(AiIdeasSchema.safeParse(ideas).success).toBe(true);
        }
      }
    }
  });

  it('is deterministic', () => {
    expect(fallbackIdeas(birthdayInput)).toEqual(fallbackIdeas(birthdayInput));
  });

  it('varies themes by vibe keywords and event type', () => {
    const names = (input: Partial<EventInput>) =>
      fallbackIdeas({ ...birthdayInput, ...input }).themes.map((t) => t.name);
    expect(names({ vibe: 'space explorers' })).toContain('Mission to Mars');
    expect(names({ vibe: 'Royal palace' })).toContain('Rajwada Nights');
    expect(names({ vibe: '', eventType: 'wedding' })).toContain('Marigold Mela');
    expect(names({ vibe: '', eventType: 'community' })).toContain('Neighbourhood Mela');
  });

  it('respects dietary constraints', () => {
    const meat = /chicken|mutton|fish|prawn|meat|\begg\b/i;
    expect(foodFor(['vegetarian'])).not.toMatch(meat);
    expect(foodFor(['vegan'])).not.toMatch(
      /paneer|ghee|dahi|curd|kulfi|cheese|butter|honey|lassi/i,
    );
    expect(foodFor(['vegan'])).not.toMatch(meat);
    const jainSafe = (food: string) =>
      food.replace(/without onion,? (garlic )?or (garlic|dairy)/gi, '');
    for (const diet of [['jain'], ['jain', 'vegan']] satisfies Constraint[][]) {
      expect(jainSafe(foodFor(diet))).not.toMatch(/onion|garlic|potato|carrot|beetroot|\begg\b/i);
    }
    expect(foodFor(['jain', 'halal'])).not.toMatch(meat);
    expect(foodFor(['halal'])).toMatch(/halal/i);
    expect(foodFor(['halal'])).not.toMatch(/pork|wine|beer/i);
  });

  it('adds constraint-specific ideas', () => {
    const ideas = fallbackIdeas({
      ...birthdayInput,
      vibe: 'space',
      constraints: ['eco_friendly', 'wheelchair_access', 'alcohol_free'],
    });
    expect(ideas.decor.join(' ')).not.toMatch(/balloon/i);
    expect(ideas.decor.join(' ')).toMatch(/wheelchair/i);
    expect(ideas.food.join(' ')).toMatch(/alcohol-free/i);
    expect(ideas.vendorQuestions.join(' ')).toMatch(/ramps/i);
    expect(ideas.summary).toMatch(/eco-friendly, wheelchair access, alcohol-free/);
  });
});

describe('fallbackIdeas in Hindi', () => {
  const hindi: EventInput = { ...birthdayInput, language: 'hi' };
  const devanagari = /[ऀ-ॿ]/;
  const allText = (input: EventInput) => {
    const ideas = fallbackIdeas(input);
    return [
      ideas.summary,
      ...ideas.themes.flatMap((t) => [t.name, t.description]),
      ...ideas.decor,
      ...ideas.food,
      ...ideas.activities,
      ...ideas.vendorQuestions,
      ...ideas.personalTouches,
    ];
  };

  it('writes every idea in Devanagari, keeping the host’s own title and city', () => {
    const ideas = fallbackIdeas({ ...hindi, constraints: ConstraintSchema.options.slice() });
    for (const text of allText({ ...hindi, constraints: ConstraintSchema.options.slice() })) {
      expect(text).toMatch(devanagari);
    }
    expect(ideas.summary).toContain(birthdayInput.title);
    expect(ideas.summary).toContain(birthdayInput.city);
    expect(ideas.summary).toContain('शाकाहारी');
  });

  it('matches Hindi vibe keywords', () => {
    expect(fallbackIdeas({ ...hindi, vibe: 'शाही राजस्थानी' }).themes[0]?.name).toBe(
      'रजवाड़ा रातें',
    );
    expect(fallbackIdeas({ ...hindi, vibe: 'अंतरिक्ष यात्री' }).themes[0]?.name).toBe('मिशन मंगल');
  });

  it('mirrors the English structure item for item', () => {
    for (const eventType of EventTypeSchema.options) {
      for (const constraints of [[], ['jain', 'eco_friendly', 'kid_friendly']] as Constraint[][]) {
        const english = fallbackIdeas({ ...birthdayInput, eventType, constraints });
        const hindiIdeas = fallbackIdeas({ ...hindi, eventType, constraints });
        for (const key of ['decor', 'food', 'activities', 'vendorQuestions'] as const) {
          expect(hindiIdeas[key]).toHaveLength(english[key].length);
        }
      }
    }
  });

  it('respects diets and eco rules in Hindi too', () => {
    const food = (constraints: Constraint[]) =>
      fallbackIdeas({ ...hindi, vibe: '', constraints }).food.join(' | ');
    const meat = /चिकन|मटन|मछली|अंडा|अंडे(?! और शहद से मुक्त)/;
    expect(food(['vegetarian'])).not.toMatch(meat);
    expect(food(['vegan'])).not.toMatch(/पनीर|घी|दही|कुल्फ़ी|मक्खन|शहद/);
    const jainSafe = food(['jain']).replace(/बिना प्याज़-लहसुन/g, '');
    expect(jainSafe).not.toMatch(/प्याज़|लहसुन|आलू|गाजर/);
    expect(food(['halal'])).toMatch(/हलाल/);
    const decor = fallbackIdeas({ ...hindi, vibe: 'अंतरिक्ष', constraints: ['eco_friendly'] });
    expect(decor.decor.join(' ')).not.toMatch(/गुब्बार/);
  });
});
