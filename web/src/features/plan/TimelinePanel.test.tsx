import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { planResponse } from '../../mocks/fixtures';
import { relativeDays, TimelinePanel } from './TimelinePanel';
import { WarningsBanner } from './WarningsBanner';

afterEach(cleanup);

describe('relativeDays', () => {
  it('reads naturally on both sides of today', () => {
    expect(relativeDays(0)).toBe('today');
    expect(relativeDays(1)).toBe('tomorrow');
    expect(relativeDays(12)).toBe('in 12 days');
    expect(relativeDays(-1)).toBe('yesterday');
    expect(relativeDays(-3)).toBe('3 days ago');
  });
});

describe('TimelinePanel', () => {
  it('warns about a squeezed schedule and shows an empty state', () => {
    render(<TimelinePanel timeline={{ compressed: true, milestones: [] }} today="2026-10-31" />);
    expect(screen.getByText('Tight schedule:')).toBeTruthy();
    expect(screen.getByText('No milestones yet.')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('counts milestones relative to today, including overdue ones', () => {
    render(<TimelinePanel timeline={planResponse.plan.timeline} today="2026-12-12" />);
    expect(screen.queryByText('Tight schedule:')).toBeNull();
    const items = screen.getAllByRole('listitem');
    expect(items[0]?.textContent).toMatch(/Finalize guest list.*27 days ago/);
    expect(items[1]?.textContent).toMatch(/Order the cake.*2 days ago/);
  });
});

describe('WarningsBanner', () => {
  it('renders nothing when the engine has no warnings', () => {
    const { container } = render(<WarningsBanner warnings={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('labels every severity with text, not colour alone', () => {
    render(
      <WarningsBanner
        warnings={[
          { code: 'W_A', severity: 'critical', message: 'Budget too low.' },
          { code: 'W_B', severity: 'info', message: 'Book early.' },
        ]}
      />,
    );
    expect(screen.getByText('Important:')).toBeTruthy();
    expect(screen.getByText('Note:')).toBeTruthy();
  });
});
