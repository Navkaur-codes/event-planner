/**
 * Timeline templates as data: each milestone is due `daysBefore` the event. Lists are ordered
 * from the longest lead time to the shortest; the first entry sets the ideal planning window.
 */
import type { BudgetCategory, EventType } from '../../contracts.js';

/** One milestone in a template. */
export interface MilestoneRule {
  id: string;
  title: string;
  daysBefore: number;
  category: BudgetCategory | 'planning';
}

/** Milestone templates per event type. */
export const MILESTONES: Record<EventType, MilestoneRule[]> = {
  wedding: [
    {
      id: 'm-budget',
      title: 'Agree budget and draft guest list',
      daysBefore: 180,
      category: 'planning',
    },
    { id: 'm-venue', title: 'Book the venue', daysBefore: 165, category: 'venue' },
    {
      id: 'm-photo',
      title: 'Book photographer and videographer',
      daysBefore: 150,
      category: 'photography',
    },
    {
      id: 'm-caterer',
      title: 'Shortlist caterers and book tastings',
      daysBefore: 120,
      category: 'food',
    },
    {
      id: 'm-attire',
      title: 'Order outfits and book makeup artist',
      daysBefore: 110,
      category: 'attire',
    },
    { id: 'm-decor', title: 'Finalise decorator and theme', daysBefore: 90, category: 'decor' },
    {
      id: 'm-music',
      title: 'Book DJ, band or performers',
      daysBefore: 75,
      category: 'entertainment',
    },
    { id: 'm-invites', title: 'Send invitations', daysBefore: 60, category: 'invitations' },
    {
      id: 'm-transport',
      title: 'Arrange guest transport and stay',
      daysBefore: 45,
      category: 'logistics',
    },
    { id: 'm-menu', title: 'Lock the menu after tasting', daysBefore: 30, category: 'food' },
    { id: 'm-gifts', title: 'Buy return gifts and favours', daysBefore: 21, category: 'gifts' },
    {
      id: 'm-headcount',
      title: 'Give final headcount to caterer',
      daysBefore: 10,
      category: 'food',
    },
    {
      id: 'm-confirm',
      title: 'Confirm every vendor and payment',
      daysBefore: 5,
      category: 'planning',
    },
    { id: 'm-runsheet', title: 'Share the day-of run sheet', daysBefore: 1, category: 'planning' },
  ],
  birthday: [
    {
      id: 'm-guestlist',
      title: 'Finalise guest list and theme',
      daysBefore: 30,
      category: 'planning',
    },
    { id: 'm-venue', title: 'Book the venue', daysBefore: 25, category: 'venue' },
    { id: 'm-invites', title: 'Send invitations', daysBefore: 21, category: 'invitations' },
    {
      id: 'm-entertainment',
      title: 'Book entertainer or activities',
      daysBefore: 18,
      category: 'entertainment',
    },
    { id: 'm-caterer', title: 'Choose menu and caterer', daysBefore: 14, category: 'food' },
    { id: 'm-decor', title: 'Order decorations', daysBefore: 10, category: 'decor' },
    { id: 'm-cake', title: 'Order the cake', daysBefore: 7, category: 'food' },
    { id: 'm-gifts', title: 'Pack return gifts', daysBefore: 3, category: 'gifts' },
    { id: 'm-confirm', title: 'Confirm RSVPs and vendors', daysBefore: 2, category: 'planning' },
  ],
  community: [
    {
      id: 'm-committee',
      title: 'Form organising team and set goals',
      daysBefore: 60,
      category: 'planning',
    },
    { id: 'm-venue', title: 'Book venue or ground', daysBefore: 50, category: 'venue' },
    {
      id: 'm-permits',
      title: 'Apply for local permissions',
      daysBefore: 45,
      category: 'logistics',
    },
    {
      id: 'm-sound',
      title: 'Book sound, stage and performers',
      daysBefore: 35,
      category: 'entertainment',
    },
    { id: 'm-caterer', title: 'Arrange food stalls or caterer', daysBefore: 30, category: 'food' },
    { id: 'm-promote', title: 'Publicise the event', daysBefore: 21, category: 'invitations' },
    {
      id: 'm-volunteers',
      title: 'Assign volunteers and roles',
      daysBefore: 14,
      category: 'logistics',
    },
    { id: 'm-decor', title: 'Plan decor and signage', daysBefore: 10, category: 'decor' },
    {
      id: 'm-confirm',
      title: 'Confirm vendors and safety plan',
      daysBefore: 3,
      category: 'planning',
    },
    {
      id: 'm-briefing',
      title: 'Brief volunteers on the day plan',
      daysBefore: 1,
      category: 'planning',
    },
  ],
};
