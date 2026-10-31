/**
 * Test fixtures from docs/contracts.md §5, completed so the budget lines sum exactly to the
 * total (the abridged example in the doc does not). Typed against the shared contracts.
 */
import type { EventInput, PlanResponse } from '@utsav/shared';

export const planRequest: EventInput = {
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
};

export const planResponse: PlanResponse = {
  plan: {
    input: planRequest,
    budget: {
      total: 60000,
      currency: 'INR',
      perGuest: 1500,
      lines: [
        {
          category: 'food',
          amount: 18000,
          percent: 30,
          note: 'Vegetarian kid-friendly menu for 40',
        },
        { category: 'entertainment', amount: 12000, percent: 20, note: 'Priority' },
        { category: 'venue', amount: 15000, percent: 25, note: 'Party hall for 40' },
        { category: 'decor', amount: 9000, percent: 15, note: 'Space theme' },
        { category: 'contingency', amount: 6000, percent: 10, note: 'Buffer for surprises' },
      ],
    },
    timeline: {
      compressed: false,
      milestones: [
        {
          id: 'm-guestlist',
          title: 'Finalize guest list',
          dueDate: '2026-11-15',
          daysBefore: 35,
          category: 'planning',
          done: false,
        },
        {
          id: 'm-cake',
          title: 'Order the cake',
          dueDate: '2026-12-10',
          daysBefore: 10,
          category: 'food',
          done: false,
        },
      ],
    },
    checklist: [
      {
        id: 'c-cake',
        vendor: 'cake_baker',
        task: 'Order eggless themed cake',
        priority: 'must',
        done: false,
      },
      {
        id: 'c-venue',
        vendor: 'venue',
        task: 'Book the party hall',
        priority: 'must',
        done: false,
      },
      {
        id: 'c-venue-2',
        vendor: 'venue',
        task: 'Check the play area is safe',
        priority: 'should',
        done: false,
      },
    ],
    warnings: [
      {
        code: 'W_KIDS_FOOD',
        severity: 'warn',
        message: 'Plan a separate snack table for younger guests.',
      },
    ],
    generatedAt: '2026-10-31T00:00:00.000Z',
  },
  ideas: {
    summary: 'A cosmic adventure for Aarav and 40 young explorers.',
    themes: [
      { name: 'Mission to Mars', description: 'Rocket-launch entry arch and a red-planet cake.' },
    ],
    decor: ['Glow-in-the-dark star ceiling'],
    food: ['Planet pizzas (veg)'],
    activities: ['Astronaut training obstacle course'],
    vendorQuestions: ['Is the cake eggless?'],
    personalTouches: ['Mission patches with each child’s name'],
  },
  aiStatus: 'ai',
};

/** Same plan as returned when the AI layer is unavailable. */
export const fallbackPlanResponse: PlanResponse = { ...planResponse, aiStatus: 'fallback' };
