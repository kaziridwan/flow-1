# Roadmap

What's beyond the current proof-of-concept. The PoC is a complete Pomodoro instrument; everything below is unbuilt unless moved to [Features](./Features.md). Reorder/expand as priorities shift, and reflect completed work back into Features + Changelog.

## From the project brief (the larger focus ecosystem)

The brief frames FLOW-1 as one app in an ecosystem for sustaining flow. Two headline capabilities are named but **not built here**:

1. **Website / app blocking** — restrict distracting sites/apps during focus blocks. In a browser-only context this is limited (a web page can't block other apps); realistically needs a **browser extension** (declarativeNetRequest) and/or OS-level companion. Scope as a separate surface that shares the session state/contract.
2. **Wearable heart-rate → adaptive binaural beats** — read live heart rate from a wearable and modulate the binaural beat frequency toward a target. This needs a data source (e.g. a companion app streaming HR) and a cloud or local bridge; the web app would consume an HR stream and map deviation-from-baseline → beat Hz. The synthesised binaural engine in `src/lib/audio.ts` is already the hook point (`playBinaural(base, beat)` can be re-targeted live).

## Road to v1 (sound redesign + hardening)

Phased, incrementally shippable. Plan source: `agents-context/plans/20260617091148-road-to-v1.md`.

- ✅ **Phase 0 — test harness + audio config migration** (Vitest; `migrateAudio` v1→v2; pure `audioDesign` helpers).
- ✅ **Phase 1 — categorized Sound panel** (Silent/Noise/Binaural/Custom Media; `AudioSettings` v2; `Sheet` primitive; blue noise).
- ✅ **Phase 2 — Noise Designer**: X/Y blend pad over the 4 corners + low-pass (cutoff/Q/volume). Engine grew a simultaneous noise mixer (`playNoiseBlend`, per-color gains → one `BiquadFilter`), replacing the interim dominant-corner playback. See ADR-11.
- ✅ **Phase 3 — Binaural Engine**: keyframed track (base/beat/volume interpolated over a length, looping) via `playBinauralTrack`. Replaced the interim flat playback; subsumed "custom binaural entry". See ADR-12.
- ✅ **Phase 4 — reliability/UX hardening**: `aria-live` + keyboard shortcuts (Space/n), persist in-progress run (ADR-13), crossfade on break transitions (ADR-14).
- ◻ **Phase 6 (v1.x) — Mixes**: mynoise-style multi-source mixer; a new `mix` category over the Phase 2 mixer bus.

## Near-term, in-app (low risk, high value)

- ✅ **Persist an in-progress run** across reloads — `runStore.ts` + `useTimer.restore` (Phase 4, ADR-13).
- ✅ **`aria-live` timer announcements** + keyboard shortcuts (Space/n) — Phase 4.
- ✅ **Config migration** — versioned `migrateAudio()` for `flow.audio` (Phase 0; `flow.cfg` still shallow-merged until its schema changes).
- ✅ **Crossfade audio** on break transitions instead of hard restart — Phase 4, ADR-14.

## Medium-term

- **Stats / history** — log completed sessions locally; simple streak/heatmap.
- **Notifications API** — surface phase changes when the tab is backgrounded (works around timer-throttle latency for alerts).
- **Theming** — alternate instrument palettes while keeping the one-bold-element discipline.
- **PWA / installable + offline** — service worker, self-hosted fonts.

## Cloud provider deployments (AWS, GCP, Azure)

One-click deploy buttons and documented guides for the three major cloud providers. All are viable for a static Vite site; the main work is writing the config files and README buttons.

- **AWS** — S3 + CloudFront (static hosting + CDN). Needs a bucket policy, CloudFront distribution, and ideally an `amplify.yml` or AWS Amplify button so users don't need to configure S3 manually. AWS Amplify offers a GitHub-connected deploy similar to Netlify.
- **GCP** — Firebase Hosting or Cloud Storage + Cloud CDN. Firebase Hosting is the simplest path: a `firebase.json` rewrite config and a "Deploy to Firebase" button (or a Cloud Shell `git clone && firebase deploy` link).
- **Azure** — Azure Static Web Apps. Needs a `staticwebapp.config.json` (SPA fallback route) and the standard "Deploy to Azure" button that bootstraps a GitHub Actions workflow.

For all three: add the config file, wire the README button, and document the target in `Deployment.md`. No server-side changes needed — the app remains 100% static.

## Architectural notes for the ecosystem

- Keep a **stable session contract** (the `Block[]` timeline + current phase) so a blocking extension or HR bridge can subscribe without coupling to UI.
- Anything needing OAuth, webhooks, or shared state crosses ADR-2 (browser-only) — stand it up as a separate service and keep this app a pure client of it.
