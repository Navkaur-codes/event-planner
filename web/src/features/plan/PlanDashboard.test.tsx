import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fallbackPlanResponse, planResponse } from '../../mocks/fixtures';
import { pinToday } from '../../test/helpers';
import PlanDashboard from './PlanDashboard';

function renderDashboard(response = planResponse, celebrated = false) {
  const handlers = {
    onCelebrated: vi.fn(),
    onToggleItem: vi.fn(),
    onEdit: vi.fn(),
    onNewEvent: vi.fn(),
  };
  const utils = render(<PlanDashboard response={response} celebrated={celebrated} {...handlers} />);
  return { ...utils, ...handlers };
}

beforeEach(pinToday);
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PlanDashboard', () => {
  it('shows the countdown, budget table, ordered timeline and checklist progress', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { level: 1, name: 'Aarav turns 7' })).toBeTruthy();
    expect(screen.getByText('50 days to go')).toBeTruthy();

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows[1]?.textContent).toMatch(/Food & drinks.*30%.*₹18,000/);
    expect(within(table).getByText('₹60,000')).toBeTruthy();

    const timeline = screen.getByRole('region', { name: 'Timeline' });
    const milestones = within(timeline).getAllByRole('listitem');
    expect(milestones[0]?.textContent).toMatch(/Finalize guest list.*in 15 days/);
    expect(screen.getByText('0 of 3 done · 0%')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Venue' })).toBeTruthy();
  });

  it('reports ticks and plays the first-plan celebration once', () => {
    const { onToggleItem, onCelebrated } = renderDashboard();
    fireEvent.click(screen.getByRole('checkbox', { name: /Order eggless themed cake/ }));
    expect(onToggleItem).toHaveBeenCalledWith('c-cake');
    expect(onCelebrated).toHaveBeenCalledOnce();
  });

  it('does not celebrate again for a plan that was already revealed', () => {
    const { onCelebrated } = renderDashboard(planResponse, true);
    expect(onCelebrated).not.toHaveBeenCalled();
  });

  it('labels warnings with text, not colour alone, and flags fallback ideas', () => {
    renderDashboard(fallbackPlanResponse);
    expect(screen.getByText('Heads up:')).toBeTruthy();
    expect(screen.getByText('Starter ideas:')).toBeTruthy();
  });

  it('has no axe violations', async () => {
    const { container } = renderDashboard(fallbackPlanResponse);
    expect((await axe(container)).violations).toEqual([]);
  });
});
