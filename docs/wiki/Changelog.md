# Changelog

Append-only, newest first. **Every session adds an entry** (see the Documentation protocol in `CLAUDE.md`). Keep entries terse: date · what · why · files.

---

## 2026-06-17 · 0.2.0: reorder setup, collapse meal breaks
**What:** Reordered the Setup sections to **01 Session · 02 Sound · 03 Meal breaks · 04 Preview** (Sound moved above Meal breaks) and made **Meal breaks** collapsible, collapsed by default (like Preview).
**Why:** Sound is the more common edit; meal breaks and the timeline are secondary, so they stay tucked away by default.
**Files:** `src/components/SetupScreen.tsx`.

## 2026-06-17 · 0.2.0: Noise preview button + collapsible timeline preview
**What:** (1) Added a **Preview play/stop button** to the Noise Designer — plays the noise live and reflects pad/filter/volume edits in real time (play icon → stop icon + pulsing dot); stops on toggle-off or sheet close. Threaded the shared `AudioEngine` (and master volume) from `App` → `SetupScreen` → `AudioPicker` → `NoiseDesigner` so setup-time preview reuses the one engine instance (ADR-15). (2) Made the Setup **"04 · Preview"** timeline card **collapsible, collapsed by default**.
**Why:** 0.2 follow-up — you couldn't hear a noise design while building it, and the timeline card took up space by default.
**Files:** `src/components/NoiseDesigner.tsx`, `src/components/SetupScreen.tsx`, `src/components/AudioPicker.tsx`, `src/App.tsx`.

## 2026-06-17 · Rename llm-docs → agents-context
**What:** Renamed the `llm-docs/` directory (agent input docs / plan sources) to `agents-context/` and updated every reference.
**Why:** Clearer name for the agent-context directory.
**Files:** `agents-context/` (renamed from `llm-docs/`), `.gitignore`, `CLAUDE.md`, `docs/wiki/Roadmap.md`, `docs/plans/20260617091148-road-to-v1.md`.

## 2026-06-17 · Docs: switch command examples to pnpm
**What:** Replaced `npm` with `pnpm` in all command examples across the docs (`pnpm install` / `pnpm run dev|build|preview` / `pnpm test`).
**Why:** Standardise on pnpm as the project package manager.
**Files:** `CLAUDE.md`, `README.md`, `docs/roadmap/handoff.md`, `docs/plans/20260617091148-road-to-v1.md`, `docs/wiki/{Changelog,Architecture,Internals,Deployment}.md`.

## 2026-06-17 · Road-to-v1 Phase 4: reliability & UX hardening
**What:** (1) **aria-live** phase announcements + **keyboard transport** (Space = pause/resume, n = skip) in `RunScreen`. (2) **Persist an in-progress run** across reloads — `src/lib/runStore.ts` snapshots `{blocks, startMs, index, remaining, status}` at each block boundary/pause and fast-forwards to the wall clock on load; `useTimer` gained a `restore()`; `App` restores on mount and clears on stop/complete. (3) **Crossfade** noise/binaural on break mute instead of a hard restart — the engine added a per-tone `fade` gain + `duck()`, and the controller now keeps the tone alive across breaks (new `running`/`muted` props) and ramps it.
**Why:** Close the long-standing tech-debt items (no a11y on the timer, no run persistence, audio gap on breaks) for a release-grade v1. See ADR-13 (run persistence) + ADR-14 (crossfade).
**Files:** `src/lib/runStore.ts`, `src/lib/audio.ts`, `src/hooks/useTimer.ts`, `src/components/RunScreen.tsx`, `src/components/AudioController.tsx`, `src/App.tsx`.

## 2026-06-17 · Road-to-v1 Phase 3: Binaural Engine (keyframed tracks)
**What:** Added the Binaural Engine behind the Binaural card's ⋯ sheet: a track length + a list of **keyframes** (time, base carrier, beat offset, volume) with add/remove/edit and a base-frequency sparkline. The engine grew `playBinauralTrack()` — left=base / right=base+beat / gain interpolated via `linearRampToValueAtTime` across keyframes, looping by re-anchoring the schedule each pass; idempotent so editing reschedules without restarting the oscillators (no click). Added pure helpers `interpolateBinaural`/`sortKeyframes` (+ `audioDesign.test.ts`). Replaces the interim flat first-keyframe playback; `playBinaural` removed.
**Why:** Deliver the evolving-binaural vision and the live-retarget hook the Roadmap names for future HR adaptation. See ADR-12 (supersedes the binaural interim of ADR-10).
**Files:** `src/lib/audio.ts`, `src/lib/audioDesign.ts`, `src/lib/audioDesign.test.ts`, `src/components/BinauralEngine.tsx`, `src/components/AudioPicker.tsx`, `src/components/AudioController.tsx`.

## 2026-06-17 · Road-to-v1 Phase 2: Noise Designer (X/Y blend + low-pass)
**What:** Added a real Noise Designer behind the Noise card's ⋯ sheet: an Endel-style **X/Y blend pad** (`XYPad`, pointer + keyboard) over the four noise colors, a **low-pass filter** (toggle + cutoff + resonance), and a noise-level volume. The engine grew `playNoiseBlend()` — four looping noise sources run simultaneously through per-color gains into one shared `BiquadFilter` (lowpass) → design gain → master — with click-free live updates via `setTargetAtTime`. Replaces the interim dominant-corner playback; removed the now-dead `dominantColor` helper.
**Why:** Deliver the customizable-noise vision from the road-to-v1 plan. See ADR-11 (supersedes the noise interim of ADR-10).
**Files:** `src/lib/audio.ts`, `src/lib/audioDesign.ts`, `src/components/NoiseDesigner.tsx`, `src/components/XYPad.tsx`, `src/components/AudioPicker.tsx`, `src/components/AudioController.tsx`.

