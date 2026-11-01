import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../test/helpers';
import { Landing } from './Landing';

const health = {
  status: 'ok',
  version: '1.0.0',
  ports: { engine: 'real', ai: 'real' },
  aiConfigured: false,
};

function renderLanding(savedTitle: string | null = null) {
  const props = { onStart: vi.fn(), savedTitle, onOpenSaved: vi.fn(), onImported: vi.fn() };
  render(<Landing {...props} />);
  return props;
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

  it('offers to continue a saved plan and starts each event type', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(health));
    const props = renderLanding('Aarav turns 7');
    fireEvent.click(screen.getByRole('button', { name: /Continue .Aarav turns 7./ }));
    expect(props.onOpenSaved).toHaveBeenCalledOnce();
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
