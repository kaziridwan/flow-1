# Internals

The three subsystems worth understanding before you change them: the timer, the scheduler, and the audio engine.

## 1. Timer — `src/hooks/useTimer.ts`

A `setInterval` loop (200 ms) over a frozen `Block[]`. It is **deadline-based**: each block stores `deadlineRef = performance.now() + duration*1000`, and every tick computes `remaining = (deadline − now)/1000`. This means the countdown self-corrects after the tab is throttled or the loop is briefly starved — it never accumulates drift.

- React state (`remaining`) updates **once per second** (`Math.ceil(left)` change), not every tick, to avoid re-render churn. The progress bar smooths the steps with a CSS transition.
- `goTo(i)` sets the active block; returning `false` means we ran off the end → `status = "done"` + `onComplete()`.
- On each block boundary, `onAdvance(from, to, index)` fires **before** `goTo` — this is where `App` rings the bell.
- `pause()` freezes `remaining` from the deadline; `resume()` rebuilds the deadline from the frozen `remaining`. `skip()` advances one block (keeps the loop running only if currently running).
- Public API: `{ status, index, remaining, currentBlock, start, pause, resume, skip, reset, restore }`. `restore(index, remaining, paused)` seeds the timer mid-run for run-persistence (ADR-13): `App` saves a wall-clock snapshot to `localStorage["flow.run"]` at block boundaries/pause (`src/lib/runStore.ts`) and replays it on reload.

**Why interval not rAF:** `requestAnimationFrame` is fully paused in background tabs; `setInterval` keeps firing (throttled to ~1/sec), so phase transitions and the bell still occur when hidden — at most ~1 s late. See [Decision 1](./Decisions.md).

**Gotcha:** the loop reads `blocksRef.current`, refreshed each render. `App` starts the timer from an effect keyed on `runId` (not synchronously in the click handler) so `blocksRef` has already picked up the newly committed blocks.

## 2. Scheduler — `src/lib/schedule.ts`

`buildSchedule(cfg, start): Block[]` walks a clock cursor from `start`:

```
for each session i in 1..N:
  for meal in [breakfast, lunch, dinner]:
    if enabled and not taken and cursorTimeOfDay ∈ [window.start, window.end):
      push meal block; mark taken; advance cursor
  push focus block; advance cursor
  if not last session:
    isLong = (sessions ≥ 5) and (i % 4 == 0)
    push long|short break; advance cursor
```

- Meals are evaluated **at focus-block boundaries** against fixed `MEAL_WINDOWS`, compared by minutes-of-day. This is deliberately simple and predictable: a meal lands right before the next focus session that *starts* inside the window. It does **not** split a focus block that merely crosses into a window.
- Helpers: `withClockTimes()` lays start/end times over a built schedule for the preview; `totalDuration()` sums seconds; `usesLongBreaks(n)` exposes the 5+ rule.
- Pure and side-effect-free → the prime target for unit tests.

## 3. Audio — `src/lib/audio.ts` + `src/components/AudioController.tsx`

`AudioEngine` (one instance, lifetime-scoped in `App`):
- Lazily creates a single `AudioContext` + master `GainNode` on first use; `resume()` unlocks it after the Start gesture.
- `bell()` — two-partial (880/1320 Hz) sine+triangle with exponential decay. No asset.
- `buildNoiseBuffer("white"|"pink"|"brown"|"blue")` — fills a 2 s looping buffer. White = raw random; pink = Voss-McCartney-ish filter bank; brown = integrated/leaky random; blue = differentiated white (+6 dB/oct, bright).
- `playNoiseBlend(design)` — the noise mixer: all four colors loop simultaneously, each through a `GainNode`, summed into one `BiquadFilter` (lowpass) → design-volume gain → master. Idempotent — calling it again while running just ramps gains/filter (`applyNoiseDesign`, `setTargetAtTime` ~50 ms), so the X/Y pad morphs click-free. "Low-pass off" opens the filter to 20 kHz rather than reconnecting. See ADR-11.
- `playBinauralTrack(design, offsetSec=0)` — two sine oscillators panned hard left/right via a `ChannelMerger` (left=base, right=base+beat), with base/beat/gain interpolated across keyframes (`linearRampToValueAtTime`). `offsetSec` **seeks** into the track: the value at the offset is set immediately (`interpolateBinaural`) and only later keyframes ramp. Looping is a `setTimeout(durationSec − offset)` that snaps back to t=0, then a `setInterval(durationSec)`, so the audio stays in phase with the editor's preview cursor (which wraps at the same instant). Idempotent — re-call to reschedule/seek on edit without restarting the oscillators. See ADR-12, ADR-16.
- `stopTone()` tears down whatever generated source is running (clears the cached noise/binaural graphs and the binaural loop timer); `setVolume()` drives the master gain.

