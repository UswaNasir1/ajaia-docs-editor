# Architecture

## Stack and why

Next.js App Router + TypeScript keeps UI and API in one deployable unit on Vercel. TipTap gives real rich text with HTML in/out. libSQL (`@libsql/client`) + Drizzle uses a local `file:./data/local.db` in dev and Turso in prod — same driver, no ephemeral SQLite on serverless. Auth is seeded users, bcryptjs passwords, and a jose JWT in an httpOnly cookie. zod validates request bodies; `sanitize-html` strips unsafe markup on every write.

## Data model

- `users` — id, email (unique), name, password_hash
- `documents` — id, owner_id, title, content_html, version (int), timestamps
- `document_shares` — (document_id, user_id) PK, role `viewer` | `editor`

Business logic lives in `src/lib/services/*`; route handlers stay thin. Schemas in `src/lib/validation/*`.

## Access control

Single function `getAccess(userId, docId)` → `owner` | `editor` | `viewer` | `none` (`src/lib/services/access.ts`). Every document/share route uses it.

- No access → **404** (does not leak that a doc exists)
- Known doc, insufficient role → **403**

Helpers: `canRead` / `canEdit` / `canManageShares` / `canDelete`.

## Content storage

Body is stored as sanitized HTML in `documents.content_html`. Fits TipTap and import converters (txt → paragraphs, md via marked, docx via mammoth) without a second document model. Tradeoff: HTML is looser than a structured JSON schema; allowlisting tags and sanitizing on every write is the mitigation. Cap: ~1 MB content after sanitize.

## Concurrency

Each document has an integer `version`. PATCH requires `baseVersion`; mismatch → **409**. The editor shows a conflict path instead of silently overwriting when two editors save.

## Import + sanitization

`POST /api/documents/import` accepts multipart `.txt` / `.md` / `.docx` (max 2 MB). Convert → `sanitizeContentHtml` → create owned document. Scripts/`onerror`/disallowed tags are stripped (`src/lib/sanitize.ts`).

## Prioritized

End-to-end slice first: auth → owned/shared lists → create/rename/edit/autosave → share with roles → import → tests + consistent API errors. Reviewers can exercise the product without optional surface area.

## Deliberately cut

Real-time CRDT/presence, comments, version history, attachments/blob storage, link invites for non-users, email, sign-up/reset, folders/search, offline, export. Polling (~15s) approximates list freshness without websockets.
