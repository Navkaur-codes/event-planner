import { recalculateBudget } from '@utsav/shared';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { planRequest, planResponse } from '../../mocks/fixtures';
import { WhatIfPanel, budgetStep, sliderRange } from './WhatIfPanel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel() {
  return render(<WhatIfPanel input={planRequest} current={planResponse.plan.budget} />);
}

function slide(label: RegExp, value: number) {
  fireEvent.change(screen.getByRole('slider', { name: label }), {
    target: { value: String(value) },
  });
}

describe('WhatIfPanel', () => {
  it('previews the engine budget instantly without calling the API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderPanel();
    expect(screen.getByText(/Preview only/)).toBeTruthy();

    slide(/Budget/, 90000);
    slide(/Guests/, 60);

    const expected = recalculateBudget(planRequest, { budget: 90000, guestCount: 60 });
    expect(screen.getByText(/Preview total ₹90,000/)).toBeTruthy();
    expect(
      screen.getByText(`· ₹${expected.perGuest.toLocaleString('en-IN')} per guest`),
    ).toBeTruthy();
    expect(screen.getByRole('slider', { name: /Guests/ }).getAttribute('aria-valuetext')).toBe(
      '60 guests',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resets the preview to the saved plan', () => {
    renderPanel();
    const reset = screen.getByRole('button', { name: 'Reset to my plan' }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    slide(/Budget/, 30000);
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    expect(screen.getByText(/Preview total ₹60,000/)).toBeTruthy();
  });

  it('has no axe violations', async () => {
    const { container } = renderPanel();
    expect((await axe(container)).violations).toEqual([]);
  });
});

describe('slider helpers', () => {
  it('picks a round step near 1% of the budget', () => {
    expect(budgetStep(60000)).toBe(1000);
    expect(budgetStep(2_500_000)).toBe(100_000);
    expect(budgetStep(1000)).toBe(100);
  });

  it('keeps the current value inside the range and the range inside the limits', () => {
    expect(sliderRange(60000, 1000, 1000, 100_000_000)).toEqual({ min: 1000, max: 180_000 });
    expect(sliderRange(4000, 1, 1, 5000)).toEqual({ min: 1, max: 5000 });
    expect(sliderRange(2, 1, 1, 5000)).toEqual({ min: 1, max: 21 });
  });
});
