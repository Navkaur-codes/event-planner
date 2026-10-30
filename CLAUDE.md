# CLAUDE.md: Utsav — Celebration & Event Planner (permanent rules)

> Loaded on **every prompt** in this project. These rules do **not** change between phases.
> Phase-specific instructions live in `D:/event-planner/docs/claude-progressive.md`; full plan in `D:/event-planner/docs/PLAN.md`. The `docs/` folder is **local only** (gitignored) — see §2.7a.

## 1. Mission
- Build a GenAI-powered planning assistant that helps people organize **weddings, birthdays and community events** with **budgets, timelines, vendor checklists and personalized ideas**.
- **Core idea:** a deterministic planning engine does the money/date/checklist math correctly and instantly; Groq's LLM layers *personalized* ideas and natural-language refinements on top. The plan is always numerically sound, works even when the AI is down, and adapts to who the user is.
- **Submission:** public GitHub repo (< 10 MB, **one branch only**), Render deployed link, demo video, GenAI-services description, LinkedIn post. Max 3 attempts.
- **Judged by an AI evaluator on:** Code Quality (High) · Problem-Statement Alignment (High) · Security (Medium) · Efficiency (Medium) · Testing (Low) · Accessibility (Low).

## 2. Non-negotiables (never break, never "temporarily" skip)
1. **Free software and services only.** No paid APIs, no card-required services.
2. **Secrets never leave the server.**
   - `GROQ_API_KEY` lives only in local `.env` (gitignored) and in Render's Environment settings.
   - Never in code, docs, tests, fixtures, `render.yaml`, commit messages, screenshots, chat or logs.
   - Only `server/src/config.ts` reads `process.env`; the web app never calls Groq and no `VITE_*` variable holds a secret.
   - `.env.example` holds **names only**. Verify keys by printing booleans/lengths only, never values.
   - If you ever see a key value, stop and tell the user to rotate it.
3. **The LLM never decides numbers or dates.** Budget, timeline and checklist come from the engine. AI output is Zod-validated; on any failure a deterministic fallback is returned and flagged `aiStatus: "fallback"`.
4. **All input is validated** with the shared Zod schemas at the API boundary; user free text is length-capped and passed to the LLM as quoted data, never as instructions.
5. **Stay within your session's owned paths** (§4). Shared contracts change only through Main.
6. **The user does all commits, pushes and merges — every push to GitHub is done by the user personally.** Claude never runs `git push`, `git remote add/set-url`, `gh repo create` or any GitHub write; it only prints the commands in a 📌 checkpoint. Claude never runs `git add/commit/push/merge/rebase` or destructive git (`reset`, `checkout --`, `restore`, `stash`, `clean`, branch delete). Read-only git is fine. Claude raises a 📌 COMMIT CHECKPOINT (§5a) and waits.
7. **Only `main` is ever pushed to GitHub.** Feature branches stay local (worktrees) and are deleted after the final merge.
7a. **What goes to GitHub — and nothing else:** `CLAUDE.md`, `README.md`, and the application code/config needed to build, test and deploy (`shared/`, `server/`, `web/`, root `package.json`/lockfile/tsconfig/lint configs, `.gitignore`, `.env.example`, `render.yaml`, `.github/workflows/`, `LICENSE`).
   **Never pushed (gitignored):** `docs/` (all control docs, plans, prompts, contexts, progress), `.claude/`, `.env*` except `.env.example`, `node_modules/`, `dist/`, `coverage/`, logs, local scratch files, recordings/screenshots.
   **Never add with `git add .` or `git add -A`** — checkpoints list explicit paths only. Before every push Main runs `git status` + `npm run secret-scan` and checks no `docs/` path is staged.
7b. **Docs live only in Main's folder** `D:\event-planner\docs\` (untracked, so worktrees don't have them). Every session reads and appends to those files by **absolute path**, append-only, re-reading the file right before each edit.
8. **Accessibility is not optional:** labelled controls, keyboard flow, visible focus, AA contrast, `prefers-reduced-motion` respected.

