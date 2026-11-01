# Utsav — Celebration & Event Planner

A GenAI-powered planning assistant that helps people organize **weddings, birthdays and community events** with **budgets, timelines, vendor checklists and personalized ideas**.

> **Status:** ✅ v1.0 — complete and live: plan → refine in plain words → what-if → track → export. AI ideas in English or Hindi. 487 automated tests in CI.
> **Live demo:** https://utsav-event-planner-1xh3.onrender.com

---

## Chosen vertical
**Celebration & Event Planner** — a smart, dynamic assistant for the person organizing a celebration: a family planning a wedding, a parent planning a child's birthday, or a volunteer running a community festival.

## The problem
Planning an event means juggling money, dates, vendors and ideas at once. Generic AI chat gives inspiring text but unreliable numbers; spreadsheets give numbers but no ideas. Organizers need a plan that is **correct**, **personal**, and **easy to adjust**.

## Who it is for
- **Families planning a wedding** — many ceremonies, hundreds of guests, a large budget and traditions to respect.
- **Parents planning a child's birthday** — a small budget, a theme, kid-friendly food and activities, little time.
- **Volunteers running a community event** — festivals, fundraisers and meet-ups with crowds, permits, logistics and accessibility needs.

Most of them are not professional planners, often plan in India (INR by default, Indian city tiers and traditions), and may prefer Hindi for ideas.

## Approach and logic
Utsav splits the work between two layers so each does what it is best at:

| Layer | Responsibility | Why |
|---|---|---|
| **Planning engine** (deterministic TypeScript) | Budget allocation, timeline, vendor checklist, warnings | Money and dates must always add up — the engine is pure, tested and instant |
| **GenAI layer** (Groq, GPT-OSS 120B) | Personalized theme concepts, decor/food/activity ideas, vendor questions, natural-language refinements | Creativity and understanding free-text requests |

**Decisions based on user context** (full rule tables: [`shared/src/engine/README.md`](shared/src/engine/README.md))
- **Budget** is split by event type, then weighted toward the user's top-3 priorities, with a fixed 10% contingency. Amounts are rounded so lines always sum exactly to the total.
- **Timeline** is built backwards from the event date; if the date is close, milestones are compressed and the user is warned.
- **Vendor checklist** adapts to event type, guest count and constraints (e.g. Jain/halal catering, wheelchair access, eco-friendly decor, permits for large gatherings).
- **Warnings** flag unrealistic budgets per guest for the event type and city tier, very short lead times and conflicting choices.
- **AI ideas** must respect every dietary and accessibility constraint and are validated against a strict schema. The AI **never** sets prices or dates.
- **Refine** ("cut the budget by 20%", "make it eco-friendly") — the AI turns the request into a structured, validated change; the engine recomputes the plan.

### How it addresses the challenge
| Challenge asks for | Utsav feature | Where in the code |
|---|---|---|
| Weddings, birthdays **and** community events | Each type has its own budget split, milestone template, vendor rules and theme | `shared/src/engine/rules/*` |
| **Budgets** | Priority-weighted split, 10% contingency, exact rounding, per-guest cost, what-if sliders, actual-vs-planned tracker | `engine/budget.ts`, `web/src/features/plan/{BudgetPanel,WhatIfPanel}.tsx`, `web/src/features/track/SpendTracker.tsx` |
| **Timelines** | Milestones counted back from the event date, compressed with a warning when it is close; calendar (.ics) export | `engine/timeline.ts`, `engine/ics.ts` |
| **Vendor checklists** | Vendors and tasks chosen by type, size and needs (Jain/halal/vegan caterer checks, wheelchair access, permits, rentals) | `engine/checklist.ts`, `rules/vendors.ts` |
| **Personalized ideas** | GenAI themes, decor, food, activities, personal touches and vendor questions for the city, vibe and traditions, in English or Hindi | `server/src/ai/*` |
| **Logical decisions from user context** | Rules as data; warnings for low per-guest budget, short notice, large crowds, conflicting choices | `engine/warnings.ts`, `rules/thresholds.ts` |
| **Dynamic assistant** | Plain-language refine ("cut the budget by 20%", "more money for photography", "move it to Delhi", "ideas in Hindi") → validated change → whole plan recalculated | `POST /api/refine`, `ai/refineParser.ts`, `engine/patch.ts` |
| **Real-world usability** | Saved in the browser, export/import, print, calendar, works when the AI is down, accessible, phone-friendly | `web/src/state/*`, `web/src/features/track/*` |

