# AI workflow

## Tools
- **Claude Sonnet 5.5** was used to plan out this whole task, it helped make architectural decisions.
- **Cursor Agent** with `.cursor/rules/project.mdc` + phased prompts (scaffold → editor → sharing → import → hardening → UI → docs)
- **GitHub CLI** for branch PRs; **Vitest** / `npm run check` after each phase
- Browser + scripted API QA against the plan’s checklist
- Stack AI was constrained to: Next.js App Router, TipTap, libSQL/Drizzle, zod, jose/bcryptjs

## Where AI sped me up

I generally love to plan out with AI, it can help with amazing architectural decisions, for that purpose, I used Cluade Sonnet 5.5. I love to challenge its decisions and come up with a final solution together.

| Area | What AI drafted | Rough time saved |
|---|---|---|
| Scaffold / auth / seed | App shell, Drizzle schema, JWT cookie, demo seed | ~45–60 min |
| Editor + CRUD | TipTap wiring, autosave, routes → services | ~40–50 min |
| Sharing + lists | Share API, owned/shared UI, polling | ~30–40 min |
| Import + tests | txt/md/docx pipeline, Vitest fixtures | ~25–35 min |
| UI restyle + docs | Login/dashboard/editor chrome, README/ARCHITECTURE drafts | ~30–40 min |

Human time went to reading diffs, rejecting bad API choices, and QA - not typing boilerplate.

## What I changed or rejected

1. **TipTap Underline** - AI registered Underline twice; TipTap v3 StarterKit already includes it. Kept StarterKit + `immediatelyRender: false`.
2. **Import `runtime = "nodejs"`** - Broke `cacheComponents`. Removed; mammoth still runs.
3. **List “flip” bug** - AI-leaning fix was SQL; real cause was shared session cookies across profiles. Session-change handling instead.
4. **Hydration** - Extension `bis_*` first; later SSR `Date.now()` in relative timestamps. Client-only `RelativeTime` + login as Server Component.
5. **Prod SQLite** - Refused `file:` on Vercel; Turso/`libsql://` for deploy. Dropped unused deps during hardening.

## How I verified

- `npm run check` (typecheck, ESLint, Vitest): access matrix, shares, 409 conflict, list regression, import + sanitize
- Manual QA script: create/format/autosave, import 415/413, Alice→Bob viewer→editor, conflict banner, Carol 404, revoke, logout 401
- Read every phase diff before commit/PR
- Live URL: https://ajaia-docs-editor-76es069p5-uswa13.vercel.app/ - local QA done; confirm seed + flows in incognito on this deploy

## What I'd do differently

- Deploy Turso + Vercel skeleton by ~hour 1.5
- Assume anything with `Date.now()` / relative time is client-only from day one
