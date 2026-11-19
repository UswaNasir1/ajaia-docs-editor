# AI log

Running reject/change log for the Ajaia Docs take-home. Times are approximate session order (not wall-clock). Tool: **Cursor Agent** unless noted.

## Log

- [p1] Tool/model: Cursor Agent
- [p1] Prompt: Scaffold Next.js + auth + DB + seed → Result: App Router app, Drizzle schema, JWT cookie session, three demo users
- [p1] KEPT: libSQL (`file:` local / Turso-ready) instead of plain SQLite-only — needed for Vercel persistence
- [p1] VERIFIED: `npm run setup`, login as Alice/Bob/Carol

- [p2] Tool/model: Cursor Agent
- [p2] Prompt: Documents + TipTap editor → Result: CRUD, toolbar, autosave, `getAccess`
- [p2] REJECTED/CHANGED: StarterKit **plus** separate Underline extension → TipTap v3 StarterKit already includes Underline; double-register breaks formatting. Kept StarterKit only + `immediatelyRender: false`
- [p2] KEPT: no-access → **404**, insufficient role → **403** (project rule; not 403 for missing docs)
- [p2] VERIFIED: `npm run check`; edit + refresh persistence

- [p3] Tool/model: Cursor Agent
- [p3] Prompt: Sharing + owned/shared dashboard → Result: share API, badges, polling
- [p3] REJECTED/CHANGED: Assumed owned/shared SQL was wrong when lists “flipped” → root cause was **shared session cookie across tabs/profiles**. Added session-change guard + request sequencing; did not rewrite the list query as the primary fix
- [p3] VERIFIED: Alice Shared shows Bob’s checklist; Bob viewer/editor roles; two-profile check

- [p3] Tool/model: Cursor Agent / browser console
- [p3] REJECTED/CHANGED: Treated hydration errors as app bug first → `bis_*` attrs were **Bitdefender**; `suppressHydrationWarning` on `html`/`body` only
- [p3] VERIFIED: Console clean of app-owned attr mismatches on shell

- [p4] Tool/model: Cursor Agent
- [p4] Prompt: File import txt/md/docx → Result: multipart import → new owned doc
- [p4] REJECTED/CHANGED: `export const runtime = "nodejs"` on import route → incompatible with `cacheComponents`. Removed segment runtime; import still works
- [p4] VERIFIED: `import.test.ts`; manual 415 (pdf) / 413 (>2 MB txt)

- [p5] Tool/model: Cursor Agent
- [p5] Prompt: Harden errors, auth, save UX → Result: consistent error JSON, zod messages, dummy password compare, flush-on-leave
- [p5] REJECTED/CHANGED: Unused deps + dead `session-sync` → removed
- [p5] VERIFIED: `npm run check`; conflict 409 path in services tests

- [ui] Tool/model: Cursor Agent
- [ui] Prompt: Login + dashboard/editor restyle (STYLING-ONLY) → Result: Inter tokens, Logo/Avatar/RoleBadge/AppHeader
- [ui] REJECTED/CHANGED: Circular `--font-sans` / SaveStatusPill eslint issues → bind Inter correctly; inline save pill + CSS `is-readonly`
- [ui] VERIFIED: `npm run check` + `npm run build`

- [qa/p7] Tool/model: Cursor Agent
- [qa/p7] REJECTED/CHANGED: Remaining Next hydration overlay blamed on login → real bug was **`formatRelativeTime` using `Date.now()` during SSR**. Client-only `RelativeTime`; login shell → Server Component
- [qa/p7] REJECTED/CHANGED: `.gitignore` ignored all `/docs/` → graders need ARCHITECTURE + AI notes. Now ignore only `docs/CURSOR_PLAN.md`
- [qa/p7] KEPT: Refuse `file:` `DATABASE_URL` when `VERCEL` is set
- [qa/p7] VERIFIED: Full QA script (Alice/Bob/Carol, import, share, conflict, 401); dashboard loads with no issues badge; `npm run check` 21 tests

- [docs] Tool/model: Cursor Agent
- [docs] Prompt: Submission pack → Result: README, ARCHITECTURE, SUBMISSION, AI_WORKFLOW, VIDEO_SCRIPT
- [docs] VERIFIED: Claims cross-checked against seed, schema, services, and QA results (no invented live URL)