## 2026-06-17 · Road-to-v1 Phase 1: categorized Sound panel (v2 audio model)
**What:** Replaced the flat 8-source audio picker with **4 categories** (Silent · Noise · Binaural · Custom Media). Introduced the v2 `AudioSettings` model with per-category designs (`NoiseDesign`, `BinauralDesign`, media kind+url). Noise/Binaural cards carry a ⋯ button that opens a (placeholder) designer sheet; Custom Media has YouTube/Podcast/Media-URL sub-tabs. Added a `blue` noise color to the engine (4-corner blend model). New `Sheet` modal primitive (Esc/backdrop close, focus trap).
**Why:** The old panel was overcrowded (against ADR-6 restraint); this is the foundation for the Noise Designer and Binaural Engine. See ADR-10.
**Files:** `src/types.ts`, `src/lib/audioDesign.ts`, `src/lib/audio.ts`, `src/components/AudioPicker.tsx`, `src/components/AudioController.tsx`, `src/components/RunScreen.tsx`, `src/components/SetupScreen.tsx`, `src/components/Sheet.tsx`, `src/App.tsx`.

## 2026-06-17 · Road-to-v1 Phase 0: test harness + audio config migration
**What:** Added **Vitest** (`pnpm test`) with unit tests for `schedule.ts` (long-break rule, meal placement, no trailing break) and `format.ts` (`youtubeId`, `mmss`, `humanDuration`) — 26 tests. Added `src/lib/migrate.ts` (`migrateAudio`) + `src/lib/audioDesign.ts` (pure design helpers/defaults), replacing the shallow `localStorage` merge for audio with a versioned migration (v1 flat-source → v2 `AudioSettings`). Test files excluded from the production build.
**Why:** Highest-ROI safety net + schema versioning before reshaping the audio model. Closes Roadmap "Tests" and "Config migration" (audio). See ADR-9.
**Files:** `package.json`, `vitest.config.ts`, `tsconfig.app.json`, `src/lib/{schedule,format,migrate}.test.ts`, `src/lib/migrate.ts`, `src/lib/audioDesign.ts`, `src/types.ts`.

## 2026-06-17 · Roadmap: AWS, GCP, Azure deployment plans
**What:** Added a "Cloud provider deployments" section to `Roadmap.md` covering AWS (S3/CloudFront or Amplify), GCP (Firebase Hosting), and Azure (Static Web Apps).
**Why:** Future work to expand deploy targets beyond Vercel, Cloudflare, Netlify, and Render.
**Files:** `docs/wiki/Roadmap.md`.

## 2026-06-17 · Added Netlify and Render deploy buttons
**What:** Added one-click deploy buttons for Netlify and Render to `README.md`; documented both targets in `Deployment.md`.
**Why:** Netlify and Render are widely used for static Vite sites and needed no extra config files — easy wins alongside the existing Vercel and Cloudflare buttons.
**Files:** `README.md`, `docs/wiki/Deployment.md`.

## 2026-06-17 · Moved handoff into docs/roadmap/
**What:** Relocated `claude-code-handoff.md` (repo root) → `docs/roadmap/handoff.md` and fixed every pointer to it.
**Why:** Keep entry-point docs under `docs/` instead of the repo root; group it with roadmap material.
- Moved the file; created `docs/roadmap/`.
- Updated the read-order pointer in `CLAUDE.md` and the "Start here" link in `docs/wiki/Home.md` (`../roadmap/handoff.md`).
- Historical Changelog entries below still name the old path as a record of what happened then — left unchanged.
**Files:** `docs/roadmap/handoff.md` (moved), `CLAUDE.md`, `docs/wiki/Home.md`.

## 2026-06-14 · Claude Code handoff package + dinner-window fix
**What:** Added the handoff docs and wiki; fixed a code/doc inconsistency.
**Why:** Prepare the repo for ongoing work in Claude Code with documentation that stays current.
- Re-reviewed source; found the dinner meal window was `18:00–21:00` in code but documented as `18:30`. Changed `MEAL_WINDOWS.dinner` to **18:30–21:00** (more sensible default, matches docs). See ADR-8. Rebuilt — passes.
- Added `CLAUDE.md` (agent instructions + **mandatory wiki-update protocol**), `claude-code-handoff.md` (entry point, status, tech debt, next steps).
- Created `docs/wiki/`: Home, Architecture, Features, Internals, Decisions (ADR-1…8), Deployment, Roadmap, this Changelog.
**Files:** `src/lib/schedule.ts`, `CLAUDE.md`, `claude-code-handoff.md`, `docs/wiki/*`.

## 2026-06-14 · Initial FLOW-1 build
**What:** Built the browser-only Pomodoro instrument from scratch.
**Why:** First proof-of-concept of the focus app.
- Scaffolded Vite 6 + React 19 + TS + Tailwind v4. Neumorphic / teenage-engineering UI.
- Session builder (sessions, focus/short/long), long-break-every-4 rule (5+ sessions), meal-break insertion by clock window, transition bell.
- Audio: synthesised white/pink/brown noise + binaural presets (Web Audio API), YouTube (IFrame API), podcast/media URL; mute-on-break.
- Interval-based deadline timer; live timeline preview; `localStorage` persistence.
- Deploy config for Vercel (`vercel.json`) + Cloudflare Pages (`wrangler.toml`); README with deploy buttons. `pnpm run build` passes (~70 kB gz JS).
**Files:** entire `src/`, `index.html`, configs, `README.md`.
