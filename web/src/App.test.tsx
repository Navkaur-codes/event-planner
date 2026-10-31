import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { planResponse } from './mocks/fixtures';
import { STORAGE_KEY, loadSavedPlan, savePlan } from './state/storage';
import { fill, fillBasics, jsonResponse, next, pinToday } from './test/helpers';

const health = {
  status: 'ok',
  version: '0.1.0',
  ports: { engine: 'stub', ai: 'stub' },
  aiConfigured: true,
};

/** Routes the mocked fetch by URL, like the real same-origin API. */
function stubApi() {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(url === '/api/plan' ? jsonResponse(planResponse) : jsonResponse(health)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  pinToday();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete document.body.dataset.event;
});

describe('App', () => {
  it('shows three event cards and the planner status', async () => {
    stubApi();
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

  it('has no detectable accessibility violations on the landing page', async () => {
    stubApi();
    const { container } = render(<App />);
    await screen.findByText(/Planner ready/);
    expect((await axe(container)).violations).toEqual([]);
  });

  it('starts the wizard themed for the chosen event', async () => {
    stubApi();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Plan a community event/ }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Plan your community event');
    expect(document.body.dataset.event).toBe('community');
    expect(await screen.findByRole('heading', { level: 2, name: /Basics/ })).toBeTruthy();
  });

  it('runs the whole flow to the dashboard and saves the plan', async () => {
    stubApi();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Plan a birthday/ }));
    fillBasics();
    next();
    fill('Total budget', '60000');
    next();
    next();
    next();

    expect(await screen.findByRole('heading', { level: 1, name: 'Aarav turns 7' })).toBeTruthy();
    expect(loadSavedPlan()?.response).toEqual(planResponse);

    fireEvent.click(screen.getByRole('checkbox', { name: /Order eggless themed cake/ }));
    expect(screen.getByText('1 of 3 done · 33%')).toBeTruthy();
    expect(loadSavedPlan()?.response.plan.checklist[0]?.done).toBe(true);
    expect(loadSavedPlan()?.celebrated).toBe(true);
  });

  it('restores a saved plan on reload and ignores a tampered one', async () => {
    stubApi();
    savePlan(planResponse, true);
    const { unmount } = render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Aarav turns 7' })).toBeTruthy();
    unmount();

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, response: { hacked: 1 } }),
    );
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Utsav' })).toBeTruthy();
  });
});
