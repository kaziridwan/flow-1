# Architecture

Browser-only React SPA. No router (single screen that flips between two modes), no backend, no global state library — state lives in `App.tsx` and flows down as props.

## File map

```
flow-1/
├─ index.html              # mounts #root, loads Inter + JetBrains Mono from Google Fonts
├─ vite.config.ts          # react() + tailwindcss() plugins
├─ vercel.json             # framework: vite, SPA rewrite
├─ wrangler.toml           # Cloudflare Pages: pages_build_output_dir = "dist"
├─ public/favicon.svg
└─ src/
   ├─ main.tsx             # React root
   ├─ App.tsx              # state, timer wiring, setup⇄run, localStorage persistence
   ├─ index.css            # Tailwind v4 import, @theme tokens, @utility neumorphic classes
   ├─ types.ts             # all shared types (single source of truth)
   ├─ hooks/
   │  └─ useTimer.ts       # interval countdown over a Block[]
   ├─ lib/
   │  ├─ schedule.ts       # buildSchedule(): timeline + meal-break insertion
   │  ├─ schedule.test.ts  # Vitest: break/meal logic
   │  ├─ audio.ts          # AudioEngine class (bell, noise[white/pink/brown/blue], binaural)
   │  ├─ audioDesign.ts    # pure audio-design helpers: corners, presets, defaults (no Web Audio)
   │  ├─ migrate.ts        # migrateAudio(): legacy/garbage → v2 AudioSettings
   │  ├─ migrate.test.ts   # Vitest: migration mapping + robustness
   │  ├─ modes.ts          # BlockType → color/label map
   │  ├─ runStore.ts       # persist/restore an in-progress run (localStorage["flow.run"])
   │  ├─ format.ts         # mmss, clock, humanDuration, youtubeId
   │  └─ format.test.ts    # Vitest: youtubeId + formatters
   └─ components/
      ├─ controls.tsx      # Eyebrow, Stepper, Toggle, Segmented (reusable neumorphic inputs)
      ├─ Display.tsx       # the LCD hero (digits, mode color, progress, focus dots)
      ├─ SetupScreen.tsx   # "Patch" mode — all configuration
      ├─ RunScreen.tsx     # "Run" mode — display + transport + now-playing
      ├─ AudioPicker.tsx   # category cards (Noise/Binaural/Media) + designer sheets (setup)
      ├─ AudioController.tsx # headless — plays the active category (noise/binaural/YouTube/media)
      ├─ NoiseDesigner.tsx # X/Y blend pad + low-pass + volume + live preview (Noise ⋯ sheet)
      ├─ XYPad.tsx         # 2D blend pad (pointer + keyboard, prefers-reduced-motion)
      ├─ BinauralEngine.tsx # keyframe track editor + sparkline (in the Binaural ⋯ sheet)
      ├─ Sheet.tsx         # modal primitive for the sound designers (Esc/backdrop, focus trap)
      └─ SchedulePreview.tsx # timeline list with clock times
```

Test files (`*.test.ts`) are run by Vitest (`pnpm test`, config in `vitest.config.ts`) and excluded from the production build (`tsconfig.app.json`).

## State model (`App.tsx`)

- `cfg: SessionConfig` — sessions, durations, bell, per-meal enable/duration. Persisted to `localStorage["flow.cfg"]`.
- `audio: AudioSettings` (v2) — `category` (none/noise/binaural/media) + per-category design (`noise`, `binaural`, `media`), master `volume`, `pauseOnBreak`. Loaded through `migrateAudio()` and persisted to `localStorage["flow.audio"]`.
- `committed: { blocks, start } | null` — `null` ⇒ **Patch** mode; set ⇒ **Run** mode. Frozen at Start so edits can't mutate a run. Persisted to `localStorage["flow.run"]` at block boundaries/pause and restored on reload (`src/lib/runStore.ts`; ADR-13).
- `runId: number` — incremented on Start/Restart; an effect keyed on it calls `timer.start()` after `committed` (and therefore the timer's internal `blocksRef`) has updated.
- `now: Date` — refreshed every 30 s so the setup preview's meal windows stay honest.
- `engineRef` — a single `AudioEngine` instance for the app's lifetime; disposed on unmount. Passed to `RunScreen`/`AudioController` (run playback) **and** `SetupScreen`/`AudioPicker`/`NoiseDesigner` (setup-time preview) — one engine, one `AudioContext` (ADR-15).

Preview vs. run: setup shows `buildSchedule(cfg, now)` recomputed live; Start freezes a `buildSchedule(cfg, new Date())` into `committed`.

## Data flow

```
cfg/audio ──> buildSchedule() ──> Block[] ──┐
                                            ├─> useTimer(blocks) ──> {status,index,remaining,currentBlock}
Start (runId++) ──> effect ──> timer.start()┘                              │
                                                                           ▼
                              RunScreen ──> Display (LCD)  +  AudioController (audioActive)
                                            audioActive = running && category≠none && !(pauseOnBreak && onBreak)
```

`AudioController` is a headless/near-headless component: it renders nothing for synthesised sources (drives `AudioEngine` via effects), a hidden `<audio>` for podcast/media, and a visible iframe only for YouTube.

## Key types (`src/types.ts`)

- `BlockType = "focus" | "short" | "long" | "breakfast" | "lunch" | "dinner"`
- `Block { type, duration (sec), focusIndex?, label }`
- `SessionConfig`, `MealConfig`, `BinauralPreset`
- `AudioSettings` (v2 root) with `AudioCategory`, `NoiseDesign` (+ `NoiseColor`), `BinauralDesign` (+ `BinauralKeyframe`), `MediaKind`

`types.ts` is the single source of truth — extend types there, not inline.
