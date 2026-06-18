# FLOW-1 · pomodoro unit

A browser-only focus timer with a **neumorphic / teenage-engineering** instrument feel. Plan a run of focus sessions, let it place meal breaks around your real start time, and stay in flow with binaural beats, noise, YouTube, a podcast or any media URL — all generated or played **entirely in your browser**. No backend, no accounts, no data leaves the page.

> Part of an ecosystem for staying in focus and sustaining flow state.

## Deploy

Replace `kaziridwan/flow-1` in the links below with your repository, then click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kaziridwan/flow-1)
&nbsp;
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kaziridwan/flow-1)
&nbsp;
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/kaziridwan/flow-1)
&nbsp;
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/kaziridwan/flow-1)

All four build with `pnpm run build` and serve the static `dist/` folder. Settings are pre-wired in `vercel.json` (framework: Vite) and `wrangler.toml` (`pages_build_output_dir = "dist"`). Netlify and Render auto-detect the Vite build command and `dist/` output with no extra config files needed.

## Features

- **Session builder** — total sessions, focus duration (default 25 min), short break (5 min) and long break (15 min).
- **Smart long breaks** — a long break replaces the short one after every 4th focus session, unlocked once you schedule 5 or more sessions.
- **Meal breaks** — enable breakfast, lunch and/or dinner; each is inserted only if a focus block would begin inside its time window, so the plan follows your actual start time.
- **Transition bell** — a soft chime on every phase change, toggleable.
- **Background sound** — white / pink / brown noise and binaural beats are synthesised live with the Web Audio API; or play a **YouTube** video, a **podcast** audio URL, or any **media URL**. Optionally mute audio during breaks.
- **Live timeline preview** — see every block with clock times and the projected end time before you start.
- **Remembers your setup** locally between visits.

## Stack

- [Vite 6](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) (via `@tailwindcss/vite`)
- Web Audio API + the YouTube IFrame API — no audio assets shipped
- 100% client-side; deploys as static files

## Develop

```bash
pnpm install
pnpm run dev      # start the dev server
pnpm run build    # type-check + production build to dist/
pnpm run preview  # preview the production build
```

## Notes

- **Binaural beats need stereo headphones** — the effect comes from a small frequency offset between the left and right ears.
- Browsers only allow audio after a user gesture, so sound begins when you press **Start**.
- The **podcast / media URL** field expects a direct audio or video file URL. Many podcast page links are not direct media; use the underlying `.mp3`/`.m4a` URL.

## How meal breaks are placed

Default windows: Breakfast 07:00–09:30 · Lunch 12:00–14:30 · Dinner 18:30–21:00. As the schedule is laid out from your start time, a meal is inserted right before the next focus block whenever the clock sits inside an enabled, not-yet-taken window. Adjust each meal's length in the setup panel.

## License

Copyright (C) 2026 Kazi Ridwan.

FLOW-1 is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License** as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. It is distributed in the hope that it will be useful, but **WITHOUT ANY WARRANTY**; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [`LICENSE`](./LICENSE) file (GPL-3.0) for the full text, or <https://www.gnu.org/licenses/>.

---

Built as a single-purpose instrument: one bold screen, everything else quiet.
