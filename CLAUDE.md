# CLAUDE.md

Operating instructions for any Claude Code agent working in this repository. Read this first, then `docs/roadmap/handoff.md`, then `docs/wiki/Home.md`.

## What this project is

**FLOW-1** is a browser-only Pomodoro focus instrument with a neumorphic / teenage-engineering aesthetic. It plans a run of focus sessions, auto-inserts meal breaks around the real start time, and plays in-browser audio (synthesised noise/binaural beats, or YouTube / podcast / media URLs) to help sustain flow. No backend, no accounts — it deploys as static files.

It is the web entry of a larger envisioned focus ecosystem (website/app blocking, wearable heart-rate → adaptive binaural beats). Those are **not** built here yet; see `docs/wiki/Roadmap.md`.

## Stack & commands

- Vite 6 · React 19 · TypeScript (strict) · Tailwind CSS v4 (`@tailwindcss/vite`, no `tailwind.config` — tokens live in `src/index.css` under `@theme`).
- Audio: Web Audio API + YouTube IFrame API. No audio files shipped.

```bash
npm install
npm run dev      # dev server
npm run build    # tsc -b && vite build  — MUST pass before any handoff
npm run preview  # serve the production build
```

**Always run `npm run build` before finishing a task.** TypeScript is strict (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`). The build is the gate.

## Conventions

- **Type-only imports** must use `import type { … }` (verbatimModuleSyntax is on).
- **Styling**: Tailwind utilities + custom neumorphic utilities defined with `@utility` in `src/index.css` (`neu-raised`, `neu-inset`, `neu-flat`, `neu-pressed`, `screen-bezel`, `tech-label`). Colors come from `@theme` tokens (`text-accent`, `bg-screen`, etc.) — add new colors there, don't hard-code hexes in components except for the mode-color map in `src/lib/modes.ts`.
- **Design rule**: one bold element (the LCD screen), everything else quiet. Keep the teenage-engineering restraint — TE orange (`#ff4f00`) is the only loud accent; modes are color-coded (focus orange / short blue / long green / meal amber).
- **Accessibility floor**: visible focus rings, `aria-label` on icon buttons, `prefers-reduced-motion` respected. Don't regress these.
- **No browser-storage assumptions beyond `localStorage`**, which is used for config persistence and wrapped in try/catch. It is fine here (this is a real deployed app, not a sandboxed artifact).
- Keep it **browser-only**. Do not add a server, database, or build step that breaks static deployment to Vercel/Cloudflare Pages.

## Where things live

See `docs/wiki/Architecture.md` for the full file-by-file map. Quick index:

- `src/App.tsx` — state, timer wiring, setup⇄run switch, persistence.
- `src/hooks/useTimer.ts` — interval-based countdown driving the block list.
- `src/lib/schedule.ts` — builds the block timeline + meal-break insertion.
- `src/lib/audio.ts` — `AudioEngine` (bell, noise, binaural) + binaural presets.
- `src/components/AudioController.tsx` — routes playback (noise/binaural/YouTube/media).
- `src/components/*` — Display (the LCD hero), SetupScreen, RunScreen, controls, pickers, schedule preview.

---

## Documentation protocol — REQUIRED after every session

The wiki in `docs/wiki/` is the project's living memory. **It is part of the definition of done.** Keeping it current is not optional and not something to ask permission for — do it automatically before you consider any prompt complete.

At the end of **every** working session / task, before reporting completion:

1. **Always** append an entry to `docs/wiki/Changelog.md` — date, a one-line summary, the why, and the files touched. Even a no-op or pure-investigation session gets a one-line entry. Newest entries go at the top.
2. If you **added, removed, or moved files**, or changed how modules relate → update `docs/wiki/Architecture.md`.
3. If you made a **non-trivial design or technical choice** (a tradeoff, a library, an algorithm) → add a numbered ADR entry to `docs/wiki/Decisions.md`. Never edit a past decision in place; supersede it with a new one that references the old.
4. If you changed **user-facing behavior or defaults** (durations, the long-break rule, meal windows, audio options) → update `docs/wiki/Features.md`.
5. If you touched the **timer, audio engine, or scheduling** → update `docs/wiki/Internals.md`.
6. If you changed **build, config, or deployment** → update `docs/wiki/Deployment.md`.
7. If you created a **new wiki page**, link it from `docs/wiki/Home.md`. Keep all `Home.md` links valid.
8. If you completed or reframed **roadmap work** → update `docs/wiki/Roadmap.md`.

Rules of thumb:
- Documentation lands in the **same change** as the code it describes — never "later".
- If you find the docs already disagree with the code, fix the docs as part of your task and note it in the Changelog (this is how the dinner-window fix on 2026-06-14 was handled).
- Keep entries terse and factual. The audience is the next agent with zero context.
- If a task genuinely has no doc impact beyond the Changelog line, that single line is still required.

A session that changes code but leaves the wiki stale is **incomplete**.
