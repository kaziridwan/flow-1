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
   │  ├─ audio.ts          # AudioEngine class + BINAURAL_PRESETS
   │  ├─ modes.ts          # BlockType → color/label map
   │  └─ format.ts         # mmss, clock, humanDuration, youtubeId
   └─ components/
      ├─ controls.tsx      # Eyebrow, Stepper, Toggle, Segmented (reusable neumorphic inputs)
      ├─ Display.tsx       # the LCD hero (digits, mode color, progress, focus dots)
      ├─ SetupScreen.tsx   # "Patch" mode — all configuration
      ├─ RunScreen.tsx     # "Run" mode — display + transport + now-playing
      ├─ AudioPicker.tsx   # source/preset/url/volume controls (used in setup)
      ├─ AudioController.tsx # headless — actually plays noise/binaural/YouTube/media
      └─ SchedulePreview.tsx # timeline list with clock times
```

## State model (`App.tsx`)

- `cfg: SessionConfig` — sessions, durations, bell, per-meal enable/duration. Persisted to `localStorage["flow.cfg"]`.
- `audio: AudioConfig` — source, binaural preset, url, volume, pauseOnBreak. Persisted to `localStorage["flow.audio"]`.
- `committed: { blocks, start } | null` — `null` ⇒ **Patch** mode; set ⇒ **Run** mode. Frozen at Start so edits can't mutate a run.
- `runId: number` — incremented on Start/Restart; an effect keyed on it calls `timer.start()` after `committed` (and therefore the timer's internal `blocksRef`) has updated.
- `now: Date` — refreshed every 30 s so the setup preview's meal windows stay honest.
- `engineRef` — a single `AudioEngine` instance for the app's lifetime; disposed on unmount.

Preview vs. run: setup shows `buildSchedule(cfg, now)` recomputed live; Start freezes a `buildSchedule(cfg, new Date())` into `committed`.

## Data flow

```
cfg/audio ──> buildSchedule() ──> Block[] ──┐
                                            ├─> useTimer(blocks) ──> {status,index,remaining,currentBlock}
Start (runId++) ──> effect ──> timer.start()┘                              │
                                                                           ▼
                              RunScreen ──> Display (LCD)  +  AudioController (audioActive)
                                            audioActive = running && source≠none && !(pauseOnBreak && onBreak)
```

`AudioController` is a headless/near-headless component: it renders nothing for synthesised sources (drives `AudioEngine` via effects), a hidden `<audio>` for podcast/media, and a visible iframe only for YouTube.

## Key types (`src/types.ts`)

- `BlockType = "focus" | "short" | "long" | "breakfast" | "lunch" | "dinner"`
- `Block { type, duration (sec), focusIndex?, label }`
- `SessionConfig`, `MealConfig`, `AudioConfig`, `AudioSource`, `BinauralPreset`

`types.ts` is the single source of truth — extend types there, not inline.
