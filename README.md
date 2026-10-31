# Utsav — Celebration & Event Planner

A GenAI-powered planning assistant that helps people organize **weddings, birthdays and community events** with **budgets, timelines, vendor checklists and personalized ideas**.

> **Status:** ✅ v1.0 — complete and live: plan → refine in plain words → what-if → track → export. English and Hindi. 435 automated tests in CI.
> **Live demo:** https://utsav-event-planner-1xh3.onrender.com · **Demo video:** _link added at submission_

---

## Chosen vertical
**Celebration & Event Planner** — a smart, dynamic assistant for the person organizing a celebration: a family planning a wedding, a parent planning a child's birthday, or a volunteer running a community festival.

## The problem
Planning an event means juggling money, dates, vendors and ideas at once. Generic AI chat gives inspiring text but unreliable numbers; spreadsheets give numbers but no ideas. Organizers need a plan that is **correct**, **personal**, and **easy to adjust**.

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

## Try it in 2 minutes
1. Open the live demo and pick **Weddings**, **Birthdays** or **Community events**.
2. Fill the 4 short steps — basics, budget and top priorities, style (vibe, traditions, language), needs (dietary, accessibility, eco-friendly…).
3. Press **Make my plan** and get:
   - **Budget** split by category; your priorities get a bigger share, every line adds up exactly, with a 10% contingency.
   - **Timeline** counted back from the big day, compressed (with a warning) if the date is close.
   - **Vendor checklist** that changes with your needs (e.g. Jain/halal caterer checks, wheelchair access, permits for large crowds).
   - **Ideas for you** — themes, decor, food, activities, personal touches and questions to ask vendors, written by the AI for your city, vibe and traditions.
4. **Refine it in plain words** — type or tap a suggestion: "Cut budget 20%", "Make it eco-friendly", "Add 20 guests", "Move it outdoors". The AI turns your words into a structured change; the engine recalculates everything and highlights what changed.
5. **Try what-ifs** — drag the guest and budget sliders to preview the new split instantly (computed in your browser, no AI call), then apply the change with refine.
6. **Track and share** — enter what you actually spent per category (over-budget lines are flagged), tick off checklist items (confetti at 100%), add the timeline to your calendar (.ics), export the plan as a file, import it on another device, or print a clean one-page copy.
7. Close the tab and come back — your plan is still there.

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

## Security
- The Groq API key lives only in server environment variables (local `.env`, Render dashboard); it is never sent to the browser, logged or committed.
- All inputs and AI outputs are validated with strict schemas; user text is length-limited and treated as data in prompts.
- Helmet security headers and CSP, rate limiting, small request-body limits, generic error messages.
- CI secret scan fails the build if a key-like value is ever committed.
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
- Automated `jest-axe` checks on every screen; Hindi output for Hindi-speaking hosts.

## Testing
**435 automated tests** (Vitest), run with coverage in GitHub Actions on every push, plus lint, format, type-check, build and a secret scan.

| Area | Tests | What they prove |
|---|---|---|
| Engine (`shared`) | 213 · 100% lines | Every event type × city tier × guest size × budget: lines sum exactly to the total, one 10% contingency, timeline sorted within [today, event date], compression only when needed, checklist rules, refine maths, `.ics` (RFC 5545) output, speed of what-if recalculation |
| API + AI (`server`) | 162 · 96% lines | Groq always mocked: success, bad JSON, schema-invalid, truncation, timeout, 429 → fallback; cache; refine parser (English + Hindi); prompt injection in every free-text field; validation (400/413/404/429), security headers |
| Web (`web`) | 60 · 92% lines | Wizard validation and submit, dashboard, refine, tracker, import of tampered files, what-if sliders, local-date requests, `jest-axe` accessibility on every screen |

## Assumptions
- Users plan one event at a time and keep their data in their own browser; no accounts are needed.
- Budgets are whole currency units; INR is the default, with USD/EUR/GBP supported via a simple static conversion for warnings.
- Budget splits and per-guest thresholds are reasonable planning defaults, not market quotes; the assistant suggests vendor *types* and questions, not specific businesses or prices.
- The free Groq tier may rate-limit; the app stays fully usable through the deterministic fallback.

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

## Tech stack (all free)
TypeScript · React · Vite · GSAP · Fontsource (self-hosted fonts) · Node.js · Express · Helmet · Zod · Groq API · Vitest · Testing Library · jest-axe · ESLint · Prettier · GitHub Actions · Render
