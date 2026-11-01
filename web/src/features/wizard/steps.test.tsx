import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONSTRAINT_LABELS } from '../../lib/labels';
import { StepBudget, StepNeeds, type StepProps } from './steps';
import { emptyDraft, type EventDraft } from './wizardModel';

function props(overrides: Partial<EventDraft> = {}, errors: StepProps['errors'] = {}) {
  const update = vi.fn();
  const stepProps: StepProps = {
    draft: { ...emptyDraft('birthday'), ...overrides },
    errors,
    update,
    today: '2026-10-31',
  };
  return { stepProps, update };
}

function checkbox(group: HTMLElement, value: string): HTMLInputElement {
  const box = group.querySelector<HTMLInputElement>(`input[type="checkbox"][value="${value}"]`);
  if (!box) throw new Error(`No checkbox ${value}`);
  return box;
}

afterEach(cleanup);

describe('wizard chip toggles', () => {
  it('adds and removes constraints on the needs step', async () => {
    const { stepProps, update } = props({ constraints: ['vegan'] });
    const { container } = render(<StepNeeds {...stepProps} />);
    fireEvent.click(screen.getByRole('checkbox', { name: CONSTRAINT_LABELS.outdoor }));
    expect(update).toHaveBeenLastCalledWith('constraints', ['vegan', 'outdoor']);
    const vegan = screen.getByRole<HTMLInputElement>('checkbox', { name: CONSTRAINT_LABELS.vegan });
    expect(vegan.checked).toBe(true);
    fireEvent.click(vegan);
    expect(update).toHaveBeenLastCalledWith('constraints', []);
    expect((await axe(container)).violations).toEqual([]);
  });

  it('toggles priorities on the budget step and shows its error', async () => {
    const { stepProps, update } = props({ priorities: ['food'] }, { priorities: 'Pick up to 3.' });
    const { container } = render(<StepBudget {...stepProps} />);
    const group = screen.getByRole('group', { name: /Top priorities/ });
    fireEvent.click(checkbox(group, 'decor'));
    expect(update).toHaveBeenLastCalledWith('priorities', ['food', 'decor']);
    fireEvent.click(checkbox(group, 'food'));
    expect(update).toHaveBeenLastCalledWith('priorities', []);
    expect(screen.getByText(/Pick up to 3\./)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
});