### Deliberate boundaries
- The AI **never** sets a price, a budget line or a date. Numbers and dates come only from the engine (or from numbers the host typed in a refine request).
- Utsav suggests vendor **types** and questions to ask — never named businesses or quotes it cannot verify.
- No accounts and no server database: plans stay on the visitor's device.
- Budget splits and per-guest thresholds are planning defaults, not market prices.

## Try it in 2 minutes
1. Open the live demo and pick **Weddings**, **Birthdays** or **Community events**.
2. Fill the 4 short steps — basics, budget and top priorities, style (vibe, traditions, language), needs (dietary, accessibility, eco-friendly…).
3. Press **Make my plan** and get:
   - **Budget** split by category; your priorities get a bigger share, every line adds up exactly, with a 10% contingency.
   - **Timeline** counted back from the big day, compressed (with a warning) if the date is close.
   - **Vendor checklist** that changes with your needs (e.g. Jain/halal caterer checks, wheelchair access, permits for large crowds).
   - **Ideas for you** — themes, decor, food, activities, personal touches and questions to ask vendors, written by the AI for your city, vibe and traditions.
4. **Refine it in plain words** — type or tap a suggestion: "Cut budget 20%", "Make it eco-friendly", "Add 20 guests", "More money for photography", "Move it to Delhi", "Give me ideas in Hindi". The AI turns your words into a structured change; the engine recalculates everything and highlights what changed.
5. **Try what-ifs** — drag the guest and budget sliders to preview the new split instantly (computed in your browser, no AI call), then apply the change with refine.
6. **Track and share** — enter what you actually spent per category (over-budget lines are flagged), tick off checklist items (confetti at 100%), add the timeline to your calendar (.ics), export the plan as a file, import it on another device, or print a clean one-page copy.
7. **Come back any time** — the site opens on the main page with a **Your plans** list: every plan made in this browser (up to 10, newest first) with **Open** and **Delete** (asks first, inline). Editing a plan updates it instead of making a copy.

## How it works
```
Wizard (event type, date, city, guests, budget, vibe, priorities, constraints)
   │  POST /api/plan  (validated with shared Zod schemas)
   ▼
Planning engine ──► budget · timeline · checklist · warnings
   │
   ▼
Groq LLM ──► personalized ideas (JSON, schema-validated)
   │            └─ on timeout / rate limit / invalid output → curated fallback ideas
   ▼
Plan dashboard ──► refine · track actual spend · tick checklist · export (JSON / print / calendar)
```
- **Frontend:** Vite + React + TypeScript with a joyful, festive design ("Mela") and meaningful GSAP motion.
- **Backend:** Node + Express + TypeScript, one service serving both API and web app.
- **Storage:** none on the server — plans stay in the user's browser (localStorage) with JSON export/import.

## GenAI usage
| Service | Model | Where it is used |
|---|---|---|
| Groq API (free tier) | `openai/gpt-oss-120b` (primary), `openai/gpt-oss-20b` (automatic fallback) | **Personalized ideas** after every plan and refine (`POST /api/plan`, `/api/refine`); **plain-language refine** — turns "cut the budget by 20%" into a validated `PlanPatch` (`POST /api/refine`) |

- The AI writes ideas that follow the city, vibe, traditions and every dietary/accessibility constraint — in English or Hindi.
- Guardrails: the engine owns every number and date; JSON mode + strict Zod validation; truncation detection and model fallback; prompt-injection handling; in-memory cache; per-IP rate limits; a deterministic fallback so the app always works.
- Details: [`server/src/ai/README.md`](server/src/ai/README.md).

