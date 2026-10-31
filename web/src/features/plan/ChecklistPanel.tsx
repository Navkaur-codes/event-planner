import type { ChecklistItem, VendorType } from '@utsav/shared';
import { ITEM_PRIORITY_LABELS, VENDOR_LABELS } from '../../lib/labels';

/** Vendor checklist grouped by vendor type, with overall progress. */
export function ChecklistPanel({
  items,
  onToggle,
}: {
  items: readonly ChecklistItem[];
  onToggle: (id: string) => void;
}) {
  const done = items.filter((item) => item.done).length;
  const percent = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
  const groups = groupByVendor(items);

  return (
    <section className="panel" aria-labelledby="checklist-title">
      <h2 id="checklist-title">Vendor checklist</h2>
      <div className="progress">
        <label htmlFor="checklist-progress" className="progress__label">
          {done} of {items.length} done · {percent}%
        </label>
        <progress id="checklist-progress" max={items.length || 1} value={done} />
      </div>
      {groups.map(([vendor, vendorItems]) => (
        <fieldset key={vendor} className="checklist-group">
          <legend>{VENDOR_LABELS[vendor]}</legend>
          <ul>
            {vendorItems.map((item) => (
              <li key={item.id}>
                <label className="check">
                  <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} />
                  <span className="check__task">{item.task}</span>
                  <span className={`badge badge--${item.priority}`}>
                    {ITEM_PRIORITY_LABELS[item.priority]}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
    </section>
  );
}

function groupByVendor(items: readonly ChecklistItem[]): [VendorType, ChecklistItem[]][] {
  const groups = new Map<VendorType, ChecklistItem[]>();
  for (const item of items) groups.set(item.vendor, [...(groups.get(item.vendor) ?? []), item]);
  return [...groups.entries()];
}
