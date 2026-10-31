import type { Severity, Warning } from '@utsav/shared';

const SEVERITY: Record<Severity, { icon: string; label: string }> = {
  critical: { icon: '⛔', label: 'Important' },
  warn: { icon: '⚠', label: 'Heads up' },
  info: { icon: 'ℹ', label: 'Note' },
};

/** Engine warnings: each has an icon *and* a text label, never colour alone. */
export function WarningsBanner({ warnings }: { warnings: readonly Warning[] }) {
  if (warnings.length === 0) return null;
  return (
    <section className="warnings" aria-labelledby="warnings-title">
      <h2 id="warnings-title" className="visually-hidden">
        Things to check
      </h2>
      <ul>
        {warnings.map((warning) => (
          <li key={warning.code} className={`notice notice--${warning.severity}`}>
            <span aria-hidden="true">{SEVERITY[warning.severity].icon} </span>
            <strong>{SEVERITY[warning.severity].label}:</strong> {warning.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