## 3. Architecture (one screen)
npm workspaces, one repo, one Render web service, same-origin:
```
shared/  @utsav/shared  Zod contracts (Main) + planning engine (Session A) — used by server AND web
server/  @utsav/server  Express API /api/health · /api/plan · /api/refine; ai/ = Groq client, prompts, fallback, cache
web/     @utsav/web     Vite + React + TS: wizard → plan dashboard → refine → track/export (localStorage)
```
Request flow: `web` → `POST /api/plan` → validate → `engine.buildPlan()` → `ai.generateIdeas()` (or fallback) → `PlanResponse`.
Server serves `web/dist` statically in production.

## 4. Ownership map (parallel sessions; each in its own worktree/branch)
| Session | Branch | Folder | Owns (may edit) |
|---|---|---|---|
| Main / Integrator | `main` | `D:\event-planner` | `CLAUDE.md`, `docs/**`, `README.md`, root configs (`package.json`, `tsconfig*.json`, ESLint/Prettier, `.gitignore`, `.env.example`, `render.yaml`, `.github/**`, `scripts/**`), `shared/src/{contracts,index}.ts` (+ `contracts.test.ts`), each workspace's `tsconfig*.json`/`vitest.config.ts`, `server/src/{index,app,config,ports,logger}.ts` (+ their tests), `server/src/middleware/**` |
| A: Planning Engine | `feat/engine` | `D:\event-planner-A` | `shared/src/engine/**`, `shared/test/**` |
| B: GenAI Layer + API routes | `feat/ai` | `D:\event-planner-B` | `server/src/ai/**`, `server/src/routes/**`, `server/test/**` |
| C: Frontend | `feat/web` | `D:\event-planner-C` | `web/**` |

**Boundary rules:**
- Cross-session code is reached only through the published functions in `D:/event-planner/docs/contracts.md §3`. Step 0 ships a **deterministic stub** at each of those paths; the owning session replaces the stub in place and flips its `IMPLEMENTATION` constant from `"stub"` to `"real"`.
- Need a contract change? Stop, add it under "Contract change requests" in `D:/event-planner/docs/sessions.md`, and tell the user.
- `D:/event-planner/docs/progress.md` and `D:/event-planner/docs/sessions.md` may be **appended to** by every session (only your own row / new entries) — they are local files, never committed.
- New dependencies: add them only to your own workspace's `package.json` and mention them in your checkpoint.

## 5. Workflow
- Before coding a phase, read (absolute paths — docs are not in git) `D:/event-planner/docs/claude-progressive.md`, your `D:/event-planner/docs/context/context-*.md` and `D:/event-planner/docs/detective.md`.
- Before every checkpoint run, from the worktree root: `npm run lint`, `npm run typecheck`, `npm test -w <your workspace>`.
- **End of each phase:** append to `D:/event-planner/docs/progress.md` and update your row in `D:/event-planner/docs/sessions.md` (local only, never committed).
- Dates: use the `today` argument / `now()` helper, never `new Date()` scattered in logic, so tests and demos are deterministic.
- Ask, don't guess, when an ambiguity changes the design.
- Main keeps `README.md` and `docs/claude-progressive.md` updated **side by side** at every gate.

## 5a. 📌 Commit checkpoint protocol
A checkpoint is due when a task is finished and green, before a refactor of working files, at the end of a phase or session, or after ~45 minutes without one.
1. Run lint, typecheck and tests, then `git status`.
2. Print:
```
📌 COMMIT CHECKPOINT — <what is finalised, 1 line>
Tests: <command> → <result>
Folder: <absolute path of this worktree>
Branch: <branch>
Files:  <changed paths>
Run (from the repo root of that folder):
  git add <paths>
  git commit -m "<type(scope): message>"
  git push origin main          ← Main on `main` only
Push: <"included above" (Main) | "not pushed — reaches GitHub when Main merges it at GATE-N" (A/B/C)>
Reply "committed" (or "pushed") when done — I won't touch these files until then.
```
**Every session always gives the user the exact, copy-paste commands** (one per line, explicit paths, run-from folder named). The user runs them and pushes personally. Feature branches are **never pushed**; their work is pushed by the user from `main` after Main's gate merge, and Main's gate checkpoint prints that push command.
3. Wait for "committed" (or "skip", noted in progress.md).

