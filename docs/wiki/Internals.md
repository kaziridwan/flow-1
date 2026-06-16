# Internals

The three subsystems worth understanding before you change them: the timer, the scheduler, and the audio engine.

## 1. Timer — `src/hooks/useTimer.ts`

A `setInterval` loop (200 ms) over a frozen `Block[]`. It is **deadline-based**: each block stores `deadlineRef = performance.now() + duration*1000`, and every tick computes `remaining = (deadline − now)/1000`. This means the countdown self-corrects after the tab is throttled or the loop is briefly starved — it never accumulates drift.

- React state (`remaining`) updates **once per second** (`Math.ceil(left)` change), not every tick, to avoid re-render churn. The progress bar smooths the steps with a CSS transition.
- `goTo(i)` sets the active block; returning `false` means we ran off the end → `status = "done"` + `onComplete()`.
- On each block boundary, `onAdvance(from, to, index)` fires **before** `goTo` — this is where `App` rings the bell.
- `pause()` freezes `remaining` from the deadline; `resume()` rebuilds the deadline from the frozen `remaining`. `skip()` advances one block (keeps the loop running only if currently running).
- Public API: `{ status, index, remaining, currentBlock, start, pause, resume, skip, reset }`.

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
- `playNoise("white"|"pink"|"brown")` — fills a 2 s looping buffer. White = raw random; pink = Voss-McCartney-ish filter bank; brown = integrated/leaky random.
- `playBinaural(base, beat)` — two sine oscillators panned hard left/right via a `ChannelMerger`, offset by `beat` Hz.
- `stopTone()` tears down whatever generated source is running; `setVolume()` drives the master gain.

`AudioController` is the routing layer, driven by the `active` prop (the `audioActive` boolean from `RunScreen`):
- **Synthesised** (noise/binaural): effects call `engine.playNoise/playBinaural` when active, `engine.stopTone()` when not.
- **YouTube**: lazy-loads the IFrame API once (`loadYouTubeApi`), creates/destroys a player for the parsed video id (`youtubeId()` in `format.ts`), and play/pauses + sets volume on the `active`/volume effects.
- **Podcast / media**: a hidden `<audio>` element; `play()/pause()` and `volume` via effects.

**Known limits** (also in handoff): YouTube audio pauses when the tab is backgrounded (YouTube policy); re-enabling synthesised audio after a break restarts the tone rather than crossfading.
