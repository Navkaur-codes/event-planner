/** English fallback content (data only; the logic lives in ../fallback.ts). */
import type { ConstraintTexts, FallbackContent } from './types.js';

const vibes: FallbackContent['vibes'] = {
  royal: {
    label: 'royal',
    themes: [
      {
        name: 'Rajwada Nights',
        description: 'Jewel-toned drapes, brass lanterns and a grand entrance with dhol players.',
      },
      {
        name: 'Haveli Courtyard',
        description: 'Floor seating, jharokha-style frames and marigold canopies.',
      },
    ],
    decor: [
      'Brass urlis filled with floating flowers',
      'Jewel-tone drapes in ruby, emerald and gold',
      'Carved jharokha photo frames',
      'Marigold and rose torans at every doorway',
    ],
  },
  garden: {
    label: 'garden',
    themes: [
      {
        name: 'Secret Garden',
        description: 'Lush greenery, wildflower arrangements and soft fairy lights.',
      },
      {
        name: 'Boho Bloom',
        description: 'Pampas, macrame and low floor cushions in earthy tones.',
      },
    ],
    decor: [
      'Wildflower jars down the centre of every table',
      'Hanging greenery with warm fairy lights',
      'Macrame backdrops for the photo corner',
      'Potted herbs as table markers',
    ],
  },
  retro: {
    label: 'retro',
    themes: [
      {
        name: 'Bollywood Retro',
        description:
          'Hand-painted film posters, vinyl records and a dance floor with classic hits.',
      },
      {
        name: 'Disco Mela',
        description: 'Mirror-ball sparkle meets mela colours and cassette-tape signage.',
      },
    ],
    decor: [
      'Hand-painted retro film posters',
      'Vinyl records as table numbers',
      'A mirror ball over the dance floor',
      'Cassette-tape and polaroid photo wall',
    ],
  },
  cosmic: {
    label: 'cosmic',
    themes: [
      {
        name: 'Mission to Mars',
        description:
          'A rocket-launch entry arch, planet lanterns and a mission-control photo booth.',
      },
      {
        name: 'Starry Night',
        description: 'Deep blue drapes, twinkling star lights and moon-shaped centrepieces.',
      },
    ],
    decor: [
      'Glow-in-the-dark star ceiling',
      'Paper planet lanterns of every size',
      'A cardboard rocket entry arch',
      'Balloon planets floating over the tables',
    ],
  },
  beach: {
    label: 'beach',
    themes: [
      {
        name: 'Konkan Coast',
        description: 'Coconut fronds, seashell accents and turquoise table runners.',
      },
      {
        name: 'Tropical Sunset',
        description: 'Coral and mango tones, tiki torches and palm-leaf backdrops.',
      },
    ],
    decor: [
      'Palm-leaf and coconut-frond backdrops',
      'Seashell and driftwood centrepieces',
      'Turquoise table runners',
      'Woven baskets with tropical blooms',
    ],
  },
  modern: {
    label: 'modern',
    themes: [
      {
        name: 'Modern Elegance',
        description: 'Ivory and gold palette, clean lines and single-stem floral accents.',
      },
      {
        name: 'Monsoon Minimal',
        description: 'Soft greys, white orchids and candlelit glass vases.',
      },
    ],
    decor: [
      'Single-stem orchids in clear glass vases',
      'Ivory linens with gold cutlery accents',
      'Geometric metal frames as backdrops',
      'Warm candle clusters on every table',
    ],
  },
};

const types: FallbackContent['types'] = {
  wedding: {
    label: 'wedding',
    pack: {
      themes: [
        {
          name: 'Marigold Mela',
          description: 'Bright marigold strings, rani-pink drapes and a joyful mela feel.',
        },
        {
          name: 'Twilight Phere',
          description: 'Soft lighting, rose petals and a glowing mandap for the main ceremony.',
        },
      ],
      decor: [
        'Marigold and mogra garlands across the entrance',
        'A floral mandap with soft uplighting',
        'Rangoli at the welcome area',
        'Fairy-light canopies over the dining space',
      ],
    },
    activities: [
      'A sangeet night with family dance performances',
      'A mehendi afternoon with folk music',
      'Fun games during the joota chupai ritual',
      'A couple story slideshow during dinner',
    ],
    vendorQuestions: [
      'How many events like ours have you handled this season?',
      'What is included in the package and what costs extra?',
      'Who is our single point of contact on the day?',
    ],
    personalTouches: [
      'A welcome board with the couple’s story',
      'Handwritten notes for the closest family',
      'Wedding favours from the couple’s hometowns',
    ],
  },
  birthday: {
    label: 'birthday',
    pack: {
      themes: [
        {
          name: 'Confetti Carnival',
          description: 'Bright bunting, game stalls and a candy-coloured cake table.',
        },
        {
          name: 'Memory Lane',
          description: 'Photos from every year of the birthday star’s life, with a party twist.',
        },
      ],
      decor: [
        'Paper bunting in the guest of honour’s favourite colours',
        'A photo timeline wall of past birthdays',
        'A themed cake table with a hand-lettered sign',
        'Paper fans and tassels behind the seating',
      ],
    },
    activities: [
      'A treasure hunt with themed clues',
      'A guess-the-baby-photo game',
      'A short toast round from close friends',
      'A dance-off with a favourite playlist',
    ],
    vendorQuestions: [
      'Can the cake be customised to our theme?',
      'How long before the party will setup start?',
      'What is included in the package and what costs extra?',
    ],
    personalTouches: [
      'A memory jar where guests drop notes',
      'Return gifts matched to the theme',
      'A playlist of the birthday star’s favourite songs',
    ],
  },
  community: {
    label: 'community event',
    pack: {
      themes: [
        {
          name: 'Neighbourhood Mela',
          description: 'Food stalls, folk music and local talent on an open stage.',
        },
        {
          name: 'Together We Celebrate',
          description: 'Shared tables, community art and stories from residents.',
        },
      ],
      decor: [
        'Hand-made bunting from local volunteers',
        'A community art wall guests can paint on',
        'Clear signage for stalls, first aid and exits',
        'Lanterns along the main walkway',
      ],
    },
    activities: [
      'An open-mic stage for local talent',
      'A community art or rangoli competition',
      'Folk dance sessions anyone can join',
      'A volunteer thank-you moment on stage',
    ],
    vendorQuestions: [
      'Do we need any local permits, and can you help get them?',
      'What crowd management and first-aid support do you offer?',
      'What is included in the package and what costs extra?',
    ],
    personalTouches: [
      'A thank-you wall naming every volunteer',
      'Group photos printed on the spot',
      'Seeds or saplings as take-home gifts',
    ],
  },
};

