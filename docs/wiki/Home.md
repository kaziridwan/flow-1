# FLOW-1 Wiki

The living documentation for FLOW-1. Every working session keeps this current — see the **Documentation protocol** in [`../../CLAUDE.md`](../../CLAUDE.md). If anything here disagrees with the code, the code wins and the page should be fixed in the same change.

## Start here

- [`../roadmap/handoff.md`](../roadmap/handoff.md) — handoff entry point, current status, known tech debt, next steps.
- [`../../CLAUDE.md`](../../CLAUDE.md) — how to operate in this repo + the mandatory wiki-update protocol.
- [`../../README.md`](../../README.md) — public-facing project readme + deploy buttons.

## Pages

| Page | What's in it |
|---|---|
| [Architecture](./Architecture.md) | File-by-file map, state model, data flow, key types. |
| [Features](./Features.md) | User-facing behavior spec: sessions, long-break rule, meal logic, bell, audio. |
| [Internals](./Internals.md) | The three non-obvious subsystems — timer, audio engine, scheduling. |
| [Decisions](./Decisions.md) | Numbered ADR log of design/technical choices. |
| [Deployment](./Deployment.md) | Build output, Vercel & Cloudflare Pages, config files. |
| [Roadmap](./Roadmap.md) | Planned work beyond the current PoC. |
| [Changelog](./Changelog.md) | Session-by-session log. Append here every time. |

## One-paragraph overview

FLOW-1 is a browser-only Pomodoro instrument with a neumorphic / teenage-engineering aesthetic. You configure a run of focus sessions; the app builds a block timeline, auto-inserts meal breaks around your real start time, and counts down through focus / short / long / meal blocks. Background audio (synthesised noise or binaural beats, or YouTube / podcast / media URLs) plays from your browser to help sustain flow. It is the first surface of a larger envisioned focus ecosystem (blocking, wearable heart-rate adaptation) that is **not yet built** — see [Roadmap](./Roadmap.md).
