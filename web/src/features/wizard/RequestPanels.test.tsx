import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlannerError } from '../../api/client';
import { ErrorPanel, LoadingPanel } from './RequestPanels';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LoadingPanel', () => {
  it('focuses its heading, rotates the status politely and cancels', async () => {
    vi.useFakeTimers();
    const onCancel = vi.fn();
    const { container } = render(<LoadingPanel eventNoun="birthday" onCancel={onCancel} />);
    const heading = screen.getByRole('heading', { name: 'Planning your birthday…' });
    expect(document.activeElement).toBe(heading);
    const status = screen.getByRole('status');
    const first = status.textContent;
    act(() => vi.advanceTimersByTime(2800));
    expect(status.textContent).not.toBe(first);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    vi.useRealTimers();
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('ErrorPanel', () => {
  const error = new PlannerError('A few details need another look.', 'VALIDATION', [
    { path: 'guestCount', message: 'Enter a whole number of guests.' },
  ]);

  it('shows the friendly message and issues, focuses retry and wires both buttons', async () => {
    const onRetry = vi.fn();
    const onEdit = vi.fn();
    const { container } = render(<ErrorPanel error={error} onRetry={onRetry} onEdit={onEdit} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('A few details need another look.');
    expect(alert.textContent).toContain('Enter a whole number of guests.');
    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(document.activeElement).toBe(retry);
    fireEvent.click(retry);
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
    expect((await axe(container)).violations).toEqual([]);
  });

  it('omits the issue list when there are no issues', () => {
    render(
      <ErrorPanel
        error={new PlannerError('Please try again.', 'INTERNAL')}
        onRetry={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.queryByRole('list')).toBeNull();
  });
});
