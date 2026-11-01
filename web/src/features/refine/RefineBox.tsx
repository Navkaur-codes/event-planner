import { LIMITS, type EventInput, type RefineResponse } from '@utsav/shared';
import { useCallback, useState, type FormEvent } from 'react';
import { refinePlan } from '../../api/client';
import { useCancellableRequest } from '../../api/useCancellableRequest';

export const SUGGESTIONS = [
  'Cut budget 20%',
  'Make it eco-friendly',
  'Add 20 guests',
  'More ideas for kids',
] as const;

interface RefineArgs {
  input: EventInput;
  message: string;
}

const runRefine = ({ input, message }: RefineArgs, signal: AbortSignal) =>
  refinePlan(input, message, signal);

interface RefineBoxProps {
  input: EventInput;
  /** Explanation of the last applied change, if any. */
  explanation: string | null;
  onRefined: (response: RefineResponse) => void;
}

/**
 * Change the plan in plain words. Not a chat: each request becomes a structured patch,
 * the engine recalculates, and the dashboard updates in place.
 */
export function RefineBox({ input, explanation, onRefined }: RefineBoxProps) {
  const [message, setMessage] = useState('');
  const [emptyError, setEmptyError] = useState(false);
  const handleSuccess = useCallback(
    (response: RefineResponse) => {
      setMessage('');
      onRefined(response);
    },
    [onRefined],
  );
  const { state, submit, cancel } = useCancellableRequest(runRefine, handleSuccess);
  const loading = state.status === 'loading';

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setEmptyError(true);
      return;
    }
    setEmptyError(false);
    setMessage(trimmed);
    void submit({ input, message: trimmed });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(message);
  }

  const describedBy = emptyError ? 'refine-count refine-error' : 'refine-count';

  return (
    <section className="panel refine no-print" aria-labelledby="refine-title">
      <h2 id="refine-title">Tweak your plan</h2>
      <p className="panel__lead">
        Say what should change in plain words — the planner recalculates every number for you.
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="refine-message" className="field__label">
          What should change?
        </label>
        <textarea
          id="refine-message"
          className="refine__input"
          rows={2}
          maxLength={LIMITS.refineMessage}
          placeholder="e.g. Move it to a garden venue and keep it under ₹5 lakh"
          value={message}
          aria-invalid={emptyError ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            setMessage(event.target.value);
            if (emptyError) setEmptyError(false);
          }}
        />
        <p id="refine-count" className="field__counter">
          {message.length}/{LIMITS.refineMessage} characters
        </p>
        {emptyError && (
          <p id="refine-error" className="field__error">
            <span aria-hidden="true">⚠ </span>Write what you’d like to change, or pick a suggestion.
          </p>
        )}
        <div className="suggestions" role="group" aria-label="Suggestions">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="suggestion"
              disabled={loading}
              onClick={() => send(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <div className="button-row">
          <button type="submit" className="button button--primary" disabled={loading}>
            Update plan
          </button>
          {loading && (
            <button type="button" className="button button--ghost" onClick={cancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <p className="refine__status" role="status" aria-live="polite">
        {loading && 'Updating your plan…'}
        {!loading && state.status !== 'error' && explanation && (
          <>
            <span aria-hidden="true">✓ </span>
            <strong>Updated:</strong> <span lang={input.language}>{explanation}</span>
          </>
        )}
      </p>
      {state.status === 'error' && (
        <div className="notice notice--critical" role="alert">
          <span aria-hidden="true">⚠ </span>
          {state.error.message}{' '}
          <button type="button" className="link-button" onClick={() => void submit(state.args)}>
            Try again
          </button>
        </div>
      )}
    </section>
  );
}
