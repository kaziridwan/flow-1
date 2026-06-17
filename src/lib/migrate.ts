import type { AudioSettings, BinauralPreset, NoiseColor } from "../types";
import {
  BINAURAL_PRESET_SEEDS,
  defaultAudioSettings,
  defaultBinauralDesign,
  defaultNoiseDesign,
} from "./audioDesign";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Normalise persisted audio config (any version, or garbage) into the current
 * {@link AudioSettings} shape. Replaces the old shallow localStorage merge so
 * returning users with the v1 flat-source config upgrade losslessly.
 */
export function migrateAudio(raw: unknown): AudioSettings {
  const base = defaultAudioSettings();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;

  // Already current — trust it, but backfill any missing fields from defaults.
  if (o.v === 2) return { ...base, ...(o as Partial<AudioSettings>) };

  // v1 legacy shape: { source, preset, url, volume, pauseOnBreak }.
  const next = { ...base };
  if (typeof o.volume === "number") next.volume = clamp01(o.volume);
  if (typeof o.pauseOnBreak === "boolean") next.pauseOnBreak = o.pauseOnBreak;

  const source = typeof o.source === "string" ? o.source : "binaural";
  const url = typeof o.url === "string" ? o.url : "";

  switch (source) {
    case "none":
      next.category = "none";
      break;
    case "white":
    case "pink":
    case "brown":
      next.category = "noise";
      next.noise = defaultNoiseDesign(source as NoiseColor);
      break;
    case "binaural": {
      next.category = "binaural";
      const preset = (typeof o.preset === "string" ? o.preset : "flow") as BinauralPreset;
      const seed = BINAURAL_PRESET_SEEDS[preset] ?? BINAURAL_PRESET_SEEDS.flow;
      next.binaural = defaultBinauralDesign(seed.base, seed.beat);
      break;
    }
    case "youtube":
      next.category = "media";
      next.media = { kind: "youtube", url };
      break;
    case "podcast":
      next.category = "media";
      next.media = { kind: "podcast", url };
      break;
    case "media":
      next.category = "media";
      next.media = { kind: "url", url };
      break;
    default:
      next.category = "binaural";
  }
  return next;
}
