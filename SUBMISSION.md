# Submission

## Included

| Path | Notes |
|---|---|
| `src/` | App Router UI + API routes, TipTap editor, services, validation, tests |
| `drizzle/` | SQL migrations |
| `docs/ARCHITECTURE.md` | Architecture note |
| `docs/AI_WORKFLOW.md` | AI workflow note |
| `docs/AI_LOG.md` | Reject/change log backing the workflow note |
| `README.md` | Setup, accounts, scripts, deploy notes |
| `SUBMISSION.md` | This file |
| `VIDEO_URL.txt` | Walkthrough video link |
| `.env.example` | Env template (no secrets) |
| `package.json` / lockfile | Dependencies and scripts |

**Not included / do not ship:** `node_modules/`, `.next/`, `.env`, `data/*.db`, local secrets, `docs/CURSOR_PLAN.md` (internal plan).

## Live URL

https://ajaia-docs-editor-76es069p5-uswa13.vercel.app/

## Demo credentials

Password for all: `demo1234`

| Email | Role in seeded scenario |
|---|---|
| `alice@ajaia.test` | Owner of Welcome + private notes; editor on Bob’s checklist |
| `bob@ajaia.test` | Owner of checklist; editor on Welcome |
| `carol@ajaia.test` | Viewer on Welcome |

## Video

https://drive.google.com/file/d/18QruEqMq8zOKwF_OkX5Waduj09ZcoW68/view?usp=sharing

(Also in `VIDEO_URL.txt`.)

## Status

### Working

- Login / logout with seeded users; JWT session cookie
- Dashboard: Owned by me / Shared with me; create, rename, delete (owner)
- TipTap editor: bold, italic, underline, headings, lists; autosave + save status
- Sharing: viewer / editor; share dialog; recipient list + badges; viewers read-only
- Import: `.txt` / `.md` / `.docx` ≤ 2 MB → new owned doc; 413/415 errors
- Access via single `getAccess`; 404 vs 403; HTML sanitize on write; `baseVersion` → 409
- Vitest suite (`npm run check`); UI restyle (login / dashboard / editor)
- Live deploy URL + walkthrough video linked

### Incomplete or partial

- Screenshots folder may be empty until captured for Drive
- `docs/AI_LOG.md` / `AI_WORKFLOW.md` reconstructed at the end (not appended hour-by-hour while coding)
- No e2e (Playwright) in CI; no real-time co-editing
- Prefer stable Vercel **production** domain if this preview URL rotates or is protected

### Next 2–4 hours

1. Confirm production domain + seed in incognito
2. Capture `screenshots/` for Drive
3. Optional Playwright smoke or Markdown export
