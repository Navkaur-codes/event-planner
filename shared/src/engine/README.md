# Planning engine

The engine turns an `EventInput` into a numerically sound plan: **budget**, **timeline**,
**vendor checklist** and **warnings**. It is pure TypeScript with no I/O and no clock (the caller
passes `today`). It runs on the server for `/api/plan` and in the browser for the what-if
sliders. The LLM never touches these numbers or dates; it only adds ideas on top.

Every rule below is a data table in [`rules/`](rules/), not an `if` chain. To tune the planner,
edit a table.

| Module | Job |
|---|---|
| `index.ts` | Public API: `buildPlan`, `recalculateBudget`, `applyPatch`, `timelineToIcs`, `IMPLEMENTATION` |
| `budget.ts` | Weights categories and splits the money exactly |
| `timeline.ts` | Counts milestones back from the event date and compresses them when time is short |
| `checklist.ts` | Base vendors + conditional rules |
| `warnings.ts` | Rule table of risks, each with a severity |
| `patch.ts` | Applies a refinement `PlanPatch` to the input |
| `ics.ts` | Exports the timeline as an RFC 5545 calendar |
| `money.ts`, `dates.ts` | Largest-remainder rounding; UTC day arithmetic |

## 1. Budget — [`rules/budgetSplits.ts`](rules/budgetSplits.ts)

**Contingency:** 10% of the total (rounded) is always held back as its own line.

**Base split of the other 90%** (percent of the total):

| Category | Wedding | Birthday | Community |
|---|---:|---:|---:|
| Venue | 24 | 15 | 20 |
| Food | 27 | 35 | 30 |
| Decor | 10 | 15 | 5 |
| Photography | 10 | 3 | 3 |
| Entertainment | 5 | 20 | 15 |
| Attire | 8 | 0 | 0 |
| Invitations | 2 | 1 | 2 |
| Gifts | 2 | 1 | 0 |
| Logistics | 2 | 0 | 15 |

**Adjusting for the user**, applied in this order and then renormalised back to 90%:

| Signal | Effect | Note shown on the line |
|---|---|---|
| `outdoor` | logistics +3, decor +1 | "Includes tents, power and weather backup" |
| `wheelchair_access` | logistics +1 | "Includes ramps and accessible washroom" |
| `elder_friendly` | logistics +1 | "Includes comfortable seating, pick-ups" |
| `kid_friendly` | entertainment +2 | "Includes kids activities" |
| `eco_friendly` | decor +0 (note only) | "Includes reusable or rented decor" |
| Each chosen priority (max 3) | weight raised to at least 3, then ×1.3 | "Boosted: your priority" |
| Dietary constraints | — | Food line names them, e.g. "Catering for 40 guests · vegetarian, Jain" |

**Exact money:** amounts are whole units split with the **largest-remainder method**, so
`sum(lines) === total` always. Categories with no share are left out. Lines are sorted largest
first with contingency last. `perGuest = round(total / guests)`.

## 2. Timeline — [`rules/milestones.ts`](rules/milestones.ts)

Each milestone is due `daysBefore` the event.

| Event type | Ideal lead time | Milestones (days before) |
|---|---:|---|
| Wedding | 180 days | budget & guest list 180 · venue 165 · photographer 150 · caterer tastings 120 · outfits & makeup 110 · decorator 90 · music 75 · invitations 60 · transport & stay 45 · lock menu 30 · gifts 21 · final headcount 10 · confirm vendors 5 · run sheet 1 |
| Birthday | 30 days | guest list & theme 30 · venue 25 · invitations 21 · entertainer 18 · caterer 14 · decorations 10 · cake 7 · return gifts 3 · confirm RSVPs 2 |
| Community | 60 days | organising team 60 · venue 50 · permissions 45 · sound & stage 35 · food 30 · publicity 21 · volunteers 14 · decor & signage 10 · safety plan 3 · volunteer briefing 1 |

**Compression:** if the event is closer than the ideal lead time, every `daysBefore` is scaled
by `daysLeft / leadTime`. The timeline is then marked `compressed: true`. No milestone is ever
due before `today` or after the event, and milestones are sorted by due date. Dates are whole
UTC days, so time zones and daylight saving can't shift them.

## 3. Vendor checklist — [`rules/vendors.ts`](rules/vendors.ts)

Every event type has a base list (wedding: venue, caterer, decorator, photographer, makeup,
DJ, invitations, sound). Conditional rules add more:

| When | Adds | Priority |
|---|---|---|
| guests > 150 | permits & security; guest transport & parking | must; should |
| `vegetarian` / `vegan` / `jain` / `halal` / `alcohol_free` | caterer task naming each diet | must |
| `wheelchair_access` | venue ramp, step-free entry, accessible washroom | must |
| `elder_friendly` | shaded seating near washrooms | should |
| `kid_friendly` | supervised child-safe play corner | should |
| `eco_friendly` | reusable decor, no single-use plastic; steel/compostable serveware | should |
| `outdoor` | canopy or tent and a rain/heat backup | must |
| wedding with traditions text | priest / officiant | must |

Items are ordered must → should → nice. Ids (`c-*`) are stable, so saved progress survives
re-planning. User free text is never copied into tasks.

## 4. Warnings — [`rules/thresholds.ts`](rules/thresholds.ts)

| Code | Fires when | Severity |
|---|---|---|
| `short-notice` | fewer than 14 days to the event | critical |
| `compressed-timeline` | timeline compressed, 14+ days left | warn |
| `low-per-guest` | spend per guest below the minimum for type × city tier (below half of it → critical) | warn / critical |
| `permits-large-crowd` | community event with more than 1,000 people | warn |
| `conflicting-venue` | both `indoor` and `outdoor` selected | warn |

Minimum spend per guest (INR). Other currencies are converted at fixed rates (USD 85, EUR 92,
GBP 108), so the engine stays offline:

| | Metro | Tier-2 | Small town |
|---|---:|---:|---:|
| Wedding | 2,500 | 1,800 | 1,200 |
| Birthday | 800 | 600 | 400 |
| Community | 400 | 300 | 200 |

## 5. Refinement and what-if

- **`applyPatch(input, patch)`:**
  - an absolute `budget` beats `budgetChangePercent`
  - the result is rounded and clamped to the input limits (−20% on 60,000 → exactly 48,000)
  - constraints are added and removed as sets; adding `outdoor` removes `indoor` and vice versa
  - priorities are replaced (unique, max 3)
  - the output always passes `EventInputSchema`
- **`recalculateBudget(input, { budget?, guestCount? })`:** budget only, for sliders. It
  clamps values to the input limits; 1,000 calls take under 200 ms in tests.
- **`timelineToIcs(timeline, title)`:** produces an RFC 5545 calendar with one all-day event per
  milestone. It uses CRLF line endings, escaped text and 75-octet line folding. UIDs are stable
  and `DTSTAMP` comes from the inputs, so the same plan always gives the same file.

## Tests

`shared/test/` covers:
- a sweep of every event type × city tier × guests {1, 40, 300, 5000} × budget {min, typical, max}
- edge cases: event today, leap day, Dec→Jan, IST after midnight
- every patch field, alone and combined
- `.ics` escaping and folding
- the slider benchmark

Run `npm run test:coverage -w @utsav/shared`.
