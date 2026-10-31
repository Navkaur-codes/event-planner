import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { planResponse } from '../../mocks/fixtures';
import { fill, fillBasics, jsonResponse, next, pinToday } from '../../test/helpers';
import { Wizard } from './Wizard';

function renderWizard() {
  const onPlanReady = vi.fn();
  const onEventTypeChange = vi.fn();
  const utils = render(
    <Wizard
      eventType="birthday"
      source={null}
      onEventTypeChange={onEventTypeChange}
      onPlanReady={onPlanReady}
      onExit={vi.fn()}
    />,
  );
  return { ...utils, onPlanReady, onEventTypeChange };
}

function currentStep(): string {
  return screen.getByRole('heading', { level: 2 }).textContent ?? '';
}

beforeEach(pinToday);
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Wizard', () => {
  it('shows inline errors linked with aria-describedby and focuses the first invalid field', () => {
    renderWizard();
    next();

    const title = screen.getByLabelText('Event name');
    expect(title.getAttribute('aria-invalid')).toBe('true');
    const errorId = title.getAttribute('aria-describedby');
    expect(errorId).toBe('title-error');
    expect(document.getElementById('title-error')?.textContent).toMatch(/Give your event a name/);
    expect(screen.getByLabelText('Number of guests').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(title);
    expect(currentStep()).toMatch(/Step 1 of 4/);
  });

  it('rejects a date in the past and clears an error once the field is edited', () => {
    renderWizard();
    fillBasics();
    fill('Date', '2026-10-01');
    next();
    expect(screen.getByText(/That date has passed/)).toBeTruthy();

    fill('Date', '2026-12-20');
    expect(screen.queryByText(/That date has passed/)).toBeNull();
  });

  it('limits priorities to three using the shared schema', () => {
    renderWizard();
    fillBasics();
    next();
    fill('Total budget', '60000');
    for (const name of ['Venue', 'Food & drinks', 'Decor', 'Photography']) {
      fireEvent.click(screen.getByRole('checkbox', { name }));
    }
    next();
    expect(screen.getByText('Pick up to 3 priorities.')).toBeTruthy();
    expect(currentStep()).toMatch(/Step 2 of 4/);
  });

  it('marks the current step with aria-current and re-themes on event type change', () => {
    const { onEventTypeChange } = renderWizard();
    const current = screen.getByRole('listitem', { current: 'step' });
    expect(current.textContent).toContain('Basics');

    fireEvent.click(screen.getByRole('radio', { name: 'Wedding' }));
    expect(onEventTypeChange).toHaveBeenCalledWith('wedding');
  });

  it('submits a schema-valid EventInput to POST /api/plan and hands back the plan', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(planResponse));
    vi.stubGlobal('fetch', fetchMock);
    const { onPlanReady } = renderWizard();

    fillBasics();
    next();
    fill('Total budget', '60000');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Food & drinks' }));
    next();
    fill('Vibe (optional)', 'space explorers');
    next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Vegetarian' }));
    next();

    expect(await screen.findByText(/Planning your birthday/)).toBeTruthy();
    await waitFor(() => expect(onPlanReady).toHaveBeenCalledWith(planResponse));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/plan');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      eventType: 'birthday',
      title: 'Aarav turns 7',
      eventDate: '2026-12-20',
      city: 'Ludhiana',
      cityTier: 'metro',
      guestCount: 40,
      budget: 60000,
      currency: 'INR',
      vibe: 'space explorers',
      priorities: ['food'],
      constraints: ['vegetarian'],
      traditions: '',
      notes: '',
      language: 'en',
    });
  });

  it('shows a friendly error with retry when the planner is busy', async () => {
    const busy = { error: { code: 'RATE_LIMITED', message: 'Too many requests' } };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(busy, 429))
      .mockResolvedValueOnce(jsonResponse(planResponse));
    vi.stubGlobal('fetch', fetchMock);
    const { onPlanReady } = renderWizard();

    fillBasics();
    next();
    fill('Total budget', '60000');
    next();
    next();
    next();

    expect((await screen.findByRole('alert')).textContent).toMatch(/please wait a minute/);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(onPlanReady).toHaveBeenCalledOnce());
  });

  it('cancels an in-flight request and returns to the form', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        signal = init.signal ?? undefined;
        return new Promise<Response>(() => undefined);
      }),
    );
    const { onPlanReady } = renderWizard();
    fillBasics();
    next();
    fill('Total budget', '60000');
    next();
    next();
    next();

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(signal?.aborted).toBe(true);
    expect(currentStep()).toMatch(/Step 4 of 4/);
    expect(onPlanReady).not.toHaveBeenCalled();
  });

  it('has no axe violations on any step, with and without errors', async () => {
    const { container } = renderWizard();
    expect((await axe(container)).violations).toEqual([]);
    next();
    expect((await axe(container)).violations).toEqual([]);

    fillBasics();
    next();
    expect(currentStep()).toMatch(/Step 2 of 4/);
    expect((await axe(container)).violations).toEqual([]);
    fill('Total budget', '60000');
    next();
    expect(currentStep()).toMatch(/Step 3 of 4/);
    expect((await axe(container)).violations).toEqual([]);
    next();
    expect(currentStep()).toMatch(/Step 4 of 4/);
    expect((await axe(container)).violations).toEqual([]);
  });
});
