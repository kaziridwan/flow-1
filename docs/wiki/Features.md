# Features

User-facing behavior. When you change any value or rule here, update this page in the same commit.

## Session builder (Patch mode)

| Control | Default | Range / step |
|---|---|---|
| Sessions | 4 | 1–16, step 1 |
| Focus | 25 min | 5–90, step 5 |
| Short break | 5 min | 1–30, step 1 |
| Long break | 15 min | 5–60, step 5 |
| Transition bell | on | on/off |

## Long-break rule

A long break replaces the short break **after every 4th focus session**, and only when the plan has **5 or more sessions**. With the default 4 sessions, no long break appears. Constants: `LONG_BREAK_EVERY = 4`, `LONG_BREAK_MIN_SESSIONS = 5` (`src/lib/schedule.ts`). The last focus session never has a trailing break.

## Meal breaks

Each meal can be toggled and given a duration. A meal is inserted into the timeline **only if a focus block would begin inside its clock window** and the meal hasn't already been taken — so meals follow the real start time. Checked at focus-block boundaries (see [Internals](./Internals.md)).

| Meal | Default | Duration default | Window |
|---|---|---|---|
| Breakfast | off | 30 min | 07:00–09:30 |
| Lunch | **on** | 45 min | 12:00–14:30 |
| Dinner | off | 45 min | 18:30–21:00 |

Meal duration adjustable 10–90 min (step 5). Windows are fixed in `MEAL_WINDOWS` (`src/lib/schedule.ts`).

## Background sound

Selectable source (default **binaural / Flow**, volume 60%, "mute during breaks" on):

| Source | How it plays |
|---|---|
| Silent | nothing |
| White / Pink / Brown noise | synthesised live via Web Audio API |
| Binaural beats | two-oscillator stereo, presets below |
| YouTube | YouTube IFrame API player (visible) |
| Podcast URL | hidden `<audio>` element — **direct media URL** |
| Media URL | hidden `<audio>` element |

**Binaural presets** (`src/lib/audio.ts`): Flow 180 Hz / 10 Hz beat (alpha) · Deep focus 210 Hz / 16 Hz (beta) · Calm 150 Hz / 6 Hz (theta). Needs stereo headphones.

Audio is active when: `status === running && source ≠ none && !(pauseOnBreak && currentBlock is a break)`. It starts on the **Start** press (browsers require a user gesture).

## Run mode

- LCD shows mm:ss, current mode (color-coded), a within-block progress bar, and one LED dot per focus session.
- Transport: **Stop** (back to Patch), **Pause/Resume**, **Skip phase**.
- "Now playing" strip shows the active source and on/break/idle state.
- On completion: a "Session complete" panel with **Restart** (same plan, fresh start time) and **New session**.

## Persistence

`cfg` and `audio` are saved to `localStorage` and restored on load (shallow-merged over defaults). An in-progress **run** is not yet persisted across reloads (see Roadmap).

## Mode colors (`src/lib/modes.ts`)

focus `#ff4f00` · short `#2b8cff` · long `#16b06a` · meals `#f5a623`.
