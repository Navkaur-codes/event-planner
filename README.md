# Utsav — Celebration & Event Planner

A GenAI-powered planning assistant that helps people organize **weddings, birthdays and community events** with **budgets, timelines, vendor checklists and personalized ideas**.

> **Status:** 🚧 v0.1 — scaffold ready: shared contracts, secure API skeleton, festive landing page, CI and deploy config. Planning engine, AI ideas and the planner UI arrive in v0.2. This README is updated at every milestone.
> **Live demo:** https://utsav-event-planner-1xh3.onrender.com · **Demo video:** _coming soon_

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

**Decisions based on user context**
- **Budget** is split by event type, then weighted toward the user's top-3 priorities, with a fixed 10% contingency. Amounts are rounded so lines always sum exactly to the total.
- **Timeline** is built backwards from the event date; if the date is close, milestones are compressed and the user is warned.
- **Vendor checklist** adapts to event type, guest count and constraints (e.g. Jain/halal catering, wheelchair access, eco-friendly decor, permits for large gatherings).
- **Warnings** flag unrealistic budgets per guest for the event type and city tier, very short lead times and conflicting choices.
- **AI ideas** must respect every dietary and accessibility constraint and are validated against a strict schema. The AI **never** sets prices or dates.
- **Refine** ("cut the budget by 20%", "make it eco-friendly") — the AI turns the request into a structured, validated change; the engine recomputes the plan.

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
| Groq API (free tier) | `openai/gpt-oss-120b` (primary), `openai/gpt-oss-20b` (fallback) | Generating personalized ideas for each plan; interpreting refinement requests into structured plan changes |

## Security
- The Groq API key lives only in server environment variables (local `.env`, Render dashboard); it is never sent to the browser, logged or committed.
- All inputs and AI outputs are validated with strict schemas; user text is length-limited and treated as data in prompts.
- Helmet security headers and CSP, rate limiting, small request-body limits, generic error messages.
- CI secret scan fails the build if a key-like value is ever committed.

## Accessibility
Semantic HTML, labelled form controls, full keyboard support, visible focus, `aria-live` status updates, charts with table alternatives, WCAG AA colour contrast, and all animation disabled for users who prefer reduced motion.

## Testing
Vitest unit tests for the engine (budget always sums to total, timeline ordering, checklist rules), API tests with the AI mocked (success, invalid output, timeout, rate limit → fallback), prompt-injection tests, and automated accessibility checks. CI runs lint, type-check, tests and build on every push.

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
npm run lint && npm run typecheck && npm test && npm run build && npm run secret-scan
```
Production: `npm run build && npm start` (requires `GROQ_API_KEY`; set `NODE_ENV=production`).

## Deploy (free)
Render reads `render.yaml`: one free web service, build `npm ci --include=dev && npm run build`, start `npm start`, health check `/api/health`. Set `GROQ_API_KEY` in the Render dashboard (it is never stored in the repo).

## Tech stack (all free)
TypeScript · React · Vite · GSAP · Node.js · Express · Zod · Groq API · Vitest · ESLint · Prettier · GitHub Actions · Render
