# Deployment

Static SPA. `pnpm run build` runs `tsc -b && vite build` and emits `dist/` (`index.html` + hashed `assets/`). Serve `dist/` as static files anywhere.

## Package manager — pnpm only

**This is a pnpm project. The only committed lockfile is `pnpm-lock.yaml`.** Never run `npm install`/`yarn` here — that drops a second lockfile (`package-lock.json`) which makes CI package-manager detection ambiguous and breaks deploys (Cloudflare ran pnpm with the CI-default `--frozen-lockfile` and failed `ERR_PNPM_OUTDATED_LOCKFILE`). `package.json` pins `"packageManager": "pnpm@10.34.3"` so Cloudflare/Vercel/etc. use the same pnpm that produced the lockfile (via corepack). Bump that field and regenerate the lockfile together.

## Build gate

`pnpm run build` **must pass** before any handoff — it type-checks (strict) and bundles. Current output is ~71 kB gzipped JS + ~4.6 kB gzipped CSS. `pnpm test` runs the Vitest unit suite (pure logic: schedule, format, migration); test files are excluded from the build and ship nothing.

## Vercel

`vercel.json` sets `framework: vite` and a SPA rewrite. The deploy button in `README.md` points at `https://vercel.com/new/clone?repository-url=…`. Replace `kaziridwan/flow-1` with the real repo. Vercel auto-detects build command `pnpm run build` and output `dist`.

## Cloudflare Pages

`wrangler.toml` sets `pages_build_output_dir = "dist"`. The README button points at `https://deploy.workers.cloudflare.com/?url=…`. In the Pages dashboard the equivalent settings are build command `pnpm run build`, output directory `dist`.

## Netlify

No config file needed — Netlify auto-detects Vite and uses `pnpm run build` / output `dist`. The README button points at `https://app.netlify.com/start/deploy?repository=…`. Replace `kaziridwan/flow-1` with the real repo.

## Render

No config file needed — Render's Static Site type auto-detects `pnpm run build` and serves `dist`. The README button points at `https://render.com/deploy?repo=…`. Replace `kaziridwan/flow-1` with the real repo.

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
| `vitest.config.ts` | Vitest unit-test config (node env, `src/**/*.test.ts`) |
| `vercel.json` | Vercel framework + SPA rewrite |
| `wrangler.toml` | Cloudflare Pages output dir |
| `tsconfig*.json` | strict TS, project references (`app` + `node`) |
| `.gitignore` | excludes `node_modules`, `dist`, `.vercel`, `.wrangler`, tsbuildinfo |
