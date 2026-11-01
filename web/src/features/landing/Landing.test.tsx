import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { planResponse } from '../../mocks/fixtures';
import type { LibraryEntry } from '../../state/storage';
import { jsonResponse } from '../../test/helpers';
import { Landing } from './Landing';

const health = {
  status: 'ok',
  version: '1.0.0',
  ports: { engine: 'real', ai: 'real' },
  aiConfigured: false,
};

const entry = {
  id: 'p-1',
  savedAt: '2026-11-01T10:00:00.000Z',
  plan: { version: 2 as const, response: planResponse, celebrated: true, actuals: {} },
};

function renderLanding(plans: LibraryEntry[] = []) {
  const props = {
    onStart: vi.fn(),
    plans,
    onOpenSaved: vi.fn(),
    onDeleteSaved: vi.fn(),
    onImported: vi.fn(),
  };
  const { container } = render(<Landing {...props} />);
  return { ...props, container };
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Landing', () => {
  it('says the planner is offline when the health check fails', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, 503));
    renderLanding();
    expect(screen.getByRole('status').textContent).toBe('Checking the planner…');
    expect(await screen.findByText(/Planner is offline right now/)).toBeTruthy();
  });

  it('does not claim AI ideas when the server has no AI key', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(health));
    renderLanding();
    expect(await screen.findByText('Planner ready · v1.0.0')).toBeTruthy();
  });

  it('lists saved plans to open or delete, and starts each event type', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(health));
    const props = renderLanding([entry]);
    const yourPlans = screen.getByRole('region', { name: 'Your plans' });
    expect(within(yourPlans).getByText(/Birthday/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open plan Aarav turns 7' }));
    expect(props.onOpenSaved).toHaveBeenCalledWith(entry);
    fireEvent.click(screen.getByRole('button', { name: 'Delete plan Aarav turns 7' }));
    const confirm = screen.getByRole('group', { name: 'Delete plan Aarav turns 7?' });
    expect((await axe(props.container)).violations).toEqual([]);
    expect(document.activeElement?.textContent).toBe('Keep');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Keep' }));
    expect(props.onDeleteSaved).not.toHaveBeenCalled();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Delete plan Aarav turns 7');

    fireEvent.click(screen.getByRole('button', { name: 'Delete plan Aarav turns 7' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(props.onDeleteSaved).toHaveBeenCalledWith('p-1');
    fireEvent.click(screen.getByRole('button', { name: /Plan a community event/ }));
    expect(props.onStart).toHaveBeenCalledWith('community');
    await screen.findByText(/Planner ready/);
  });

  it('stays quiet when the health check is aborted by leaving the page', async () => {
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    renderLanding();
    cleanup();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledOnce();
  });
});
