import { useId, useRef, useState } from 'react';
import { readPlanFile } from '../../state/planFile';
import type { SavedPlan } from '../../state/storage';

/** Opens a previously exported plan file; a bad file shows a friendly error and changes nothing. */
export function ImportPlanButton({ onImported }: { onImported: (saved: SavedPlan) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const result = await readPlanFile(file);
    if (inputRef.current) inputRef.current.value = '';
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    onImported(result.saved);
  }

  return (
    <div className="import-plan">
      <button
        type="button"
        className="button button--ghost"
        aria-describedby={error ? errorId : undefined}
        onClick={() => inputRef.current?.click()}
      >
        Import a plan file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        aria-label="Plan file to import"
        hidden
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      {error && (
        <p id={errorId} className="field__error" role="alert">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}
