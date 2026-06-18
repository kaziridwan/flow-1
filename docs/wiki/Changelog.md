# Changelog

Append-only, newest first. **Every session adds an entry** (see the Documentation protocol in `CLAUDE.md`). Keep entries terse: date · what · why · files.

---

## 2026-06-18 · Add GPL-3.0 license
**What:** Added a `LICENSE` file with the verbatim GNU GPL-3.0 text, set `package.json` `license` to `GPL-3.0-or-later` and `author` to Kazi Ridwan, and added a License section to the README.
**Why:** The project had no license; chose GPL-3.0 (copyleft) so derivatives stay open.
**Files:** `LICENSE` (new), `package.json`, `README.md`.

## 2026-06-18 · Lock background scroll while a modal is open
**What:** Opening a designer `Sheet` now locks `document.body` scroll (ref-counted, with scrollbar-width padding compensation to avoid a layout shift) and the panel gets `overscroll-contain`. Scrolling over the modal backdrop or panel whitespace no longer scrolls the page behind it.
**Why:** Scroll chaining — the `fixed inset-0` overlay didn't block wheel/trackpad scroll from reaching the body.
**Files:** `src/components/Sheet.tsx`.

## 2026-06-18 · v0.4.0: binaural timing functions, value locking, built-in presets
**What:** (1) **Timing functions** — each keyframe carries a CSS-style `transition` (linear/ease/ease-in/ease-out/step-start/step-end or a validated `cubic-bezier(...)`) governing the glide to the next keyframe; default linear. New `src/lib/easing.ts` (parse/validate + eased progress + cubic-bezier solver + curve sampling). The engine samples eased segments into short ramps (steps → jumps), `interpolateBinaural` and the sparkline are ease-aware, and the editor shows a per-keyframe dropdown + custom bezier input + curve preview. (2) **Value locking** — keyframes expose **Left / Right / Diff** (right = left + diff), all editable; the Left>Right>Diff precedence decides what recomputes, and locking a field holds it (`resolveFreqEdit`, unit-tested). (3) **Built-in presets** — "20 Minute Power Nap" and "25 Minute Study" keyframed tracks, applied (apply-only) from the Binaural Engine. Version bumped to 0.4.0.
**Why:** v0.4.0 — richer, more musical binaural design (eased glides, precise ear/offset control, ready-made tracks).
**Files:** `src/lib/easing.ts` (+test, new), `src/lib/audio.ts`, `src/lib/audioDesign.ts` (+test), `src/components/{BinauralEngine,PresetControls}.tsx`, `src/types.ts`, `package.json`.

## 2026-06-18 · Reliable media autoplay when the run is playing
**What:** YouTube / podcast / media-URL sources now start automatically when the session is in the play state. YouTube creates with `autoplay` matching the mount-time play state and `onReady` enforces play/pause via a live `activeRef` (no longer reads a stale `active` from the player-creation closure); the `<audio>` element switched to `preload="auto"` + `playsInline`.
**Why:** v0.3 — media should begin with the session, not require a manual press; the IFrame API loads after the Start gesture, so `onReady` must act on the current state.
**Files:** `src/components/AudioController.tsx`.

## 2026-06-18 · Hide preset save form behind a "(select or create)" toggle
**What:** In `PresetControls` the name input + Save button are hidden by default; a "(select or create)" link beside the "Saved presets" title reveals them (toggles to "(close)"). Saved-preset chips stay visible. Applies to both the Noise Designer and Binaural Engine sheets (shared component).
**Why:** Keep the designer sheets uncluttered — saving is opt-in, applying an existing preset stays one tap.
**Files:** `src/components/PresetControls.tsx`.

## 2026-06-18 · Saved sound presets + manual meal placement
**What:** (1) **User presets** — save the current binaural track or noise design under a name, then apply/rename/delete it from inside the designer ⋯ sheet. New `presetStore` (a `localStorage`-backed external store via `useSyncExternalStore`) + shared `PresetControls` component. (2) **Manual meal placement** — `SessionConfig.mealSlots` pins a meal before a chosen focus session (overriding its clock window); drag a meal onto a focus block in the preview timeline to pin it, click the `pinned ✕` badge to revert to window placement. Unpinned meals stay window-driven.
**Why:** 0.2 follow-ups — quick reuse of favorite sounds across sessions, and real control over where meals land.
**Files:** `src/lib/presetStore.ts` (new), `src/components/PresetControls.tsx` (new), `src/components/{NoiseDesigner,BinauralEngine,SchedulePreview,SetupScreen}.tsx`, `src/lib/schedule.ts`, `src/lib/schedule.test.ts`, `src/types.ts`, `src/App.tsx`.

