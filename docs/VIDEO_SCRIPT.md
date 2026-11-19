# Speakable walkthrough (~4 minutes)

Read this out loud while you click. Short lines = natural pace.

**Setup before record:** live site + README tab; Alice window + Bob window (incognito); `sample.md`, `sample.docx`, a tiny `.pdf` ready.

**Live URL:** https://ajaia-docs-editor-76es069p5-uswa13.vercel.app/

---

## OPEN · ~0:20

Okay — I’m opening the live app now.

This is Ajaia Docs — a small collaborative document editor I built for this take-home.

Here’s the URL in the address bar. Demo accounts are right on the login screen — Alice, Bob, Carol — password for all is demo1234. Same list is in the README.

Quick scope note: I shipped a focused vertical slice — edit, import, share, and persist. Not a full Google Docs clone.

I’m going to sign in as Alice now.

---

## MAIN FLOW · ~0:20–1:30

Alright, I’m on the dashboard.

You can see Owned by me, and Shared with me. Bob’s checklist is already shared with me from the seed data.

I’m going to create a new document now.

Opening it… and I’m renaming the title to Walkthrough notes.

Now I’m going to type a bit… and apply formatting.

I’m hitting bold… italic… underline…

Now a heading… then a bullet list… and a numbered list.

Watch the save status — it should go Saving, then Saved. That’s autosave.

I’m going to hard-refresh the page now.

…and everything’s still here — title and formatting. That means it’s in the database as sanitized HTML, not just sitting in the browser.

---

## IMPORT · ~1:30–2:10

I’m going back to the dashboard.

Now I’m going to import a file.

The dialog says what we support — txt, markdown, and docx, up to two megabytes.

I’m uploading sample.md first…

…and that becomes a new document I own.

Now I’m importing a Word file — sample.docx…

Same thing — new editable doc.

I’m going to try a PDF on purpose, so you can see the error path…

Yeah — clear unsupported-type error. No silent fail.

---

## SHARING · ~2:10–3:10

I’m opening Walkthrough notes again.

Now I’m going to share it.

I’ll add bob@ajaia.test as a Viewer… and save that.

I’m switching to Bob’s browser now — signing in as Bob.

I’m opening Shared with me…

There’s the doc — Viewer badge.

I’m opening it… and you can see View only. I can’t edit the title, and the toolbar is gone.

Back to Alice.

I’m going to change Bob from Viewer to Editor…

Now back to Bob — I’m refreshing…

I can edit now. I’m typing a quick line as Bob…

Switch back to Alice, refresh… and Alice sees Bob’s edit.

So roles are enforced on the server, not only in the UI.

---

## DECISIONS · ~3:10–3:40

A few design calls while we’re here.

All permission checks go through one function — getAccess — owner, editor, viewer, or none.

If you have no access, we return 404 so we don’t leak that a doc exists. Wrong role is 403.

Content is stored as sanitized HTML — easy for TipTap and imports. Tradeoff is a looser schema, so we sanitize on every write.

Saves send a baseVersion. If it’s stale, you get a 409 and a conflict banner instead of silently overwriting.

*[Optional — two tabs, edit both:]* I’m opening a second tab on the same doc… editing here… and when this tab tries to save, you should see the conflict banner.

For hosting I used Turso with libSQL, because a SQLite file on Vercel doesn’t persist. The app refuses a file database when it’s on Vercel.

---

## CUTS + NEXT · ~3:40–4:05

What I deliberately cut: real-time co-editing, comments, version history, attachments, and inviting people who aren’t already users.

If I had two to four more hours, I’d harden this live deploy and seed, then either add Playwright smoke tests or a first pass at real-time with Yjs — not both.

---

## AI · ~4:05–4:30

I built this in Cursor with a project rules file and phased prompts — one slice at a time, then npm run check after each phase.

One concrete thing I rejected: the first TipTap draft registered Underline twice. In TipTap v3, StarterKit already includes Underline, so I removed the duplicate and set immediatelyRender to false for SSR.

I verified with Vitest — access, sharing, conflicts, import sanitization — plus the full QA script locally, and this live walkthrough.

That’s the slice. Thanks for watching.

---

## If you’re running long

Drop the optional conflict demo. Shorten “cuts + next” to one sentence. Don’t rush sharing — that’s the money shot.
