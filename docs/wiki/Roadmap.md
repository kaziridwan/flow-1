# Roadmap

What's beyond the current proof-of-concept. The PoC is a complete Pomodoro instrument; everything below is unbuilt unless moved to [Features](./Features.md). Reorder/expand as priorities shift, and reflect completed work back into Features + Changelog.

## From the project brief (the larger focus ecosystem)

The brief frames FLOW-1 as one app in an ecosystem for sustaining flow. Two headline capabilities are named but **not built here**:

1. **Website / app blocking** — restrict distracting sites/apps during focus blocks. In a browser-only context this is limited (a web page can't block other apps); realistically needs a **browser extension** (declarativeNetRequest) and/or OS-level companion. Scope as a separate surface that shares the session state/contract.
2. **Wearable heart-rate → adaptive binaural beats** — read live heart rate from a wearable and modulate the binaural beat frequency toward a target. This needs a data source (e.g. a companion app streaming HR) and a cloud or local bridge; the web app would consume an HR stream and map deviation-from-baseline → beat Hz. The synthesised binaural engine in `src/lib/audio.ts` is already the hook point (`playBinaural(base, beat)` can be re-targeted live).

## Near-term, in-app (low risk, high value)

- **Tests** — add Vitest; cover `schedule.ts` (meal-window placement, long-break rule, last-block-no-break) and `format.ts` (`youtubeId` URL shapes). Highest ROI given the pure logic.
- **Persist an in-progress run** across reloads (store `committed` + elapsed; restore on load).
- **`aria-live` timer announcements** + keyboard shortcuts (space = pause/resume, n = skip).
- **Config migration** — replace the shallow `localStorage` merge with a versioned migration before adding fields inside `meals.*` (see handoff tech-debt #4).
- **Crossfade audio** on break transitions instead of hard restart.
- **Custom binaural entry** (free base/beat) alongside the presets.

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
