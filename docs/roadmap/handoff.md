# Claude Code — Handoff

Entry point for picking up FLOW-1 in Claude Code. Read this, then `CLAUDE.md` (how to operate in this repo), then `docs/wiki/Home.md` (the living docs).

## TL;DR

- **What:** browser-only Pomodoro focus instrument, neumorphic / teenage-engineering look. Synthesised noise + binaural beats, YouTube / podcast / media audio, auto meal breaks, transition bell, live timeline preview.
- **Status:** v1 audio redesign + hardening complete. `pnpm run build` passes (TS strict); `pnpm test` (Vitest) green. Deploys static to Vercel & Cloudflare Pages.
- **Stack:** Vite 6 · React 19 · TypeScript · Tailwind v4. No backend.
- **Your job going forward:** extend features, then keep the wiki current every session (see the protocol in `CLAUDE.md`).

## Get running

```bash
pnpm install
pnpm run dev      # http://localhost:5173
pnpm run build    # gate — must pass before any handoff
pnpm run preview  # check the production build
```

## What exists today

A single-screen app that flips between **Patch** (setup) and **Run**:

- Configure sessions, focus (25), short break (5), long break (15). A long break replaces the short one after every **4th** focus session, and only once you schedule **5+** sessions.
- Toggle **breakfast / lunch / dinner**. A meal is inserted only when a focus block would begin inside its clock window, so meals follow your real start time.
- **Transition bell** on/off.
- **Background sound:** four categories — **Noise** (X/Y blend of white/pink/brown/blue + low-pass, via the Noise Designer), **Binaural** (keyframed tracks via the Binaural Engine), **Custom Media** (YouTube / podcast / media URL), or Silent. Optional "mute during breaks" (crossfaded).
- **Run mode:** keyboard transport (Space/n), `aria-live` phase announcements; an in-progress run survives reloads.
- **Live timeline preview** with clock times + projected end. Config + run persist in `localStorage`.

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
3. **`flow.cfg` merge is still shallow** (`{...fallback, ...parsed}`) — adding a field inside `meals.*` later won't backfill. `flow.audio` and `flow.run` are migrated/derived; give `flow.cfg` the same treatment when its schema changes. *(`flow.audio` migration done — ADR-9.)*
4. **Binaural loop boundary** can drift by a tick under heavy throttling (`setInterval`-driven re-anchor) — inaudible for ambient beats. Sample-accurate scheduling only if needed (ADR-12).
5. **Podcast field expects a direct media URL**, not a podcast page link. Worth a clearer hint or oEmbed resolution later.

*Resolved this milestone:* tests (Vitest), `aria-live` + keyboard shortcuts, run persistence, audio crossfade on breaks, audio config migration.

## Suggested next steps

Roadmap detail in `docs/wiki/Roadmap.md` and the v1 plan in `docs/plans/20260617091148-road-to-v1.md`. Next candidates:
- **Phase 6 (v1.x) — Mixes:** mynoise-style multi-source mixer over the Phase 2 noise mixer bus (a new `mix` category).
- Stats/history, Notifications API for backgrounded phase changes, PWA/offline (medium-term).
- Begin the blocking feature and the wearable heart-rate → binaural adaptation described in the project plan (`playBinauralTrack` is the live-retarget hook).

## The one rule that keeps this repo healthy

Every session updates the wiki. The full protocol is in `CLAUDE.md` → "Documentation protocol". Treat a stale wiki as a failed task.
