# PLAN

Build order for the AI Feedback Loop POC. All eight milestones are complete.

| # | Milestone | Status | Notes |
|---|-----------|--------|-------|
| M1 | Scaffold + Landing | ✅ | Vite 8 · React 19 · TS · Tailwind 4; Landing matches Figma |
| M2 | Sandboxed preview + anchoring | ✅ | iframe agent, 3‑layer anchor, pin overlay |
| M3 | Import flow | ✅ | drag/drop + picker, “Reading HTML file” state |
| M4 | Comment UI | ✅ | drawer, comment card, composer, pins, focus, persisted store |
| M5 | Supabase wiring | ✅ | shares/comments, RLS, `SECURITY DEFINER` RPCs, bcrypt |
| M6 | Public link + password gate | ✅ | `/r/:id` viewer, server‑verified password |
| M7 | Export / re‑prompt | ✅ | HTML + comments JSON + re‑prompt block baked in |
| M8 | Polish | ✅ | README, favicon, code‑split routes, dead‑button cleanup |

## Architecture decisions

- **Sandboxed iframe + postMessage.** Untrusted HTML can’t reach the host; the
  injected agent communicates only via messages. Rects are re‑reported across a
  few frames so pins settle after fonts/images load.
- **Anchor fallback chain** (`elementId → selector → quote`) makes pins durable
  across edits and re‑imports.
- **Password‑only sharing with RLS + RPCs.** No direct table access; every read
  and write is gated server‑side by a bcrypt‑checked password. No accounts.
- **Export mirrors the share shape**, so the same comment serialization feeds
  both the downloaded file and the database.

## Post-POC additions (done)

- **Comment sync-back.** Shared docs use Supabase as the single source of truth;
  guest comments appear in the owner’s editor (polled ~10s + manual Refresh).
- **Export from the review link** so reviewers/owners can grab the re-prompt file
  without round-tripping through the editor.

## Possible next steps (beyond the POC)

- Realtime comments (Supabase Realtime) to replace the 10s poll.
- Multiple documents / a dashboard of shares.
- Re-sync the **markup** too, so post-share edits update the link.
- Owner identity via a token instead of storing the share password locally.
- Code-split `supabase-js` further / lazy-load the share popover.
