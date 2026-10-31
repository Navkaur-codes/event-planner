import { LIMITS, recalculateBudget, type BudgetPlan, type EventInput } from '@utsav/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY_LABELS, formatMoney } from '../../lib/labels';
import { countUp } from '../../motion';

/** A round slider step about 1% of the budget (₹60,000 → 1,000; ₹25 lakh → 10,000). */
export function budgetStep(budget: number): number {
  return Math.max(LIMITS.budget.min / 10, 10 ** Math.floor(Math.log10(budget)) / 10);
}

/** Slider bounds that keep the current value reachable and stay inside the input limits. */
export function sliderRange(value: number, step: number, min: number, max: number) {
  const low = Math.max(min, step);
  const top = Math.ceil(Math.max(value * 3, low + step * 20) / step) * step;
  return { min: low, max: Math.min(max, top) };
}

/**
 * What-if sliders: guests and budget re-run the engine's budget maths in the browser, instantly
 * and without the network. A preview only — the saved plan changes through refine or edit.
 */
export function WhatIfPanel({ input, current }: { input: EventInput; current: BudgetPlan }) {
  const [guests, setGuests] = useState(input.guestCount);
  const [budget, setBudget] = useState(input.budget);
  const preview = useMemo(
    () => recalculateBudget(input, { guestCount: guests, budget }),
    [input, guests, budget],
  );
  const planned = new Map(current.lines.map((line) => [line.category, line.amount]));

  const totalRef = useRef<HTMLSpanElement>(null);
  const shownTotal = useRef(preview.total);
  useEffect(() => {
    if (!totalRef.current) return;
    const from = shownTotal.current;
    shownTotal.current = preview.total;
    return countUp(totalRef.current, from, preview.total, (value) =>
      formatMoney(value, preview.currency),
    );
  }, [preview.total, preview.currency]);

  const step = budgetStep(input.budget);
  const budgetRange = sliderRange(input.budget, step, LIMITS.budget.min, LIMITS.budget.max);
  const guestRange = sliderRange(input.guestCount, 1, LIMITS.guestCount.min, LIMITS.guestCount.max);
  const changed = guests !== input.guestCount || budget !== input.budget;

  return (
    <section className="panel what-if no-print" aria-labelledby="whatif-title">
      <h2 id="whatif-title">What if…?</h2>
      <p className="notice notice--info">
        <span aria-hidden="true">ℹ </span>
        <strong>Preview only</strong> — nothing is saved. To keep a change, use “Tweak your plan” or
        Edit details.
      </p>

      <div className="slider">
        <label htmlFor="whatif-guests" className="field__label">
          Guests: <output htmlFor="whatif-guests">{guests}</output>
        </label>
        <input
          id="whatif-guests"
          type="range"
          min={guestRange.min}
          max={guestRange.max}
          step={1}
          value={guests}
          aria-valuetext={`${guests} guests`}
          onChange={(event) => setGuests(Number(event.target.value))}
        />
      </div>
      <div className="slider">
        <label htmlFor="whatif-budget" className="field__label">
          Budget: <output htmlFor="whatif-budget">{formatMoney(budget, input.currency)}</output>
        </label>
        <input
          id="whatif-budget"
          type="range"
          min={budgetRange.min}
          max={budgetRange.max}
          step={step}
          value={budget}
          aria-valuetext={formatMoney(budget, input.currency)}
          onChange={(event) => setBudget(Number(event.target.value))}
        />
      </div>

      <p className="what-if__total">
        <span className="visually-hidden">
          Preview total {formatMoney(preview.total, preview.currency)},
        </span>
        <span ref={totalRef} className="what-if__amount" aria-hidden="true" />{' '}
        <span className="what-if__per-guest">
          · {formatMoney(preview.perGuest, preview.currency)} per guest
        </span>
      </p>

      <div className="table-scroll">
        <table className="what-if__table">
          <caption className="visually-hidden">Current plan compared with the preview</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Now
              </th>
              <th scope="col" className="num">
                Preview
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.lines.map((line) => (
              <tr key={line.category}>
                <th scope="row">{CATEGORY_LABELS[line.category]}</th>
                <td className="num">
                  {formatMoney(planned.get(line.category) ?? 0, preview.currency)}
                </td>
                <td className="num">{formatMoney(line.amount, preview.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="button button--ghost"
          disabled={!changed}
          onClick={() => {
            setGuests(input.guestCount);
            setBudget(input.budget);
          }}
        >
          Reset to my plan
        </button>
      </div>
    </section>
  );
}
