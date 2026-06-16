# Changelog

Append-only, newest first. **Every session adds an entry** (see the Documentation protocol in `CLAUDE.md`). Keep entries terse: date · what · why · files.

---

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
- Deploy config for Vercel (`vercel.json`) + Cloudflare Pages (`wrangler.toml`); README with deploy buttons. `npm run build` passes (~70 kB gz JS).
**Files:** entire `src/`, `index.html`, configs, `README.md`.
