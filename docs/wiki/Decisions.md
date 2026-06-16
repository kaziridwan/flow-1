# Decisions

Numbered, append-only log of design/technical choices. **Never edit a past decision** — if something changes, add a new entry that supersedes it and reference the old number. Format: context → decision → consequences.

---

## ADR-1 · Interval timer, not requestAnimationFrame
**Context:** the timer must keep counting and fire phase transitions even when the tab is backgrounded; a Pomodoro that silently stalls is useless.
**Decision:** drive the countdown with `setInterval(200 ms)` and compute remaining from an absolute `performance.now()` deadline. Update React state only when the displayed second changes.
**Consequences:** survives background throttling (interval keeps firing at ~1/sec; transitions at most ~1 s late) and self-corrects drift; far fewer re-renders than per-frame rAF. Background precision is bounded by browser throttling — acceptable here, revisit with a Web Worker if exactness is needed.

## ADR-2 · Browser-only, static deploy
**Context:** the brief asked for a browser-only app deployable to Vercel and Cloudflare.
**Decision:** no backend, no server functions; all logic and audio run client-side; ship as static `dist/`.
**Consequences:** trivial hosting, no secrets, no data leaves the page; config lives in `localStorage`. Anything needing a server (OAuth wearables, shared state) becomes a separate service later.

## ADR-3 · Synthesise audio in-browser
**Context:** noise and binaural beats are core; shipping audio files is heavy and licence-laden.
**Decision:** generate white/pink/brown noise and binaural beats with the Web Audio API at runtime; generate the bell too. Only external media (YouTube/podcast/media URL) comes from the network.
**Consequences:** zero audio assets, instant load, infinitely loopable. Binaural requires stereo headphones. Re-enabling a tone after a break restarts rather than crossfades (minor).

## ADR-4 · Meal breaks decided at focus-block boundaries
**Context:** meals should reflect the user's real start time without complex interval math.
**Decision:** while laying out the timeline, insert a meal immediately before the next focus block whose start time falls inside an enabled, not-yet-taken clock window.
**Consequences:** predictable and easy to reason about/preview. A focus block that merely crosses into a window is not split — a deliberate simplicity tradeoff.

## ADR-5 · Tailwind v4 with @theme + @utility, no config file
**Context:** wanted the latest Tailwind and a small, self-documenting token system for the neumorphic look.
**Decision:** use `@tailwindcss/vite`; define color/font tokens in `@theme` and neumorphic surfaces (`neu-raised/inset/flat/pressed`, `screen-bezel`, `tech-label`) as `@utility` in `src/index.css`. No `tailwind.config`.
**Consequences:** tokens and component utilities live in one CSS file; add colors there to get `text-*`/`bg-*` utilities. Anyone expecting a JS config won't find one — documented here and in `CLAUDE.md`.

## ADR-6 · Single bold element (the LCD)
**Context:** neumorphic + teenage-engineering can easily become busy.
**Decision:** spend all visual boldness on one recessed LCD screen (glowing mode-colored digits, focus LEDs); keep every other surface quiet soft-shadow grey with one accent (TE orange). Modes are color-coded.
**Consequences:** a coherent instrument identity. Future UI should preserve the restraint — don't add a second loud element.

## ADR-7 · Freeze the plan at Start; drive start via `runId`
**Context:** edits to config must not mutate a run in progress, and the timer must start from the just-committed blocks.
**Decision:** snapshot `{ blocks, start }` into `committed` at Start; increment a `runId` and call `timer.start()` from an effect keyed on it (after refs update).
**Consequences:** runs are immutable; no stale-blocks race. Restart re-commits a fresh start time with the same config.

## ADR-8 · Dinner window moved to 18:30 (supersedes the original 18:00)
**Context:** during the 2026-06-14 documentation re-review, the code's dinner window (18:00–21:00) disagreed with the documented 18:30, and 18:00 risked grabbing an early-evening session.
**Decision:** set the dinner window to **18:30–21:00** in `MEAL_WINDOWS`.
**Consequences:** code and docs agree; dinner is less likely to interrupt an early session. Logged in the Changelog.