## API
All endpoints are same-origin JSON, validated with the shared Zod contracts (`shared/src/contracts.ts`); unknown fields are rejected.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/api/health` | — | `{ status, version, ports: { engine, ai }, aiConfigured }` |
| `POST` | `/api/plan` | `PlanRequest` — event details + optional `clientToday` | `PlanResponse` — `{ plan, ideas, aiStatus }` |
| `POST` | `/api/refine` | `{ input, message, clientToday? }` | `RefineResponse` — `{ patch, explanation, result }` |

Errors use one shape: `{ error: { code, message, issues? } }` with `400` (validation), `404`, `413` (body > 10 kB), `429` (rate limit) or a generic `500`. If the AI fails, plan and refine still return `200` with `aiStatus: "fallback"`.

## Security
- The Groq API key lives only in server environment variables (local `.env`, Render dashboard); it is never sent to the browser, logged or committed.
- All inputs and AI outputs are validated with strict schemas; user text is length-limited and treated as data in prompts.
- Helmet security headers and a same-origin CSP (no third-party scripts, styles or fonts); per-IP **and** global rate limits (the global cap protects the free AI quota even from many IPs); 10 kB request-body limit; `Cache-Control: no-store` on every API answer; a `Permissions-Policy` that turns off camera, microphone and location; generic error messages.
- CI secret scan fails the build if a key-like value is in any tracked file, in the built web app, or anywhere in the git history.
- Refine requests become a strict, schema-validated patch; injection attempts ("ignore previous instructions…") are refused, and this is tested.
- Plans use the visitor's local date, accepted only within one day of server time, so nobody can plan "in the past".
- Imported plan files are schema-validated; a tampered file is rejected without changing anything.

## Accessibility
- Semantic landmarks, a skip link, and native form controls with real `<label>`s; errors are tied to fields with `aria-describedby`.
- Full keyboard flow through the wizard, dashboard, refine box, sliders and tracker, with a visible focus ring.
- `aria-live` announcements for plan generation and refine results; budget bars come with an accessible table.
- Status is never colour-only (icons + text such as "▼ Down ₹4,505", "Over by ₹6,984").
- WCAG AA contrast on every text/background pair (measured values documented in `web/src/styles/tokens.css`).
- All GSAP motion runs inside `gsap.matchMedia()` and is off for `prefers-reduced-motion`; layouts work from 320 px.
- `aria-busy` on the wizard and refine box while a request is running.
- Windows High Contrast (`forced-colors`) support: focus, selected chips, the current step and budget bars switch to system colours.
- Automated `jest-axe` checks on every screen, including loading, error and refine-failure states; Hindi output for Hindi-speaking hosts.

## Testing
**487 automated tests** (Vitest), run in GitHub Actions on every push with **coverage thresholds that fail the build** if coverage drops, plus lint, format, type-check, build and secret scans.

| Area | Tests | What they prove |
|---|---|---|
| Engine (`shared`) | 214 · 100% lines | Every event type × city tier × guest size × budget: lines sum exactly to the total, one 10% contingency, timeline sorted within [today, event date], compression only when needed, checklist rules, refine maths, `.ics` (RFC 5545) output, speed of what-if recalculation |
| API + AI (`server`) | 174 · 94% lines | Groq always mocked: success, bad JSON, schema-invalid, truncation, timeout, 429 → fallback; cache; refine parser (English + Hindi); prompt injection in every free-text field; validation (400/413/404/429), security headers |
| Web (`web`) | 99 · 94% lines | Wizard validation and submit, dashboard, refine, tracker, import of tampered files, what-if sliders, local-date requests, `jest-axe` accessibility on every screen |

## Assumptions
- Plans stay in the visitor's own browser (up to 10, newest first, each schema-checked when loaded); no accounts are needed. To move a plan to another device, export and import it.
- Budgets are whole currency units; INR is the default, with USD/EUR/GBP supported via a simple static conversion for warnings.
- Budget splits and per-guest thresholds are reasonable planning defaults, not market quotes; the assistant suggests vendor *types* and questions, not specific businesses or prices.
- The free Groq tier may rate-limit; the app stays fully usable through the deterministic fallback.
- Hindi applies to the AI-written content (ideas and refine explanations, marked `lang="hi"` for screen readers); the interface labels, checklist and engine warnings are in English.
- Dates are planned from the visitor's local calendar day; the engine works in whole days, so time zones never shift a due date.

## Project structure
```
shared/   Zod contracts (single source of truth for every API shape) + deterministic planning engine
server/   Express API — config, security middleware, AI layer, routes; serves the built web app
web/      Vite + React app — the "Mela" festive design system
scripts/  secret-scan.mjs — blocks commits/builds that contain key-like values
```

## Run locally
Requires Node.js 22+ (24 recommended).
```bash
npm install
cp .env.example .env      # optional: add your own GROQ_API_KEY; without it the app uses curated fallback ideas
npm run dev               # API on http://localhost:3000, web app on http://localhost:5173
```
Quality checks:
```bash
npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run secret-scan
```
Production: `npm run build && npm start` (requires `GROQ_API_KEY`; set `NODE_ENV=production`).

## Deploy (free)
Render reads `render.yaml`: one free web service, build `npm ci --include=dev && npm run build`, start `npm start`, health check `/api/health`. Set `GROQ_API_KEY` in the Render dashboard (it is never stored in the repo).

## Efficiency
- The engine is pure and runs in the browser too, so what-if sliders recalculate instantly with no network call.
- First load is about 106 kB gzip: a long-cached library chunk plus about 12 kB of app code; the dashboard and GSAP are lazy-loaded and prefetched while the wizard is open; fonts are self-hosted Latin subsets.
- Saved plans are written only when something actually changes (a new plan, a tweak, a tick, a spend entry) and against the list already in memory — opening a plan never rewrites storage.
- The server compresses responses, caches hashed assets for a year, caches AI ideas (LRU + TTL), cancels AI calls when the visitor disconnects, and gives each request one AI time budget.

## Tech stack (all free)
TypeScript · React · Vite · GSAP · Fontsource (self-hosted fonts) · Node.js · Express · Helmet · Zod · Groq API · Vitest · Testing Library · jest-axe · ESLint · Prettier · GitHub Actions · Render

## How this maps to the evaluation criteria
| Criterion | Where to look |
|---|---|
| **Problem alignment** | "How it addresses the challenge" table above; the three event types in `shared/src/engine/rules/*`; personalized ideas and refine in `server/src/ai/*` |
| **Code quality** | Strict TypeScript (no `any`), one Zod contract shared by engine, API and web; small single-purpose modules; rules as data; dependency-injected AI service; pure engine; JSDoc and *why* comments; ESLint + Prettier in CI |
| **Security** | Key only on the server, log redaction, secret scans (files, bundle, full history); strict Zod validation; same-origin CSP, HSTS, Permissions-Policy; per-IP + global rate limits; prompt-injection handling with tests; `no-store` API answers |
| **Efficiency** | Engine runs in the browser for instant what-ifs; ~106 kB gzip first load with lazy dashboard/GSAP; AI cache, one time budget, cancel on disconnect; compression and immutable asset caching |
| **Testing** | 487 Vitest tests (engine 100% lines), Groq always mocked, injection and failure-mode tests, `jest-axe` on every screen, coverage thresholds that fail CI |
| **Accessibility** | Labels, keyboard flow, focus management, `aria-live`/`aria-busy`, icon + text status, AA contrast (documented), reduced motion, forced colours, `lang="hi"` for Hindi |

## Future work
Multiple saved events · a fully Hindi interface (not only AI content) · shared plans for a family or committee · vendor marketplace links · reminders before each milestone.

## License
[MIT](LICENSE)
