import type { AiIdeas, EventInput } from '@utsav/shared';
import { loadConfig, type AppConfig } from '../src/config.js';

/** The contracts.md §5 example, with a far-future date so it never expires. */
export const birthdayInput: EventInput = {
  eventType: 'birthday',
  title: 'Aarav turns 7',
  eventDate: '2099-12-20',
  city: 'Ludhiana',
  cityTier: 'tier2',
  guestCount: 40,
  budget: 60_000,
  currency: 'INR',
  vibe: 'space explorers',
  priorities: ['food', 'entertainment'],
  constraints: ['vegetarian', 'kid_friendly'],
  traditions: '',
  notes: 'Grandparents attending',
  language: 'en',
};

export const aiIdeas: AiIdeas = {
  summary: 'A cosmic adventure for Aarav and 40 young explorers.',
  themes: [
    { name: 'Mission to Mars', description: 'Rocket-launch entry arch and planet lanterns.' },
  ],
  decor: ['Glow-in-the-dark star ceiling'],
  food: ['Planet pizzas (veg)'],
  activities: ['Astronaut training obstacle course'],
  vendorQuestions: ['Is the cake eggless?'],
  personalTouches: ['Mission patches with each child’s name'],
};

/** Test config with a fake (non-secret) key; never used against the real API. */
export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    ...loadConfig({ NODE_ENV: 'test', GROQ_API_KEY: 'gsk_fake_test_key' }),
    aiTimeoutMs: 200,
    ...overrides,
  };
}

/** Rejects like the SDK does once the request's signal aborts. */
export function hangUntilAborted(_body: unknown, options: { signal: AbortSignal }) {
  return new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Request was aborted.')));
  });
}

/** A Groq chat completion carrying `content`. */
export function completion(content: string) {
  return { choices: [{ message: { content } }] };
}

/** An SDK-like HTTP error. */
export function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}
