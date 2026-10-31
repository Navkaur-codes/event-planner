import { useEffect, useRef, useState } from 'react';
import type { PlannerError } from '../../api/client';

const LOADING_MESSAGES = [
  'Stringing the marigolds…',
  'Balancing the budget to the last coin…',
  'Working backwards from the big day…',
  'Sorting the vendor checklist…',
  'Dreaming up ideas just for you…',
];

/** Joyful, cancellable "planning…" state; progress text is announced politely. */
export function LoadingPanel({ eventNoun, onCancel }: { eventNoun: string; onCancel: () => void }) {
  const [index, setIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      2800,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="sticker request-panel" aria-labelledby="loading-title" aria-busy="true">
      <h2 id="loading-title" ref={headingRef} tabIndex={-1}>
        Planning your {eventNoun}…
      </h2>
      <div className="garland" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className="request-panel__status" role="status" aria-live="polite">
        {LOADING_MESSAGES[index]}
      </p>
      <button type="button" className="button button--ghost" onClick={onCancel}>
        Cancel
      </button>
    </section>
  );
}

interface ErrorPanelProps {
  error: PlannerError;
  onRetry: () => void;
  onEdit: () => void;
}

/** Friendly failure message with retry; never shows raw server details. */
export function ErrorPanel({ error, onRetry, onEdit }: ErrorPanelProps) {
  const retryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => retryRef.current?.focus(), []);

  return (
    <section className="sticker request-panel request-panel--error" aria-labelledby="error-title">
      <div role="alert">
        <h2 id="error-title">
          <span aria-hidden="true">⚠ </span>
          The plan didn’t come together
        </h2>
        <p>{error.message}</p>
        {error.issues.length > 0 && (
          <ul>
            {error.issues.map((issue) => (
              <li key={`${issue.path}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="button-row">
        <button ref={retryRef} type="button" className="button button--primary" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="button button--ghost" onClick={onEdit}>
          Edit details
        </button>
      </div>
    </section>
  );
}
