# Ajaia Docs

Lightweight collaborative document editor for a take-home assignment.
Sign in with seeded demo users, create or import rich-text documents, autosave edits, and share with viewer/editor roles.
Dashboard splits **Owned by me** and **Shared with me**.

**Live URL:** https://ajaia-docs-editor-76es069p5-uswa13.vercel.app/

## Demo accounts

Password for all: `demo1234`

| Email | Name | Seeded role in the demo scenario |
|---|---|---|
| `alice@ajaia.test` | Alice | Owns **Welcome to Ajaia Docs** (Bob = editor, Carol = viewer) and **Alice private notes** (unshared). Editor on Bob’s checklist. |
| `bob@ajaia.test` | Bob | Owns **Bob's launch checklist** (shared with Alice as editor). Editor on Welcome. |
| `carol@ajaia.test` | Carol | Viewer on Welcome. |

## Local setup

Requires **Node.js 20+** (developed on Node 24).

```bash
cp .env.example .env
npm install
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Description |
|---|---|
| `DATABASE_URL` | Default `file:./data/local.db`. Use a Turso `libsql://…` URL in production. |
| `DATABASE_AUTH_TOKEN` | Required for Turso; leave empty for local file DB. |
| `SESSION_SECRET` | Long random string for signing session JWTs (`openssl rand -base64 32`). |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run setup` | Migrate + seed |
| `npm run db:migrate` | Apply Drizzle migrations (local file or Turso) |
| `npm run db:seed` | Idempotent demo data seed |
| `npm run check` | typecheck + lint + test |
| `npm run test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` / `start` | Production build and server |

## File import

Dashboard **Import file** accepts `.txt`, `.md`, and `.docx` up to **2 MB**.
Each upload becomes a new document you own; HTML is sanitized server-side before save.
Unsupported types → 415; oversized → 413.

## Tests

```bash
npm run check
```

Vitest uses an isolated temp libSQL DB per suite (`src/lib/test/db.ts`). Coverage includes access matrix / shares, version conflict (409), owned/shared list regression against seed titles, import converters + sanitizer, and fetch helpers.

## Deploy (Vercel + Turso)

Do **not** use `file:` on Vercel — serverless filesystem is ephemeral. Use Turso.

1. Create a Turso DB and token (`turso db create`, `turso db show --url`, `turso db tokens create`).
2. Migrate + seed against Turso from your machine:

```bash
DATABASE_URL="libsql://YOUR-DB.turso.io" DATABASE_AUTH_TOKEN="YOUR_TOKEN" npm run db:migrate
DATABASE_URL="libsql://YOUR-DB.turso.io" DATABASE_AUTH_TOKEN="YOUR_TOKEN" npm run db:seed
```

(PowerShell: set `$env:DATABASE_URL` / `$env:DATABASE_AUTH_TOKEN`, then run the same npm scripts.)

3. Import the GitHub repo into Vercel. Set Production env: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`.
4. Deploy, open the **production** URL in an incognito window, sign in with a demo account.

## Near-real-time updates

Lists and open-doc access refresh via short polling (~15s while visible) and on tab focus — not websockets. Refresh also shows newly shared docs. True co-editing / presence is out of scope.

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui, TipTap, libSQL + Drizzle, zod, bcryptjs + jose, sanitize-html, marked, mammoth, Vitest.

## Known limitations

- No real-time co-editing, presence, comments, version history, or attachments.
- No public link sharing / invite of non-registered users / email notifications / sign-up.
- No folders, search, offline mode, or Markdown/PDF export.
- Preview/production URLs can rotate; prefer the stable Vercel production domain if Deployment Protection blocks preview links.
