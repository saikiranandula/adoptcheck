# AdoptCheck

Open-source repo due diligence before you install, fork, or ship.

AdoptCheck is a deterministic-first scanner for public GitHub repositories. Paste a repo URL or `owner/repo` and get an evidence-backed verdict: `Use`, `Fork`, `Watch`, or `Avoid`.

## MVP Scope

- Public GitHub repositories only
- GitHub API metadata, README, root files, releases, CI, license, and security policy checks
- Evidence ledger with IDs, sources, confidence, and observations
- JSON and Markdown report output
- Optional evidence-grounded LLM analyst when `OPENROUTER_API_KEY` is configured
- No private repo support, database persistence, cloning, installs, builds, or arbitrary repo execution

## Local Development

```bash
npm install
npm run dev
```

AdoptCheck runs fully in deterministic mode with **no configuration** — the scanner is the source of truth and works without any API keys.

## Configuration

Copy `.env.example` to `.env.local` and fill in the values you need. `.env.local` is gitignored and loaded automatically by `next dev` / `next build`.

```bash
cp .env.example .env.local
```

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | No | — | Enables the optional analyst layer via [OpenRouter](https://openrouter.ai/keys). Without it the analyst is skipped. |
| `OPENROUTER_MODEL` | No | `openai/gpt-4o-mini` | Analyst model. Must be a valid OpenRouter model id that supports structured (`json_schema`) output. |
| `OPENROUTER_SITE_URL` | No | `https://adoptcheck.nullhype.tech` | Attribution metadata shown on your OpenRouter dashboard. |
| `OPENROUTER_APP_NAME` | No | `AdoptCheck` | Attribution metadata shown on your OpenRouter dashboard. |
| `GITHUB_TOKEN` | No | — | Raises the GitHub API rate limit from 60 to 5000 req/hour (public read scope is enough). |

The analyst layer never overrides the deterministic verdict, scores, or risks — it only interprets the supplied evidence. Secrets are never rendered in reports.

## Checks

```bash
npm test
npm run lint
npm run build
```
