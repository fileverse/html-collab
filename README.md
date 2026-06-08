# AI Feedback Loop

**Multiplayer comments for AI‑generated HTML.** Import an `.html` file, leave
feedback pinned to individual elements, share a password‑protected review link,
then export the file with all feedback **baked in and ready to re‑prompt** your
AI agent.

![Editor with anchored comments](docs/editor.png)

---

## Why

When an AI generates an HTML page, giving precise feedback is painful — you
can’t easily point at *“this button”* or *“that heading.”* This tool lets anyone
drop comments **directly on elements**, anchored stably enough that the feedback
maps back to the markup, so you can hand it straight back to the model.

## The loop

1. **Import** — drop an HTML file (or pick a sample).
2. **Comment** — click any element in the live preview to pin feedback to it.
3. **Share** — create a public review link, optionally password‑protected.
4. **Review** — anyone with the link (and password) adds comments.
5. **Sync back** — once shared, a doc reads its comments from Supabase, so guest
   feedback shows up in your editor (polled every ~10s; **Refresh** to pull now).
6. **Export** — download the HTML with all feedback baked in for re‑prompting —
   from the editor **or** straight from the review link.

## Stack

- **React 19** + **React Router 7** + **Zustand 5** (persisted to `localStorage`)
- **Vite 8** + **TypeScript** (strict) + **Tailwind CSS 4**
- **Supabase** (Postgres) for shared links — RLS‑locked, password‑gated RPCs
- Node **20.19+**

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the two values (see below)
npm run dev                  # http://localhost:5173
```

`npm run build` type‑checks (`tsc --noEmit`) and produces a production bundle;
`npm run preview` serves it.

### Environment

`.env.local` (git‑ignored) needs two **browser‑safe** values from Supabase →
**Settings → API**:

```ini
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…   # the "publishable" key (new format)
```

> The app works fully **without** Supabase — import, comment and export are all
> local. Only **Share / review links** require these keys.

### Database schema

The shared‑link schema lives in [`supabase/migrations/`](supabase/migrations/).
Apply it once per project — easiest via the Supabase **SQL Editor**: paste and
run `0001_init.sql`, then `0002_fix_pgcrypto_schema.sql`. (Or run them with
`psql "$DATABASE_URL" -f <file>` if you have the connection string.)

---

## How it works

### Anchoring engine (the core)

The previewed HTML runs inside a **sandboxed iframe** (`allow-scripts`, **not**
`allow-same-origin`) so untrusted markup can’t touch the host app. A small agent
([`features/preview/agent.js`](src/features/preview/agent.js)) is injected into
the iframe and talks to the host only via `postMessage`. When you click an
element it captures a 3‑layer anchor — **`elementId` → `nth-of-type` selector →
text quote** — so a pin survives edits and can re‑resolve onto a re‑imported v2
of the file. The host maps reported element rects to an absolute pin overlay.

### Sharing & security (password‑only)

- Tables `shares` and `comments` have **RLS enabled with no policies**, so the
  publishable key has **zero direct table access**.
- All reads/writes go through **`SECURITY DEFINER` RPCs** that enforce the share
  password (`create_share`, `share_meta`, `get_share`, `add_comment`, …).
- Passwords are **bcrypt‑hashed** with pgcrypto and never leave the database;
  the gate verifies server‑side.

![Password gate](docs/password-gate.png)

### Export

[`features/export/exportDoc.ts`](src/features/export/exportDoc.ts) appends two
things to the original markup (before `</body>`): a human/AI‑readable re‑prompt
block (open comments only, each with element label · selector · quote · author),
and a `<script type="application/json">` snapshot of all comments for re‑import.

## Project structure

```
src/
  routes/        Landing · Editor · Review (public viewer)
  features/
    preview/     sandboxed iframe + anchoring agent
    comments/    drawer, comment card, composer, avatar
    import/      file read + "Reading HTML file" state
    export/      bake feedback into the HTML file
    share/       supabase RPC wrappers + share popover
  store/         zustand stores (doc + comments, persisted)
  components/    TopBar, icons (Figma SVGs)
  lib/           supabase client, cn()
supabase/migrations/   shares/comments schema + password-gated RPCs
```

## Known limitations (it’s a POC)

- One document at a time (kept in `localStorage`). Sharing the **markup** is a
  one‑time snapshot — editing the file after sharing won’t update the link
  (comments, however, do sync back both ways).
- Reviewers are anonymous (name only); no accounts. The share password is stored
  in the owner’s `localStorage` for sync — a production build would use an owner
  token instead.
- Sync is **polled** (~10s), not realtime; Supabase Realtime would make it live.

## License

Open source.
