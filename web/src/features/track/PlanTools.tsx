import { downloadIcs, icsBuilder, type IcsBuilder } from '../../lib/calendar';
import { downloadPlanFile } from '../../state/planFile';
import type { SavedPlan } from '../../state/storage';
import { ImportPlanButton } from './ImportPlanButton';

interface PlanToolsProps {
  /** The plan exactly as it would be saved, so an export re-imports losslessly. */
  saved: SavedPlan;
  onImported: (saved: SavedPlan) => void;
  /** Builds the .ics file; the button is hidden while no builder is available. */
  buildIcs?: IcsBuilder | null;
}

/** Keep the plan: download as JSON or .ics, import a file, or print a clean A4 copy. */
export function PlanTools({ saved, onImported, buildIcs = icsBuilder }: PlanToolsProps) {
  const { timeline, input } = saved.response.plan;
  return (
    <section className="plan-tools no-print" aria-labelledby="tools-title">
      <h2 id="tools-title" className="visually-hidden">
        Save, share or print
      </h2>
      <button
        type="button"
        className="button button--ghost"
        onClick={() => downloadPlanFile(saved)}
      >
        Download plan (JSON)
      </button>
      {buildIcs && (
        <button
          type="button"
          className="button button--ghost"
          onClick={() => downloadIcs(buildIcs(timeline, input.title), input.title)}
        >
          Add timeline to calendar (.ics)
        </button>
      )}
      <ImportPlanButton onImported={onImported} />
      <button type="button" className="button button--ghost" onClick={() => window.print()}>
        Print plan
      </button>
    </section>
  );
}
