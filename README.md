# Ajaia Docs

Lightweight collaborative document editor (take-home assignment).

## Local setup

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
| `DATABASE_URL` | Default `file:./data/local.db`. Use a Turso `libsql://` URL in production. |
| `DATABASE_AUTH_TOKEN` | Optional. Required for Turso; leave empty for local file DB. |
| `SESSION_SECRET` | Long random string for signing session JWTs. |

### Demo accounts

Password for all: `demo1234`

- `alice@ajaia.test` (Alice)
- `bob@ajaia.test` (Bob)
- `carol@ajaia.test` (Carol)

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run setup` | Run migrations + seed |
| `npm run db:migrate` | Apply Drizzle migrations (local file or Turso) |
| `npm run db:seed` | Idempotent demo data seed |
| `npm run check` | typecheck + lint + test |
| `npm run test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` / `start` | Production build and server |

## Near-real-time updates

Document lists and open-document access refresh via short polling (about every 15 seconds while the tab is visible) and when the tab regains focus — not websockets. A plain browser refresh also shows newly shared docs. True real-time co-editing / presence is intentionally out of scope.

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui, TipTap, libSQL + Drizzle, zod, bcryptjs + jose, sanitize-html.
