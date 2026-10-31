import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fallbackPlanResponse, planResponse } from '../../mocks/fixtures';
import { celebrate } from '../../motion';
import type { Actuals } from '../../state/storage';
import { pinToday } from '../../test/helpers';
import PlanDashboard from './PlanDashboard';

vi.mock('../../motion', () => ({
  revealPlan: vi.fn(() => () => undefined),
  celebrate: vi.fn(() => () => undefined),
  countUp: vi.fn(() => () => undefined),
}));

function renderDashboard(response = planResponse, celebrated = false, actuals: Actuals = {}) {
  const handlers = {
    onCelebrated: vi.fn(),
    onToggleItem: vi.fn(),
    onRefined: vi.fn(),
    onActualChange: vi.fn(),
    onImported: vi.fn(),
    onEdit: vi.fn(),
    onNewEvent: vi.fn(),
  };
  const props = { response, celebrated, actuals, lastRefine: null, ...handlers };
  const utils = render(<PlanDashboard {...props} />);
  return { ...utils, ...handlers, props };
}

function withAllTicked(done: boolean) {
  return {
    ...planResponse,
    plan: {
      ...planResponse.plan,
      checklist: planResponse.plan.checklist.map((item) => ({ ...item, done })),
    },
  };
}

beforeEach(pinToday);
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('PlanDashboard', () => {
  it('shows the countdown, budget table, ordered timeline and checklist progress', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { level: 1, name: 'Aarav turns 7' })).toBeTruthy();
    expect(screen.getByText('50 days to go')).toBeTruthy();

    const table = screen.getByRole('table', { name: /Budget by category/ });
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

  it('flags over-budget lines with an icon and words, and reports valid amounts', () => {
    const { onActualChange } = renderDashboard(planResponse, true, { venue: 16000, food: 10000 });
    const tracker = screen.getByRole('table', { name: /Planned and actual spend/ });
    expect(within(tracker).getByText('Over by ₹1,000')).toBeTruthy();
    expect(within(tracker).getByText('₹8,000 left')).toBeTruthy();
    expect(within(tracker).getByText('₹26,000')).toBeTruthy();

    const decor = screen.getByLabelText('Actual spend on Decor');
    fireEvent.change(decor, { target: { value: '9500' } });
    expect(onActualChange).toHaveBeenCalledWith('decor', 9500);
    fireEvent.change(decor, { target: { value: '' } });
    expect(onActualChange).toHaveBeenLastCalledWith('decor', null);
  });

  it('throws confetti when the last checklist item is ticked, not for a finished plan', () => {
    const { rerender, props } = renderDashboard(withAllTicked(false), true);
    expect(celebrate).not.toHaveBeenCalled();
    rerender(<PlanDashboard {...props} response={withAllTicked(true)} />);
    expect(celebrate).toHaveBeenCalledOnce();
    expect(screen.getByText(/everything’s ticked/)).toBeTruthy();

    cleanup();
    vi.mocked(celebrate).mockClear();
    renderDashboard(withAllTicked(true), true);
    expect(celebrate).not.toHaveBeenCalled();
  });

  it('downloads the plan with the tracker as a re-importable JSON file', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:plan');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderDashboard(planResponse, true, { food: 20000 });

    fireEvent.click(screen.getByRole('button', { name: 'Download plan (JSON)' }));
    expect(click).toHaveBeenCalledOnce();
    const [blob] = createObjectURL.mock.calls[0] ?? [new Blob()];
    expect(JSON.parse(await blob.text())).toEqual({
      version: 2,
      response: planResponse,
      celebrated: true,
      actuals: { food: 20000 },
    });
    vi.unstubAllGlobals();
  });

  it('has no axe violations with refine, tracker errors and tools on screen', async () => {
    const { container } = renderDashboard(planResponse, true, { venue: 16000 });
    fireEvent.change(screen.getByLabelText('Actual spend on Decor'), { target: { value: '-4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update plan' }));
    expect(screen.getByText(/Write what you’d like to change/)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
