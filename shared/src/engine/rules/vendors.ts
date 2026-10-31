/**
 * Vendor checklist rules as data: a base list per event type plus conditional rules that
 * fire on guest count, constraints or traditions. Ids are stable so saved progress survives.
 */
import type { EventInput, EventType, ItemPriority, VendorType } from '../../contracts.js';
import { dietaryLabels } from './labels.js';
import { LARGE_EVENT_GUESTS } from './thresholds.js';

/** One checklist item template. */
export interface ChecklistRule {
  id: string;
  vendor: VendorType;
  task: string | ((input: EventInput) => string);
  priority: ItemPriority;
}

/** A checklist item that is added only when `when` holds for the input. */
export interface ConditionalChecklistRule extends ChecklistRule {
  when: (input: EventInput) => boolean;
}

/** Vendors every event of a type needs. */
export const BASE_CHECKLIST: Record<EventType, ChecklistRule[]> = {
  wedding: [
    { id: 'c-venue', vendor: 'venue', task: 'Shortlist and book the venue', priority: 'must' },
    {
      id: 'c-caterer',
      vendor: 'caterer',
      task: (i) => `Book a caterer for ${i.guestCount} guests and schedule a tasting`,
      priority: 'must',
    },
    {
      id: 'c-decor',
      vendor: 'decorator',
      task: 'Book the decorator for mandap, stage and entry',
      priority: 'must',
    },
    {
      id: 'c-photo',
      vendor: 'photographer',
      task: 'Book photographer and videographer; agree deliverables',
      priority: 'must',
    },
    {
      id: 'c-attire',
      vendor: 'makeup_attire',
      task: 'Book makeup artist and plan outfit fittings',
      priority: 'should',
    },
    {
      id: 'c-music',
      vendor: 'dj_music',
      task: 'Book DJ or band for sangeet and reception',
      priority: 'should',
    },
    {
      id: 'c-invites',
      vendor: 'invitations_printer',
      task: 'Order printed or digital invitations',
      priority: 'should',
    },
    {
      id: 'c-sound',
      vendor: 'sound_lighting',
      task: 'Confirm sound and lighting with the venue',
      priority: 'nice',
    },
  ],
  birthday: [
    {
      id: 'c-venue',
      vendor: 'venue',
      task: 'Book the venue or prepare the home space',
      priority: 'must',
    },
    {
      id: 'c-caterer',
      vendor: 'caterer',
      task: (i) => `Arrange food for ${i.guestCount} guests`,
      priority: 'must',
    },
    { id: 'c-cake', vendor: 'cake_baker', task: 'Order the themed cake', priority: 'must' },
    {
      id: 'c-decor',
      vendor: 'decorator',
      task: 'Arrange theme decor and balloons',
      priority: 'should',
    },
    {
      id: 'c-music',
      vendor: 'dj_music',
      task: 'Book music, games host or entertainer',
      priority: 'should',
    },
    {
      id: 'c-photo',
      vendor: 'photographer',
      task: 'Line up a photographer or a family member with a camera',
      priority: 'nice',
    },
    {
      id: 'c-invites',
      vendor: 'invitations_printer',
      task: 'Send digital invitations',
      priority: 'nice',
    },
  ],
  community: [
    {
      id: 'c-venue',
      vendor: 'venue',
      task: 'Book the ground, hall or park space',
      priority: 'must',
    },
    {
      id: 'c-sound',
      vendor: 'sound_lighting',
      task: 'Book stage, sound system and lighting',
      priority: 'must',
    },
    {
      id: 'c-caterer',
      vendor: 'caterer',
      task: (i) => `Arrange food stalls or caterer for about ${i.guestCount} people`,
      priority: 'must',
    },
    {
      id: 'c-rentals',
      vendor: 'rentals',
      task: 'Rent chairs, tables, canopies and dustbins',
      priority: 'should',
    },
    {
      id: 'c-decor',
      vendor: 'decorator',
      task: 'Plan banners, signage and decor',
      priority: 'should',
    },
    {
      id: 'c-invites',
      vendor: 'invitations_printer',
      task: 'Print posters and share the event online',
      priority: 'should',
    },
    {
      id: 'c-photo',
      vendor: 'photographer',
      task: 'Ask a volunteer or photographer to cover the event',
      priority: 'nice',
    },
  ],
};

/** Items added when the event's context calls for them. */
export const CONDITIONAL_CHECKLIST: ConditionalChecklistRule[] = [
  {
    id: 'c-permits',
    vendor: 'permits_security',
    task: 'Get local permissions and arrange security / crowd control',
    priority: 'must',
    when: (i) => i.guestCount > LARGE_EVENT_GUESTS,
  },
  {
    id: 'c-transport',
    vendor: 'transport',
    task: 'Arrange guest transport and parking',
    priority: 'should',
    when: (i) => i.guestCount > LARGE_EVENT_GUESTS,
  },
  {
    id: 'c-diet',
    vendor: 'caterer',
    task: (i) => `Confirm the caterer can serve: ${dietaryLabels(i.constraints).join(', ')}`,
    priority: 'must',
    when: (i) => dietaryLabels(i.constraints).length > 0,
  },
  {
    id: 'c-accessible',
    vendor: 'venue',
    task: 'Check the venue has a ramp, step-free entry and an accessible washroom',
    priority: 'must',
    when: (i) => i.constraints.includes('wheelchair_access'),
  },
  {
    id: 'c-elders',
    vendor: 'venue',
    task: 'Reserve shaded seating near washrooms for elders',
    priority: 'should',
    when: (i) => i.constraints.includes('elder_friendly'),
  },
  {
    id: 'c-kids',
    vendor: 'venue',
    task: 'Set up a supervised, child-safe play corner',
    priority: 'should',
    when: (i) => i.constraints.includes('kid_friendly'),
  },
  {
    id: 'c-eco-decor',
    vendor: 'decorator',
    task: 'Ask for reusable or rented decor and no single-use plastic',
    priority: 'should',
    when: (i) => i.constraints.includes('eco_friendly'),
  },
  {
    id: 'c-eco-food',
    vendor: 'caterer',
    task: 'Request steel or compostable serveware instead of plastic',
    priority: 'should',
    when: (i) => i.constraints.includes('eco_friendly'),
  },
  {
    id: 'c-outdoor',
    vendor: 'rentals',
    task: 'Rent a canopy or tent and plan a rain / heat backup',
    priority: 'must',
    when: (i) => i.constraints.includes('outdoor'),
  },
  {
    id: 'c-officiant',
    vendor: 'priest_officiant',
    task: 'Book a priest or officiant for the ceremonies you described',
    priority: 'must',
    when: (i) => i.eventType === 'wedding' && i.traditions.trim().length > 0,
  },
];
