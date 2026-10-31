import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanTools } from '../features/track/PlanTools';
import { planResponse } from '../mocks/fixtures';
import { icsFileName } from './calendar';

const saved = { version: 2 as const, response: planResponse, celebrated: true, actuals: {} };
const FAKE_ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('calendar export', () => {
  it('is hidden until the engine provides an .ics builder', () => {
    render(<PlanTools saved={saved} onImported={vi.fn()} buildIcs={null} />);
    expect(screen.queryByRole('button', { name: /calendar/ })).toBeNull();
  });

  it('downloads what the builder returns, named after the event', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:ics');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    let fileName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      fileName = this.download;
    });
    const buildIcs = vi.fn(() => FAKE_ICS);
    render(<PlanTools saved={saved} onImported={vi.fn()} buildIcs={buildIcs} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add timeline to calendar (.ics)' }));

    expect(buildIcs).toHaveBeenCalledWith(planResponse.plan.timeline, 'Aarav turns 7');
    expect(fileName).toBe('utsav-aarav-turns-7.ics');
    const [blob] = createObjectURL.mock.calls[0] ?? [new Blob()];
    expect(blob.type).toBe('text/calendar;charset=utf-8');
    expect(await blob.text()).toBe(FAKE_ICS);
  });

  it('falls back to a generic name for titles without latin letters', () => {
    expect(icsFileName('दिवाली मेला')).toBe('utsav-timeline.ics');
  });
});
