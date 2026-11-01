import type { AiIdeas, AiStatus, Language } from '@utsav/shared';

const LISTS: ReadonlyArray<{ key: Exclude<keyof AiIdeas, 'summary' | 'themes'>; title: string }> = [
  { key: 'decor', title: 'Decor' },
  { key: 'food', title: 'Food' },
  { key: 'activities', title: 'Activities' },
  { key: 'personalTouches', title: 'Personal touches' },
  { key: 'vendorQuestions', title: 'Questions to ask vendors' },
];

/** Personalized ideas from the AI layer (or the deterministic fallback, clearly flagged). */
export function IdeasPanel({
  ideas,
  aiStatus,
  lang,
}: {
  ideas: AiIdeas;
  aiStatus: AiStatus;
  /** Language the ideas are written in, so screen readers pronounce them correctly. */
  lang: Language;
}) {
  return (
    <section className="panel" aria-labelledby="ideas-title">
      <h2 id="ideas-title">Ideas for you</h2>
      {aiStatus === 'fallback' && (
        <p className="notice notice--info">
          <span aria-hidden="true">ℹ </span>
          <strong>Starter ideas:</strong> our AI idea-maker is resting, so these are hand-picked
          ideas. Your budget, timeline and checklist are fully calculated either way.
        </p>
      )}
      <p className="panel__lead" lang={lang}>
        {ideas.summary}
      </p>
      <ul className="theme-cards" lang={lang}>
        {ideas.themes.map((theme) => (
          <li key={theme.name} className="sticker theme-card">
            <h3>{theme.name}</h3>
            <p>{theme.description}</p>
          </li>
        ))}
      </ul>
      <div className="idea-lists">
        {LISTS.map(({ key, title }) => (
          <div key={key} className="idea-list">
            <h3>{title}</h3>
            <ul lang={lang}>
              {ideas[key].map((idea, i) => (
                <li key={i}>{idea}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
