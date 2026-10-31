import { LIMITS, type BudgetCategory, type BudgetLine, type BudgetPlan } from '@utsav/shared';
import { useState } from 'react';
import { CATEGORY_LABELS, formatMoney } from '../../lib/labels';
import type { Actuals } from '../../state/storage';

interface SpendTrackerProps {
  budget: BudgetPlan;
  actuals: Actuals;
  onChange: (category: BudgetCategory, amount: number | null) => void;
}

/** "Over by ₹X" / "₹X left", always with an icon and words — never colour alone. */
function SpendStatus({
  planned,
  actual,
  currency,
}: {
  planned: number;
  actual?: number;
  currency: BudgetPlan['currency'];
}) {
  if (actual === undefined) return <span className="spend spend--none">Not entered</span>;
  if (actual > planned) {
    return (
      <span className="spend spend--over">
        <span aria-hidden="true">⚠ </span>Over by {formatMoney(actual - planned, currency)}
      </span>
    );
  }
  return (
    <span className="spend spend--ok">
      <span aria-hidden="true">✓ </span>
      {formatMoney(planned - actual, currency)} left
    </span>
  );
}

function TrackerRow({
  line,
  actual,
  currency,
  onChange,
}: {
  line: BudgetLine;
  actual?: number;
  currency: BudgetPlan['currency'];
  onChange: SpendTrackerProps['onChange'];
}) {
  const [text, setText] = useState(actual === undefined ? '' : String(actual));
  const [invalid, setInvalid] = useState(false);
  const id = `actual-${line.category}`;
  const label = CATEGORY_LABELS[line.category];

  function handleChange(value: string) {
    setText(value);
    const trimmed = value.trim();
    if (trimmed === '') {
      setInvalid(false);
      onChange(line.category, null);
      return;
    }
    const amount = Number(trimmed);
    const ok = /^\d+$/.test(trimmed) && amount <= LIMITS.budget.max;
    setInvalid(!ok);
    if (ok) onChange(line.category, amount);
  }

  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="num">{formatMoney(line.amount, currency)}</td>
      <td>
        <label htmlFor={id} className="visually-hidden">
          Actual spend on {label}
        </label>
        <input
          id={id}
          className="tracker-input"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={text}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => handleChange(event.target.value)}
        />
        {invalid && (
          <span id={`${id}-error`} className="field__error tracker-error">
            Whole amount, 0 or more.
          </span>
        )}
      </td>
      <td>
        <SpendStatus planned={line.amount} actual={actual} currency={currency} />
      </td>
    </tr>
  );
}

/** Actual-vs-planned spend per budget line, saved on this device. */
export function SpendTracker({ budget, actuals, onChange }: SpendTrackerProps) {
  const entered = budget.lines.filter((line) => actuals[line.category] !== undefined);
  const spent = entered.reduce((sum, line) => sum + (actuals[line.category] ?? 0), 0);

  return (
    <section className="panel" aria-labelledby="tracker-title">
      <h2 id="tracker-title">Spend tracker</h2>
      <p className="panel__lead">
        Note what you have paid or been quoted. It stays on this device and comes with your exported
        plan.
      </p>
      <div className="table-scroll">
        <table className="tracker-table">
          <caption className="visually-hidden">Planned and actual spend by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">
                Planned
              </th>
              <th scope="col">Actual</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((line) => (
              <TrackerRow
                key={line.category}
                line={line}
                actual={actuals[line.category]}
                currency={budget.currency}
                onChange={onChange}
              />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num">{formatMoney(budget.total, budget.currency)}</td>
              <td className="num">{formatMoney(spent, budget.currency)}</td>
              <td>
                {entered.length === 0 ? (
                  <span className="spend spend--none">Nothing entered yet</span>
                ) : (
                  <SpendStatus planned={budget.total} actual={spent} currency={budget.currency} />
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
