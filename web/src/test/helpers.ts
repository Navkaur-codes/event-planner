import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';

/** Pins "today" to 31 Oct 2026 without faking timers (so async queries still work). */
export function pinToday(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-31T10:00:00'));
}

/** A `fetch` mock answering with JSON. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Types a value into the control labelled `label`. */
export function fill(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Clicks the wizard's primary button ("Next" or "Make my plan"). */
export function next(): void {
  fireEvent.click(screen.getByRole('button', { name: /^(Next|Make my plan)$/ }));
}

/** Fills step 1 (Basics) with valid values. */
export function fillBasics(): void {
  fill('Event name', 'Aarav turns 7');
  fill('Date', '2026-12-20');
  fill('Number of guests', '40');
  fill('City', 'Ludhiana');
}
