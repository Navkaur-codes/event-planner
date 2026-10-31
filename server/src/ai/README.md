# GenAI layer (`server/src/ai`)

Utsav uses one GenAI service: **Groq** (free tier) through the official `groq-sdk`, called only from the server. The model is `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as the fallback model. Both are set by `GROQ_MODEL` and `GROQ_FALLBACK_MODEL`.

The planning engine (`shared/src/engine`) computes every number and date: budget split, per-guest cost, timeline and checklist. The AI only writes text around that plan and turns a host's request into a structured, validated change.

## Where AI is used

| Feature | Endpoint | AI input | AI output |
|---|---|---|---|
| Personalized ideas | `POST /api/plan`, `POST /api/refine` | Event details + a short plan summary (per-guest budget, top categories by %, days to go) | `AiIdeas`: summary, 1–3 themes, decor, food, activities, vendor questions, personal touches |
| Refine in plain language | `POST /api/refine` | The host's message + current settings | `PlanPatch` (e.g. `budgetChangePercent: -20`, `addConstraints: ["eco_friendly"]`) + one-line explanation |

Ideas follow the city (regional food, crafts, music), the vibe, the traditions the host names (e.g. Anand Karaj, pheras) and the priorities. They are written in English or natural Hindi (Devanagari), whichever the host chose.

## Flow

```
input ──Zod──▶ engine.buildPlan ──▶ prompt ──▶ Groq (JSON mode) ──▶ parse + validate ──▶ response
                  (numbers, dates)     │            │ 429 / 5xx / 404 / timeout /         │ invalid?
                                       │            │ truncated / unusable                │
                                       │            └──▶ fallback model (once) ───────────┤
                                       └── cache hit? ──▶ cached ideas                    └──▶ deterministic fallback
```

## Guardrails

- **The engine owns numbers and dates.** The ideas prompt forbids prices, costs and dates, and items that quote money (₹, Rs, lakh, रुपये…) are dropped. A refine patch may only contain a budget, percentage, guest count or date that appears in the host's own message; any other number is removed. `applyPatch` then clamps every value to the contract limits.
- **Validated output.** Every answer passes safe `JSON.parse` → HTML and control characters stripped → lists and strings trimmed to their limits → strict Zod schema (`AiIdeasSchema`, `PlanPatchSchema`). Nothing unvalidated reaches the client.
- **Always a result.** If the AI is down, rate-limited, slow or invalid, `/api/plan` and `/api/refine` still return `200` with `aiStatus: "fallback"`. Fallback ideas are deterministic templates in English and Hindi, varied by event type, vibe keywords and all 11 constraints, and every combination is tested against the schema. Refine falls back to a rule-based parser ("cut the budget by 20%", "add 30 guests", "make it vegan / eco-friendly", also in Hindi), and finally to an idea focus.
- **Prompt injection.** All rules live in the system prompt. User text (title, vibe, traditions, notes, refine message) is sent only as JSON inside a `<event_data>` / `<refine_data>` block, with `<` and `>` escaped so it cannot close the block. Answers that echo the prompt or a key-like string are rejected. Tests cover attacks in every free-text field.
- **Diet and access constraints** (vegetarian, vegan, Jain, halal, alcohol-free, eco-friendly, wheelchair, kids, elders, indoor/outdoor) are stated as hard rules in the system prompt. The fallback content follows them too.
- **Efficiency.**
  - JSON mode, low reasoning effort on gpt-oss, and a 2,000-token cap (800 for refine).
  - `finish_reason: "length"` is detected and retried.
  - One overall time budget: `AI_TIMEOUT_MS`, default 15 s, split 60/40 between the two models.
  - The Groq call is cancelled if the browser disconnects.
  - An in-memory LRU cache (200 entries, 1 h, sha256 key of model + prompts) means an identical request is never paid for twice.
  - Per-IP rate limiting on `/api` protects the free quota of 8,000 tokens per minute.
- **Secrets and logging.** The key is read once from `config.ts` and only on the server. The browser never calls Groq, and no `VITE_*` variable holds it. Logs record only status, failure reason, model, latency, cache hit and patch field names — never prompts, user text or keys — and the logger redacts `gsk_…` patterns.

## Files

| File | Responsibility |
|---|---|
| `index.ts` | Public API (`generateIdeas`, `interpretRefinement`, `fallbackIdeas`): cache → Groq → validate → fallback; safe logging |
| `groqClient.ts` | `groq-sdk` wrapper: JSON mode, time budget, model fallback, truncation detection |
| `prompts.ts` | System rules and data-block user prompts for ideas and refine |
| `parse.ts`, `parsePatch.ts` | Cleaning, trimming, money/leak filters, Zod validation, stated-number check |
| `fallback.ts`, `fallbackContent/` | Deterministic ideas; content per language (`en.ts`, `hi.ts`) |
| `refineParser.ts` | Rule-based refine interpreter (English and Hindi) |
| `cache.ts` | LRU + TTL cache |

Tests (`server/test/**`) always mock Groq, so CI needs no key.