## 2026-06-18 · Binaural keyframe: left/right wave fields + band dropdown
**What:** Renamed the keyframe carrier field **Base → Left Hz** and added a read-only **Right Hz** (= left + beat, updates with either). The per-keyframe band chip is now a **Band dropdown** (Delta/Theta/Alpha/Beta/Gamma); picking one snaps the beat to that band's representative frequency (1/5/10/20/40 Hz). Added a `beat` value to each `BINAURAL_BANDS` entry.
**Why:** 0.2 follow-up — make both ears' frequencies visible and let users dial a target brain state without knowing the exact beat Hz.
**Files:** `src/lib/audioDesign.ts`, `src/components/BinauralEngine.tsx`.

## 2026-06-18 · Binaural keyframe list: auto-scroll on add + zebra striping
**What:** Adding a keyframe now smooth-scrolls the ⋯ sheet down to the Frequency guide (bringing the full keyframe list + controls into view), and alternate keyframe cards get a slightly darker gradient to make adjacent keyframes easy to tell apart.
**Why:** Quality-of-life on the Binaural Engine editor — less manual scrolling, clearer row separation.
**Files:** `src/components/BinauralEngine.tsx`.

## 2026-06-18 · Separate break sound + Binaural Engine polish
**What:** (1) **Separate background sound for breaks** — with "mute during breaks" off, a "Different sound for breaks" toggle reveals a full sound picker; that sound plays during breaks and the focus sound resumes after. Extracted a `SoundConfig` (the playable part: category + designs + volume), refactored `AudioPicker` into a reusable `SoundPicker`, and `AudioController` now takes the **effective** `SoundConfig` chosen by `RunScreen` (focus, or break sound on a break). (2) **Binaural Engine fixes:** the ⋯ sheet no longer **scrolls to top** when editing/adding a keyframe (Sheet re-focused on every parent render — now focuses only on open); a **Frequency guide** (Delta→Gamma band table, per the reference) plus a per-keyframe band chip; and the HH:MM:SS time input now **selects-all on focus**, accepts `H:MM:SS`/`MM:SS`/seconds, and clamps instead of silently reverting.
**Why:** 0.2 follow-ups — break music was tied to the focus sound, the keyframe editor lost your scroll position, users had no cue what brainwave band a beat targets, and time entry was fiddly.
**Files:** `src/types.ts`, `src/lib/audioDesign.ts`, `src/lib/audioDesign.test.ts`, `src/components/{AudioPicker,AudioController,RunScreen,BinauralEngine,Sheet}.tsx`, `docs/wiki/{Features,Internals,Decisions,Architecture}.md`.

## 2026-06-17 · Binaural Engine: live preview + scrub cursor, locked endpoints, 2.5 h, HH:MM:SS
**What:** Added a **Preview** play/stop button to the Binaural Engine (mirrors the Noise Designer) that plays the keyframed track live, with a **draggable cursor** over the sparkline for scrubbing/seeking; the button label shows the cursor time. Raised max track length **30 min → 2.5 h**, switched keyframe time inputs to **HH:MM:SS** (commit on blur/Enter), and **locked the first/last keyframe times** (first pinned to 0, last to track length and auto-updated when length changes; both non-removable). New `hms`/`parseHms` in `format.ts`; `AudioEngine.playBinauralTrack`/`scheduleBinaural` gained an `offsetSec` seek with phase-synced looping; threaded `engine`+`masterVolume` into `BinauralEngine`.
**Why:** 0.2 follow-up — you couldn't hear a binaural track while designing it or scrub it, minute-only times were too coarse for long tracks, and the endpoints must satisfy the `BinauralDesign` invariant.
**Files:** `src/components/BinauralEngine.tsx`, `src/components/AudioPicker.tsx`, `src/lib/audio.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`, `docs/wiki/{Features,Internals,Decisions}.md`.

## 2026-06-17 · Fix Cloudflare deploy: Workers Static Assets config
**What:** Replaced `pages_build_output_dir = "dist"` in `wrangler.toml` with an `[assets]` block (`directory = "./dist"`, `not_found_handling = "single-page-application"`).
**Why:** Cloudflare's Workers Builds flow runs `wrangler deploy`, which ignores `pages_build_output_dir` and failed with "Missing entry-point to Worker script or to assets directory". The `[assets]` block serves `dist/` as a static-assets Worker with SPA fallback. Verified `wrangler deploy --dry-run` reads `./dist`.
**Files:** `wrangler.toml`, `docs/wiki/Deployment.md`.

## 2026-06-17 · Fix Cloudflare build: single lockfile + pinned pnpm
**What:** Removed the stray `package-lock.json` (npm artifact) so `pnpm-lock.yaml` is the only lockfile, and added `"packageManager": "pnpm@10.34.3"` to `package.json`.
**Why:** Cloudflare failed with `ERR_PNPM_OUTDATED_LOCKFILE` ("specifiers in the lockfile …") — two committed lockfiles made CI package-manager detection ambiguous and risked a pnpm version skew. Verified `CI=true pnpm install --frozen-lockfile` passes.
**Files:** `package.json`, `package-lock.json` (deleted), `docs/wiki/Deployment.md`.

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
