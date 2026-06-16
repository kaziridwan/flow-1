# Claude Code — Handoff

Entry point for picking up FLOW-1 in Claude Code. Read this, then `CLAUDE.md` (how to operate in this repo), then `docs/wiki/Home.md` (the living docs).

## TL;DR

- **What:** browser-only Pomodoro focus instrument, neumorphic / teenage-engineering look. Synthesised noise + binaural beats, YouTube / podcast / media audio, auto meal breaks, transition bell, live timeline preview.
- **Status:** complete, working proof-of-concept. `npm run build` passes (TS strict). Deploys static to Vercel & Cloudflare Pages.
- **Stack:** Vite 6 · React 19 · TypeScript · Tailwind v4. No backend.
- **Your job going forward:** extend features, then keep the wiki current every session (see the protocol in `CLAUDE.md`).

## Get running

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gate — must pass before any handoff
npm run preview  # check the production build
```

## What exists today

A single-screen app that flips between **Patch** (setup) and **Run**:

- Configure sessions, focus (25), short break (5), long break (15). A long break replaces the short one after every **4th** focus session, and only once you schedule **5+** sessions.
- Toggle **breakfast / lunch / dinner**. A meal is inserted only when a focus block would begin inside its clock window, so meals follow your real start time.
- **Transition bell** on/off.
- **Background sound:** white / pink / brown noise and binaural beats (synthesised live with the Web Audio API), or a YouTube video, podcast URL, or media URL. Optional "mute during breaks".
- **Live timeline preview** with clock times + projected end. Config persists in `localStorage`.

Full behavior spec: `docs/wiki/Features.md`. The non-obvious subsystems (timer, audio engine, scheduling): `docs/wiki/Internals.md`.

## Key decisions already made

Captured in full in `docs/wiki/Decisions.md`. The load-bearing ones:

- **`setInterval` (200 ms), deadline-based, not `requestAnimationFrame`** — survives background tabs and self-corrects drift. State updates once per second to avoid re-render churn.
- **Audio synthesised in-browser** (no shipped assets) for noise/binaural; YouTube via the IFrame API; podcast/media via a hidden `<audio>` element.
- **Meal breaks decided at focus-block boundaries** against fixed clock windows — predictable and start-time-aware.
- **Tailwind v4 with `@theme` tokens + `@utility` neumorphic classes**, no config file.
- **One bold element** (the LCD), everything else quiet — the design discipline to preserve.

## Known considerations / tech debt

Honest list for whoever picks this up:

1. **Backgrounded tabs throttle timers to ~1/sec** — fine for the countdown (deadline self-corrects), but a phase transition + bell can fire up to ~1s late while the tab is hidden. Acceptable for a Pomodoro; revisit if precise background alerts are needed (Web Worker timer or `Notification` API).
2. **YouTube audio pauses when the tab is backgrounded** — this is YouTube's own policy, not a bug. Noise/binaural/`<audio>` keep playing.
3. **Binaural / noise restart (not crossfade)** when audio re-enables after a break — a brief gap, no smooth ramp. Low priority.
4. **`localStorage` merge is shallow** (`{...fallback, ...parsed}`) — adding a new field inside `meals.*` later won't backfill for returning users. Add a tiny migration when you extend the config shape.
5. **No tests yet.** Pure logic in `src/lib/schedule.ts` and `src/lib/format.ts` (`youtubeId`, meal placement, long-break rule) is the highest-value place to start with Vitest.
6. **No `aria-live` on the timer** — screen readers don't announce phase changes. Easy win.
7. **Podcast field expects a direct media URL**, not a podcast page link. Worth a clearer hint or oEmbed resolution later.

## Suggested next steps

Roadmap detail in `docs/wiki/Roadmap.md`. Near-term candidates:
- Add Vitest + unit tests for `schedule.ts` (meal windows, long-break rule) and `format.ts` (`youtubeId`).
- Pause/resume keyboard shortcuts and `aria-live` timer announcements.
- Persist/resume an in-progress run across reloads.
- Begin the blocking feature and the wearable heart-rate → binaural adaptation described in the project plan.

## The one rule that keeps this repo healthy

Every session updates the wiki. The full protocol is in `CLAUDE.md` → "Documentation protocol". Treat a stale wiki as a failed task.
