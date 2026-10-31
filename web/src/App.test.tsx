import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { PlanResponse, RefineResponse } from '@utsav/shared';
import { planRequest, planResponse } from './mocks/fixtures';
import { STORAGE_KEY, loadSavedPlan, savePlan } from './state/storage';
import { fill, fillBasics, jsonResponse, next, pinToday } from './test/helpers';

const health = {
  status: 'ok',
  version: '0.1.0',
  ports: { engine: 'stub', ai: 'stub' },
  aiConfigured: true,
};

/** The fixture plan after "Cut budget 20%": every line scaled, the total exactly 48,000. */
const cutPlan: PlanResponse = {
  ...planResponse,
  plan: {
    ...planResponse.plan,
    input: { ...planRequest, budget: 48000 },
    budget: {
      ...planResponse.plan.budget,
      total: 48000,
      perGuest: 1200,
      lines: planResponse.plan.budget.lines.map((line) => ({
        ...line,
        amount: (line.amount * 4) / 5,
      })),
    },
  },
};

const refineResponse: RefineResponse = {
  patch: { budgetChangePercent: -20 },
  explanation: 'Cut the budget by 20% to ₹48,000.',
  result: cutPlan,
};

/** Routes the mocked fetch by URL, like the real same-origin API. */
function stubApi() {
  const replies: Record<string, unknown> = {
    '/api/plan': planResponse,
    '/api/refine': refineResponse,
    '/api/health': health,
  };
  const fetchMock = vi.fn((url: string) => Promise.resolve(jsonResponse(replies[url])));
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
    const cards = screen.getByRole('list', { name: 'Events Utsav can plan' });
    expect(within(cards).getAllByRole('heading', { level: 2 })).toHaveLength(3);
    const how = screen.getByRole('region', { name: 'How it works' });
    expect(
      within(how)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual([
      'The engine does the maths',
      'The AI adds the personal touch',
      'Your plan stays with you',
    ]);
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
    savePlan({ response: planResponse, celebrated: true, actuals: {} });
    const { unmount } = render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Aarav turns 7' })).toBeTruthy();
    unmount();

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, response: { hacked: 1 }, celebrated: true, actuals: {} }),
    );
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Utsav' })).toBeTruthy();
  });

  it('refines the plan in place from a suggestion chip, without a reload', async () => {
    const fetchMock = stubApi();
    savePlan({ response: planResponse, celebrated: true, actuals: {} });
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Aarav turns 7' });

    fireEvent.click(screen.getByRole('button', { name: 'Cut budget 20%' }));
    expect(await screen.findByText(/Cut the budget by 20% to ₹48,000/)).toBeTruthy();

    const refineCall = fetchMock.mock.calls.find(([url]) => url === '/api/refine') as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(refineCall[1].body as string)).toEqual({
      input: planRequest,
      message: 'Cut budget 20%',
      clientToday: '2026-10-31',
    });
    const table = screen.getByRole('table', { name: /Budget by category/ });
    expect(within(table).getByText('₹48,000')).toBeTruthy();
    expect(within(table).getAllByText(/Down ₹/).length).toBe(5);
    expect(screen.getByText(/Your last tweak changed 5 line/)).toBeTruthy();
    await waitFor(() => expect(loadSavedPlan()?.response.plan.budget.total).toBe(48000));
  });

  it('imports a plan file from the landing page and rejects a tampered one', async () => {
    stubApi();
    render(<App />);
    const input = screen.getByLabelText('Plan file to import');

    const tampered = {
      version: 2,
      response: { ...planResponse, aiStatus: 'hacked' },
      celebrated: true,
      actuals: {},
    };
    fireEvent.change(input, {
      target: { files: [new File([JSON.stringify(tampered)], 'x.json')] },
    });
    expect((await screen.findByRole('alert')).textContent).toMatch(/isn’t a valid Utsav plan/);
    expect(screen.getByRole('heading', { level: 1, name: 'Utsav' })).toBeTruthy();

    const good = { version: 2, response: planResponse, celebrated: true, actuals: { food: 20000 } };
    fireEvent.change(input, { target: { files: [new File([JSON.stringify(good)], 'p.json')] } });
    expect(await screen.findByRole('heading', { level: 1, name: 'Aarav turns 7' })).toBeTruthy();
    expect((screen.getByLabelText('Actual spend on Food & drinks') as HTMLInputElement).value).toBe(
      '20000',
    );
  });
});
