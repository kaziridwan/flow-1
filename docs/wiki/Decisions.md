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

## ADR-9 · Versioned audio config migration (supersedes shallow merge for `flow.audio`)
**Context:** the road-to-v1 work reshapes the persisted audio config from a flat `{source, preset, url}` into a nested `AudioSettings`. The old `load()` shallow-merge over defaults would leave returning users with a half-old/half-new object (handoff tech-debt #4).
**Decision:** add `migrateAudio(raw): AudioSettings` (`src/lib/migrate.ts`) that normalises any prior/garbage shape to the current model, keyed on a `v` field. `App` loads `flow.audio` through it. Pure design defaults/helpers live in `src/lib/audioDesign.ts` (no Web Audio) so they're unit-testable. `flow.cfg` still uses the shallow `load()` until its schema changes.
**Consequences:** returning v1 users upgrade losslessly (noise→category, preset→keyframes, url→media). The migration is the seam for all future audio schema bumps. Covered by `migrate.test.ts`.

## ADR-10 · Categorized audio model + 4-corner noise blend
**Context:** the flat 8-button source picker was overcrowded and couldn't express the planned Noise Designer (blended noise) or Binaural Engine (keyframed tracks) without growing further. ADR-6 demands restraint.
**Decision:** model audio as one of four **categories** (`none`/`noise`/`binaural`/`media`), each with its own design object on `AudioSettings`. Noise is an **X/Y blend over four corner colors** — White, Pink, Brown, and a new **Blue** (differentiated white, +6 dB/oct) — via bilinear `cornerWeights`; binaural is a `BinauralDesign` of keyframes; media carries a `kind`+`url`. The picker shows a category card with an inline default and a ⋯ button to a designer `Sheet`. Until the full simultaneous mixer lands (Phase 2), the engine plays the **dominant** noise corner via the existing single-source `playNoise`.
**Consequences:** a calmer panel and a forward-compatible shape (a future `mix` category slots in cleanly). Interim limitation: noise blends snap to the dominant corner at playback until the mixer arrives; binaural plays the first keyframe flat until the keyframe scheduler arrives (Phase 3).

## ADR-11 · Noise blend = four simultaneous sources through one low-pass (supersedes the noise interim of ADR-10)
**Context:** the X/Y pad needs to mix four noise colors continuously, and dragging it must not click or restart audio. ADR-10 shipped an interim that just played the dominant corner via the single-source `playNoise`.
**Decision:** `AudioEngine.playNoiseBlend(design)` builds **all four** looping `BufferSource`s once, each into its own `GainNode`, summed into a single shared `BiquadFilter` (`lowpass`) → a design-volume gain → master. Live edits call `applyNoiseDesign`, which ramps the four gains, the output gain, and the filter cutoff/Q with `setTargetAtTime` (~50 ms). The filter stays in-graph always; "disabled" just opens it to 20 kHz (no reconnection). The graph is cached on `this.noise` and cleared in `stopTone`. The controller uses a start/stop effect (category/active/binaural) plus a separate dependency-keyed effect for live noise updates so blend changes never trigger the cleanup that would restart the tone.
**Consequences:** smooth, click-free morphing and a real mixer bus that Phase 6 (Mixes) can reuse. Four always-on sources cost slightly more CPU than one; negligible in practice. `playNoise` was removed.

## ADR-12 · Binaural track = looping keyframe automation (supersedes the binaural interim of ADR-10)
**Context:** the Binaural Engine needs base/beat/volume to glide over a track of a chosen length and loop, and editing while playing must not click. ADR-10's interim played `keyframes[0]` flat via `playBinaural(base, beat)`.
**Decision:** `AudioEngine.playBinauralTrack(design)` keeps the two-oscillator + `ChannelMerger` topology but drives `left.frequency` (base), `right.frequency` (base+beat) and the output gain with `linearRampToValueAtTime` across keyframe times anchored at `currentTime`. A `setInterval(durationSec)` re-runs `scheduleBinaural` to loop (re-anchoring at the new `currentTime` and `cancelScheduledValues`). The call is idempotent: while running it just reschedules (and resets the loop timer), so editing the track doesn't restart the oscillators. Graph cached on `this.binaural`, cleared in `stopTone`. Pure interpolation math (`interpolateBinaural`) lives in `audioDesign.ts` for the UI sparkline/insertion and is unit-tested.
**Consequences:** evolving, looping binaural tracks with click-free edits; `playBinaural(base,beat)` removed (a flat preset is just a 2-keyframe equal track). Loop timing uses `setInterval`, so a loop boundary can drift by a tick under heavy throttling — inaudible for ambient beats; revisit with sample-accurate scheduling only if needed. This is also the live-retarget seam for future HR-adaptive beats (Roadmap).

## ADR-13 · Persist an in-progress run via wall-clock snapshots
**Context:** a reload mid-run lost the session (handoff tech-debt). The timer is deadline-based off `performance.now()`, which doesn't survive a reload.
**Decision:** `src/lib/runStore.ts` writes a snapshot to `localStorage["flow.run"]` — `{blocks, startMs, index, remaining, status, savedAt}` — only at **block boundaries and on pause/resume** (not every second). `App` saves on `[committed, timer.index, timer.status]` and, on mount, calls `restoreRun()`, which fast-forwards a *running* snapshot across any blocks that elapsed while away using `Date.now() − savedAt` (a *paused* one is restored as-is; a finished one is dropped). `useTimer.restore(index, remaining, paused)` seeds the timer at that position.
**Consequences:** runs survive reloads/crashes with accurate position derived from the wall clock, without per-second writes. A restored run auto-resumes (audio waits for the next user gesture per browser policy). Snapshot key is independent of `flow.cfg`/`flow.audio`.

## ADR-14 · Crossfade on break mute (keep the tone alive, duck a fade gain)
**Context:** with "mute during breaks" on, audio hard-stopped at a break and restarted after — a click/gap (ADR-3 noted this). 
**Decision:** route each generated tone through a dedicated `fade` gain (out → fade → master). The controller no longer stops the tone for a break: it keeps it playing whenever the run is `running` and calls `engine.duck(muted)` to ramp the fade gain to 0/1 (`setTargetAtTime`, ~250 ms). The start/stop effect now keys on `running` (run playing) and a separate effect keys on `muted`; full `stopTone` still happens on stop/pause/category change. Media (YouTube/`<audio>`) can't crossfade, so they still play/pause on `running && !muted`.
**Consequences:** smooth break transitions; the four noise sources / two oscillators idle silently through a break (negligible CPU). Supersedes the "restart not crossfade" caveat in ADR-3 for synthesised audio.

## ADR-15 · Setup-time preview reuses the single AudioEngine
**Context:** the Noise Designer needs to play audio during **Patch** (setup) mode, but the one `AudioEngine` instance was only wired into Run mode (`App` → `RunScreen` → `AudioController`).
**Decision:** thread the same engine (and master volume) down to `SetupScreen` → `AudioPicker` → `NoiseDesigner` rather than creating a second engine/`AudioContext`. The designer drives it with the same idempotent `playNoiseBlend` + a start/stop effect (keyed on a "Preview" play/stop button) and a live-update effect. Cleanup stops the tone when the button is toggled off and on unmount; the sheet closing unmounts the designer, so preview never leaks into a run (which starts only after setup unmounts).
**Consequences:** one `AudioContext` for the whole app (browsers cap how many you can open), consistent playback between preview and run. The designer is no longer pure-UI — it takes an `engine` prop. Same hook is available to give the Binaural Engine a preview later.

## ADR-16 · Binaural preview cursor = rAF clock + offset-seek with phase-synced looping
**Context:** the Binaural Engine needed the same setup-time preview as the Noise Designer (ADR-15), plus a **scrub cursor** that plays/seeks over the sparkline. Unlike noise, a binaural track has a *position in time*, so the visual cursor and the audio automation must stay in sync — including across the loop boundary and across live edits.
**Decision:** the cursor is driven by a `requestAnimationFrame` clock in `BinauralEngine`: `pos = (startOffset + (now − startedAt)/1000) mod durationSec`. Playback position is the single source of truth (`posRef`); scrubbing (pointer events with capture on a wrapper over the SVG) sets it directly. To make the audio match, `playBinauralTrack`/`scheduleBinaural` gained an **`offsetSec` seek**: it sets the interpolated value *at* the offset immediately and ramps only keyframes after it. Looping uses `setTimeout(durationSec − offset)` to snap back to t=0 exactly when the cursor wraps, then `setInterval(durationSec)`. On toggle-on, edit, scrub-release, or volume change, the component re-anchors (`startedAt = now`, `startOffset = posRef`) and re-calls `playBinauralTrack(design, pos)`, so the cursor never jumps and audio continues from the same place. The first/last keyframe times are locked in the UI (first=0, last=`durationSec`, last follows length) to uphold the `BinauralDesign` invariant; keyframe times use **HH:MM:SS** (`hms`/`parseHms`, commit on blur/Enter) because tracks now run up to **2.5 h**.
**Consequences:** click-free, in-phase preview + scrubbing reusing the single engine (ADR-15) and the idempotent reschedule of ADR-12. `setTimeout`-then-`setInterval` re-anchors at each loop, so phase can drift by a timer tick under heavy throttling — inaudible/invisible for ambient beats (same trade-off ADR-12 accepted). The rAF `setState` re-renders the sheet each frame while previewing; `TimeField` keeps local edit state so this doesn't disrupt typing. This is the live-retarget seam reused from ADR-12 for future HR-adaptive beats.
