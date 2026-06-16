# Deployment

Static SPA. `pnpm run build` runs `tsc -b && vite build` and emits `dist/` (`index.html` + hashed `assets/`). Serve `dist/` as static files anywhere.

## Build gate

`pnpm run build` **must pass** before any handoff — it type-checks (strict) and bundles. Current output is ~70 kB gzipped JS + ~4.5 kB gzipped CSS.

## Vercel

`vercel.json` sets `framework: vite` and a SPA rewrite. The deploy button in `README.md` points at `https://vercel.com/new/clone?repository-url=…`. Replace `kaziridwan/flow-1` with the real repo. Vercel auto-detects build command `pnpm run build` and output `dist`.

## Cloudflare Pages

`wrangler.toml` sets `pages_build_output_dir = "dist"`. The README button points at `https://deploy.workers.cloudflare.com/?url=…`. In the Pages dashboard the equivalent settings are build command `pnpm run build`, output directory `dist`.

## Runtime dependencies on the network

Nothing server-side, but the page fetches at runtime:
- Google Fonts (Inter, JetBrains Mono) — from `index.html`.
- YouTube IFrame API — only if a YouTube source is selected.
- Whatever URL the user enters for podcast/media/YouTube.

All synthesised audio (noise, binaural, bell) is local. If you ever need a fully offline build, self-host the fonts.

## Config files at a glance

| File | Purpose |
|---|---|
| `vite.config.ts` | `react()` + `tailwindcss()` plugins |
| `vercel.json` | Vercel framework + SPA rewrite |
| `wrangler.toml` | Cloudflare Pages output dir |
| `tsconfig*.json` | strict TS, project references (`app` + `node`) |
| `.gitignore` | excludes `node_modules`, `dist`, `.vercel`, `.wrangler`, tsbuildinfo |
