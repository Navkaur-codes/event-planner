import { cleanup, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const health = {
  status: 'ok',
  version: '0.1.0',
  ports: { engine: 'stub', ai: 'stub' },
  aiConfigured: true,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App (Step 0 landing)', () => {
  it('shows the three event types and the planner status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(health))));
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Utsav' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
    expect(await screen.findByText(/Planner ready · v0\.1\.0 · AI ideas on/)).toBeTruthy();
  });

  it('shows a friendly message when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    render(<App />);
    expect(await screen.findByText(/Planner is offline/)).toBeTruthy();
  });

  it('has no detectable accessibility violations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(health))));
    const { container } = render(<App />);
    await screen.findByText(/Planner ready/);
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