**Finalised work is protected:** never rewrite or revert committed work without saying "this changes X from commit Y because…" and getting a yes. Targeted edits only; don't reformat finished files.

## 6. 🕵️ Detective protocol
Before any new feature or scope change, compare it against `D:/event-planner/docs/detective.md`. On a match, stop and reply:
```
⚠️ DETECTIVE — <trap id + name>
Request: … · Risk: … · Instead: … · Proceed anyway? (yes / use alternative)
```
Raise it yourself after the feature freeze, for edits outside your paths, and for anything that weakens a non-negotiable. Log overrides in progress.md.

## 7. Design rules ("Mela" — joyful, festive)
- **Tokens** (CSS custom properties in `web/src/styles/tokens.css`):
  `--paper #FFF6E9` · `--ink #2B1B3D` · `--marigold #FFB627` · `--rani #E5446D` (wedding) · `--mint #3DCCC7` (birthday) · `--peacock #1B6F8C` (community) · `--sindoor #F25C2A` (warnings) · `--lilac-tint #EADCF8`.
  `--accent` switches with the event type and re-themes the UI. Dark ink on bright fills; never white text on marigold/mint. Every pair WCAG AA.
- **Type:** Fraunces (display) + Nunito (body), Google Fonts, 2 weights each, `font-display: swap`.
- **Signature elements:** confetti-paper texture, scalloped bunting section edges, sticker-style cards with a slight tilt, hand-drawn underline accents.
- **Motion (GSAP, only where it carries meaning):** wizard step transitions · plan reveal (bars grow, timeline staggers) · confetti on first plan and checklist 100% · budget count-up on what-if change. Always inside `gsap.matchMedia()` with a reduced-motion branch; never blocks input; lazy-loaded with the dashboard.
- **Banned:** default Tailwind/Bootstrap palettes, purple-blue "AI" gradients, glassmorphism, grey corporate dashboards, emoji spam, chatbot-only UI, animation on every element, pie/donut/3D charts, colour-only status.

## 8. Stack, commands, env names
- **Stack:** TypeScript (strict) · Node 24 · Express · Zod · helmet · express-rate-limit · compression · Groq SDK (`groq-sdk`) · Vite + React 18 · GSAP · Vitest · Supertest · React Testing Library · jest-axe · ESLint + Prettier · GitHub Actions.
- **Commands (repo root):** `npm install` · `npm run dev` (server + web) · `npm run build` · `npm start` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run secret-scan`.
- **Env var names:** `GROQ_API_KEY` (secret) · `GROQ_MODEL` · `GROQ_FALLBACK_MODEL` · `PORT` · `NODE_ENV` · `RATE_LIMIT_PER_MIN` · `AI_TIMEOUT_MS`.
- **Hosting:** Render free web service from `render.yaml` (`GROQ_API_KEY` set with `sync: false` in the dashboard).

## 9. Code conventions
- Types come from `@utsav/shared` contracts across every boundary; no `any`, no duplicated types.
- Pure functions for logic (engine); side effects only in server routes/ai and web hooks.
- Small single-purpose modules; named exports; JSDoc on every exported function.
- Errors to clients are generic (`{ error: { code, message } }`); details go to the server log with secrets redacted.
- Never log secrets or personal data; keep comments rare and explain *why*.
- Tests sit next to their workspace (`*/test/**` or `*.test.ts(x)`), deterministic, no network (Groq is always mocked).

## 10. Phase-specific instructions
Read `D:/event-planner/docs/claude-progressive.md` at the start of every task (local file, not in git). In the Main folder it is also imported:
@docs/claude-progressive.md
