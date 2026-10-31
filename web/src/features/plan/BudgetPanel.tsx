import type { BudgetPlan, Currency } from '@utsav/shared';
import type { BudgetChanges } from '../../lib/budgetDiff';
import { CATEGORY_LABELS, formatMoney } from '../../lib/labels';

/** Marks a line the last refinement changed, with an icon and words (not colour alone). */
function ChangeBadge({ change, currency }: { change: number | 'new'; currency: Currency }) {
  if (change === 'new') {
    return (
      <span className="change-badge">
        <span aria-hidden="true">★ </span>New line
      </span>
    );
  }
  return (
    <span className="change-badge">
      <span aria-hidden="true">{change > 0 ? '▲ ' : '▼ '}</span>
      {change > 0 ? 'Up' : 'Down'} {formatMoney(Math.abs(change), currency)}
    </span>
  );
}

/** Budget split as a table whose share column carries a horizontal bar (no pie charts). */
export function BudgetPanel({
  budget,
  changes = {},
}: {
  budget: BudgetPlan;
  /** Lines changed by the last refinement. */
  changes?: BudgetChanges;
}) {
  const largest = Math.max(...budget.lines.map((line) => line.percent), 1);
  const lines = [...budget.lines].sort((a, b) => b.amount - a.amount);

  return (
    <section className="panel" aria-labelledby="budget-title">
      <h2 id="budget-title">Budget</h2>
      <p className="panel__lead">
        <strong>{formatMoney(budget.total, budget.currency)}</strong> in total ·{' '}
        {formatMoney(budget.perGuest, budget.currency)} per guest. Every line adds up exactly.
      </p>
      {Object.keys(changes).length > 0 && (
        <p className="notice notice--info">
          <span aria-hidden="true">✎ </span>
          <strong>Your last tweak changed {Object.keys(changes).length} line(s)</strong> — marked
          below.
        </p>
      )}
      <div className="table-scroll">
        <table className="budget-table">
          <caption className="visually-hidden">
            Budget by category, largest first, with share of total
          </caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Share</th>
              <th scope="col" className="num">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const change = changes[line.category];
              return (
                <tr
                  key={line.category}
                  data-category={line.category}
                  data-changed={change === undefined ? undefined : 'true'}
                >
                  <th scope="row">
                    {CATEGORY_LABELS[line.category]}
                    {change !== undefined && (
                      <ChangeBadge change={change} currency={budget.currency} />
                    )}
                    {line.note && <span className="budget-table__note">{line.note}</span>}
                  </th>
                  <td>
                    <span className="share">
                      <span className="bar-track" aria-hidden="true">
                        <span
                          className="bar"
                          data-reveal="bar"
                          style={{ width: `${(line.percent / largest) * 100}%` }}
                        />
                      </span>
                      <span className="share__percent">{line.percent}%</span>
                    </span>
                  </td>
                  <td className="num">{formatMoney(line.amount, budget.currency)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>100%</td>
              <td className="num">{formatMoney(budget.total, budget.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