**Audio config model** lives in `src/types.ts` and `src/lib/audioDesign.ts` (pure, Web-Audio-free helpers): the noise blend's four corners + bilinear `cornerWeights`, the binaural preset seeds, the binaural **brainwave bands** (`BINAURAL_BANDS`/`binauralBand` — Delta→Gamma classification of the beat Hz), `default*` factories, and label/match helpers. A **`SoundConfig`** is the playable part of audio (category + per-category design + its own `volume`); **`AudioSettings`** extends it (the *focus* sound, held flat) and adds `pauseOnBreak` and an optional separate `break: SoundConfig | null` (null = keep the focus sound during breaks). `soundOf(settings)` extracts the focus `SoundConfig`. Persisted config is normalised by `migrateAudio()` (`src/lib/migrate.ts`) — the additive `break` field backfills to `null` for older configs (ADR-9, ADR-17). Keeping this pure makes it the bulk of the unit-test surface alongside `schedule`/`format`.

`AudioController` is the routing layer. It takes a single **effective `SoundConfig`** (`sound` prop) — `RunScreen` decides whether that's the focus sound or, on a break with `pauseOnBreak` off and a `break` sound set, the break sound — plus `running` and `muted`:
- **Synthesised** (noise/binaural): a start/stop effect keyed on `sound.category` + `running` calls `engine.playNoiseBlend/playBinauralTrack`/`stopTone`; a `muted` effect calls `engine.duck()` to **crossfade** the tone across a (muted) break (per-tone `fade` gain → master, ~250 ms; ADR-14) without stopping it. **Separate** effects keyed on the noise design and the (serialized) binaural design push live updates — these also drive a **focus⇄break swap between two same-category sounds** (the start/stop effect doesn't re-fire when category is unchanged, so the live effect morphs/reschedules to the new design). All engine play/duck methods are idempotent.
- **YouTube**: lazy-loads the IFrame API once (`loadYouTubeApi`), creates/destroys a player for the parsed video id (`youtubeId()` in `format.ts`), and play/pauses + sets volume on the `active`/volume effects.
- **Podcast / media**: a hidden `<audio>` element; `play()/pause()` and `volume` via effects.

**Setup-time preview:** the same `AudioEngine` is passed into the Noise Designer and Binaural Engine (`SetupScreen` → `AudioPicker` → `SoundPicker` → designer). Each "Preview" play/stop button drives `engine.playNoiseBlend`/`playBinauralTrack` with the same start/stop + live-update effect pattern as the controller; toggling off / unmount calls `stopTone`. The Binaural Engine also adds a scrub cursor on top (ADR-16). One engine / one `AudioContext` for both setup and run (ADR-15).

**Known limits** (also in handoff): YouTube audio pauses when the tab is backgrounded (YouTube policy). (Synthesised audio now crossfades across breaks — ADR-14.)

## 4. Tests — Vitest

`pnpm test` runs Vitest (`vitest.config.ts`, node environment) over `src/**/*.test.ts`. Coverage targets the pure logic: `schedule.test.ts` (long-break rule, meal-window placement, no-trailing-break), `format.test.ts` (`youtubeId` URL shapes, `mmss`, `hms`/`parseHms` round-trip, `humanDuration`), `migrate.test.ts` (v1→v2 mapping + garbage robustness), `audioDesign.test.ts` (corner weights, preset match, binaural interpolation, brainwave-band classification). Tests import `{ describe, it, expect } from "vitest"` explicitly (no globals) and are excluded from the production build via `tsconfig.app.json`.
