# AdoptCheck — build context (resume here)

Open-source GitHub repo due-diligence scanner. Paste `owner/repo` → evidence-backed verdict (`Use` / `Fork` / `Watch` / `Avoid`).

## Where it lives
- **Folder:** `~/adoptcheck`
- **Repo:** `nullhypeai/adoptcheck` (`origin`) + `saikiranandula/adoptcheck` (`fork`)
- **Vercel project:** `adoptcheck` (team `saikiranandulas-projects`) → **https://adoptcheck.nullhype.tech**
- Git auto-deploy from `nullhypeai/adoptcheck` `main` is connected. Manual: `vercel --prod --yes --scope saikiranandulas-projects`.

## Stack
Next.js 16 (App Router), **plain CSS — NO Tailwind** (`app/globals.css`, CSS vars), TypeScript, Vitest. Deps: `@supabase/ssr` + `@supabase/supabase-js`, `dodopayments`, `standardwebhooks`, `nanoid`, `zod`, `lucide-react` (v1.x — limited icon set; `Github` icon doesn't exist).

## Architecture
- **Scanner (deterministic, source of truth):** `lib/github.ts`, `lib/report.ts`, `lib/types.ts`.
- **AI analyst (optional):** `lib/llm.ts` → OpenRouter, strict json_schema, **`models[]` fallback chain** (`openai/gpt-4o-mini` → `openai/gpt-4.1-mini`); override primary via `OPENROUTER_MODEL`. Fails to "deterministic only" if absent.
- **Metering (hybrid):**
  - Free = 3 checks per anonymous device. `lib/session.ts` (`ac_sid` httpOnly cookie) + `adoptcheck_sessions` table (`free_used`).
  - Paid = requires login; credits per account in `adoptcheck_credits` (FK `auth.users`). `lib/usage.ts` gates: free first, then account credit. **Fails open** if Supabase env absent.
- **Auth:** Supabase OAuth (GitHub + Google), ported from HypeCheck. `lib/supabase/{server,client}.ts`, `lib/auth.ts`, `app/auth/{sign-in,callback,sign-out}/route.ts`, `app/login/page.tsx`, `proxy.ts` (session refresh middleware).
- **Payments:** Dodo one-time. `app/api/payments/checkout/route.ts` (401 if not logged in; `adoptcheck_user_id` in metadata), `webhook/route.ts` (standardwebhooks-verified → `addCredits`). Paywall: `app/components/upgrade-prompt.tsx`.
- **History:** `lib/reports.ts` + `adoptcheck_reports` table. Saved on every signed-in scan. `app/history/page.tsx` (list), `app/r/[slug]/page.tsx` (public shareable view).
- **API routes:** `/api/scan` (gated, saves history, returns `historySlug`), `/api/usage`, `/api/payments/checkout`, `/api/payments/webhook`.
- **UI:** `app/components/scanner.tsx` (main, client).

## Env vars (names only; values in Vercel + gitignored `.env.local`)
`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`, `GITHUB_TOKEN` (optional), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADOPTCHECK_FREE_LIMIT` (=3), `DODO_SECRET_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_ENVIRONMENT` (=`live_mode`), `DODO_PRODUCT_ID_SINGLE`, `DODO_PRODUCT_ID_PACK`, `NEXT_PUBLIC_APP_URL`.

## Supabase (SHARED with HypeCheck, project ref `ejwpbauewggbfqdxvddl`)
Tables (DDL in `supabase/*.sql`): `adoptcheck_sessions`, `adoptcheck_credits`, `adoptcheck_reports` — all RLS-on, writes via service role. Auth redirect allowlist includes `https://adoptcheck.nullhype.tech/**`.

## Dodo (LIVE)
Products: `$2.99` = 1 credit, `$4.99` = 20 credits. Live webhook → `/api/payments/webhook`. Test-mode artifacts were cleaned up.

## Local dev / checks
```bash
npm install
npm run dev      # runs free/fail-open without Supabase/Dodo env
npm test         # vitest, 13 tests
npm run build
```
For full metering locally: add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (+ `ADOPTCHECK_FREE_LIMIT=3`) to `.env.local`.

## Gotchas
- Vercel CLI on this machine is old (51.x) and its env/domain commands are flaky → use the Vercel REST API (token at `~/Library/Application Support/com.vercel.cli/auth.json`, may be stale after a while) or the dashboard.
- No Tailwind — style with CSS classes in `globals.css` or inline styles.
- Supabase service-role key + Dodo keys appeared in a build chat → **rotation recommended**.

## Current state
Live: scanner, 3-free metering, login (GitHub/Google), Dodo live payments, history + shareable `/r/[slug]`, LLM fallback routing. 13/13 tests.

## Next ideas
Analytics (see Nullhype hub note), key rotation, deeper checks, rename the folder, PostHog funnel (scan → paywall → signin → purchase).
