import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { planRequest } from '../../mocks/fixtures';
import { jsonResponse, pinToday } from '../../test/helpers';
import { RefineBox } from './RefineBox';

function renderBox(explanation: string | null = null) {
  const onRefined = vi.fn();
  const utils = render(
    <RefineBox input={planRequest} explanation={explanation} onRefined={onRefined} />,
  );
  return { ...utils, onRefined };
}

const EMPTY_HINT = /Write what you.d like to change/;

beforeEach(() => pinToday());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RefineBox', () => {
  it('rejects an empty message inline without calling the API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderBox();
    const input = screen.getByLabelText('What should change?');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update plan' }));
    expect(screen.getByText(EMPTY_HINT)).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('refine-count refine-error');
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'More flowers' } });
    expect(screen.queryByText(EMPTY_HINT)).toBeNull();
  });

  it('shows a friendly alert on a server error and retries', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ error: { code: 'INTERNAL', message: 'boom' } }, 500)),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container, onRefined } = renderBox();
    fireEvent.click(screen.getByRole('button', { name: 'Cut budget 20%' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Something went wrong on our side');
    expect(alert.textContent).not.toContain('boom');
    expect(onRefined).not.toHaveBeenCalled();
    expect((await axe(container)).violations).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('alert');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows the network message when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    renderBox();
    fireEvent.change(screen.getByLabelText('What should change?'), {
      target: { value: 'Add 20 guests' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update plan' }));
    expect((await screen.findByRole('alert')).textContent).toContain('could not reach the planner');
  });

  it('announces the last applied change', () => {
    renderBox('Cut the budget by 20%.');
    expect(screen.getByRole('status').textContent).toContain('Cut the budget by 20%.');
  });
});
