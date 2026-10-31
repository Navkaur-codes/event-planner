import type { EventInput } from '../src/contracts.js';

/** Fixed "now" for every engine test: 2026-10-31, mid-day UTC. */
export const TODAY = new Date('2026-10-31T10:30:00.000Z');

/** A valid input (the contracts.md example); override any field per test. */
export function makeInput(overrides: Partial<EventInput> = {}): EventInput {
  return {
    eventType: 'birthday',
    title: 'Aarav turns 7',
    eventDate: '2026-12-20',
    city: 'Ludhiana',
    cityTier: 'tier2',
    guestCount: 40,
    budget: 60000,
    currency: 'INR',
    vibe: 'space explorers',
    priorities: ['food', 'entertainment'],
    constraints: ['vegetarian', 'kid_friendly'],
    traditions: '',
    notes: 'Grandparents attending',
    language: 'en',
    ...overrides,
  };
}
