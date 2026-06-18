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

**Manual placement.** In the **Preview** timeline you can **drag a meal onto a focus block** to pin it right before that focus session, overriding its clock window (`SessionConfig.mealSlots`). Pinned meals show a `pinned ✕` badge — click it to revert to window-based placement. Meals without a pin stay window-driven. (Native drag-and-drop, so desktop only for now.)

Setup section order is **01 Session · 02 Sound · 03 Meal breaks · 04 Preview**. The **Meal breaks** and **Preview** (timeline / clock times / projected end) cards are collapsible and **collapsed by default** — tap the header to expand.

## Background sound

Chosen from **four categories** (default **Binaural / Flow**, volume 60%, "mute during breaks" on):

| Category | What it offers |
|---|---|
| Silent | nothing |
| **Noise** | a noise color — White / Pink / Brown / Blue — synthesised live via Web Audio API. ⋯ opens the **Noise Designer**: an X/Y pad blending all four colors, a low-pass filter (cutoff + resonance), a noise volume, and a **Preview** play/stop button that plays the design live as you tweak it. |
| **Binaural** | two-oscillator stereo beats; presets below. ⋯ opens the **Binaural Engine**: a track length (1 min – **2.5 h**) plus keyframes (time in **HH:MM:SS**, base carrier, beat offset, volume) that glide between values and loop. The first/last keyframe times are **locked** (first at 0, last at the track length — the last follows length changes) and can't be removed. A **Preview** play/stop button plays the track live; a **draggable cursor** over the sparkline scrubs/seeks and the button shows the cursor time. Each keyframe shows **Left / Right / Diff Hz** (right = left + diff), all editable — by default Left>Right>Diff precedence decides what recomputes, and a **lock** on any one holds it constant while you edit the others. A **Band dropdown** (Delta/Theta/Alpha/Beta/Gamma) snaps the diff to a representative beat (1/5/10/20/40 Hz); a collapsible **Frequency guide** explains the bands. Every keyframe (except the last) has a **Transition** timing function for the glide to the next — `linear` (default) / `ease` / `ease-in` / `ease-out` / `step-start` / `step-end`, or a custom validated `cubic-bezier(x1,y1,x2,y2)` — shown with a small curve preview. **Built-in presets** "20 Minute Power Nap" and "25 Minute Study" can be applied from the engine alongside your saved ones. |
| **Custom Media** | sub-tabs: **YouTube** (visible IFrame player), **Podcast** (hidden `<audio>`, direct media URL), **Media URL** (hidden `<audio>`). |

**Binaural presets** (`src/lib/audioDesign.ts`): Flow 180 Hz / 10 Hz beat (alpha) · Deep focus 210 Hz / 16 Hz (beta) · Calm 150 Hz / 6 Hz (theta). Needs stereo headphones.

**Saved presets.** For Noise and Binaural you can **save the current design under a name**, then apply / rename / delete it — from inside the designer ⋯ sheet (Noise Designer / Binaural Engine). The save form is hidden until you tap **"(select or create)"** next to the "Saved presets" title; saved chips are always shown. Presets persist in the browser (`localStorage["flow.presets"]`).

**Break sound.** Each sound carries its own volume. With **"mute during breaks" off**, a **"Different sound for breaks"** toggle reveals a second full sound picker; that sound plays during breaks (seeded from your focus sound) and the focus sound resumes after. Left off, the focus sound simply continues through breaks (unchanged behavior).

Focus audio is active when: `status === running && category ≠ none && !(pauseOnBreak && currentBlock is a break)`. On a break with a separate break sound configured, that sound plays instead. It starts on the **Start** press (browsers require a user gesture).


## Run mode

- LCD shows mm:ss, current mode (color-coded), a within-block progress bar, and one LED dot per focus session.
- Transport: **Stop** (back to Patch), **Pause/Resume**, **Skip phase**. Keyboard: **Space** = pause/resume, **n** = skip.
- Phase changes are announced to screen readers via an `aria-live` region.
- "Now playing" strip shows the active source and on/break/idle state. On a break with "mute during breaks" on, synthesised audio **crossfades** out and back (no gap).
- On completion: a "Session complete" panel with **Restart** (same plan, fresh start time) and **New session**.

## Persistence

`cfg` and `audio` are saved to `localStorage` and restored on load — `cfg` shallow-merged over defaults, `audio` normalised through a versioned `migrateAudio()` (ADR-9). An in-progress **run** is also persisted (`localStorage["flow.run"]`) and restored on reload, fast-forwarded to the current time (ADR-13); it auto-resumes (audio resumes on the next user gesture).

## Mode colors (`src/lib/modes.ts`)

focus `#ff4f00` · short `#2b8cff` · long `#16b06a` · meals `#f5a623`.