const menus: FallbackContent['menus'] = {
  veganJain: [
    'Jain-style chana masala cooked without onion, garlic or dairy',
    'Raw banana and capsicum dry sabzi',
    'Fresh fruit chaat with chaat masala',
    'Coconut-milk rice kheer made Jain-style',
    'Kokum and fresh lime coolers',
  ],
  vegan: [
    'Coconut-milk vegetable stew with appams',
    'Chana masala with jeera rice',
    'Fresh fruit chaat counter',
    'Roasted vegetable skewers with mint chutney',
    'Dairy-free sorbet in seasonal flavours',
  ],
  jain: [
    'Jain paneer tikka made without onion or garlic',
    'Raw banana kofta in a tomato gravy',
    'Live dhokla and khandvi counter',
    'Moong dal halwa for dessert',
    'Kokum and fresh lime coolers',
  ],
  vegetarian: [
    'Paneer tikka and hara bhara kebab starters',
    'Live chaat counter with pani puri and dahi bhalla',
    'Dal makhani, veg biryani and fresh rotis',
    'Seasonal fruit and kulfi station',
    'Masala chai and fresh lime soda bar',
  ],
  halal: [
    'Halal-certified chicken tikka and seekh kebabs',
    'Mutton biryani from a halal-certified kitchen',
    'Paneer and vegetable dishes for vegetarian guests',
    'Phirni and seasonal fruit desserts',
    'Rose sherbet and fresh lime coolers',
  ],
  standard: [
    'Starter platters with veg and non-veg options clearly labelled',
    'A live chaat counter',
    'A regional main-course buffet',
    'A dessert table with seasonal sweets',
    'A chai and mocktail bar',
  ],
};

const foodAdditions: ConstraintTexts = {
  alcohol_free: 'An alcohol-free bar with signature mocktails named after the hosts',
  kid_friendly: 'Kid-sized portions with mild spice levels',
  elder_friendly: 'Soft, low-spice and low-sugar dishes labelled for elders',
  eco_friendly: 'Areca-palm plates and steel tumblers instead of plastic',
};

const decorAdditions: ConstraintTexts = {
  eco_friendly: 'Potted plants and fresh flowers guests can take home, instead of single-use decor',
  wheelchair_access: 'Aisles kept clear for wheelchairs, with ramps at the entrance and stage',
  outdoor: 'Weather-ready canopies and lanterns for the outdoor setting',
  indoor: 'Warm uplighting and fabric drapes to soften the indoor hall',
};

const activityAdditions: ConstraintTexts = {
  kid_friendly: 'A supervised kids’ corner with craft and colouring stations',
  elder_friendly: 'Comfortable front-row seating so elders enjoy every moment',
  wheelchair_access: 'Step-free activity areas so everyone can join in',
  outdoor: 'Lawn games like ring toss and giant Jenga',
};

const questionAdditions: ConstraintTexts = {
  jain: 'Can you cook a fully Jain menu with separate utensils?',
  vegan: 'Are all dishes free of dairy, eggs and honey?',
  vegetarian: 'Is the kitchen fully vegetarian, including an eggless cake?',
  halal: 'Can you show halal certification for every meat dish?',
  wheelchair_access:
    'Does the venue have ramps, an accessible washroom and step-free stage access?',
  eco_friendly: 'Can you avoid single-use plastic and share a waste-segregation plan?',
  alcohol_free: 'Can you run a fully alcohol-free bar with a mocktail menu?',
};

const touchAdditions: ConstraintTexts = {
  elder_friendly: 'A blessings corner where elders can greet every guest',
  kid_friendly: 'Name badges for kids with a small surprise inside',
};

/** All English fallback content. */
export const en: FallbackContent = {
  vibes,
  types,
  menus,
  foodAdditions,
  decorAdditions,
  activityAdditions,
  questionAdditions,
  touchAdditions,
  constraintLabels: {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    jain: 'Jain',
    halal: 'halal',
    alcohol_free: 'alcohol-free',
    eco_friendly: 'eco-friendly',
    wheelchair_access: 'wheelchair access',
    kid_friendly: 'kid-friendly',
    elder_friendly: 'elder-friendly',
    outdoor: 'outdoor',
    indoor: 'indoor',
  },
  summary: ({ title, city, guestCount, typeLabel, vibeLabel, needs }) => {
    const style = vibeLabel ? `${vibeLabel}-inspired ` : '';
    const needsSentence =
      needs.length > 0 ? ` Every idea below keeps to your needs: ${needs.join(', ')}.` : '';
    return (
      `${title}: a joyful ${style}${typeLabel} for ${guestCount} guests in ${city}.` +
      needsSentence +
      ' These ready-made ideas pair with your exact budget, timeline and checklist.'
    );
  },
};
