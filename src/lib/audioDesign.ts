import type {
  AudioSettings,
  BinauralDesign,
  BinauralPreset,
  NoiseColor,
  NoiseDesign,
} from "../types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** The four noise colors placed at the corners of the X/Y blend pad. */
export const NOISE_CORNERS: Record<
  NoiseColor,
  { x: number; y: number; label: string; dot: string }
> = {
  white: { x: 0, y: 0, label: "White", dot: "#9aa0a6" },
  pink: { x: 1, y: 0, label: "Pink", dot: "#ff8fa3" },
  brown: { x: 0, y: 1, label: "Brown", dot: "#b07a4a" },
  blue: { x: 1, y: 1, label: "Blue", dot: "#7aa2ff" },
};

export const NOISE_COLORS = Object.keys(NOISE_CORNERS) as NoiseColor[];

/** Bilinear weight of each corner for a blend point in the unit square. */
export function cornerWeights(x: number, y: number): Record<NoiseColor, number> {
  const cx = clamp01(x);
  const cy = clamp01(y);
  return {
    white: (1 - cx) * (1 - cy),
    pink: cx * (1 - cy),
    brown: (1 - cx) * cy,
    blue: cx * cy,
  };
}

/** If a blend sits exactly on one corner, return that color (for highlighting
 *  the inline color picker); otherwise null ("custom"). */
export function blendCornerColor(blend: { x: number; y: number }): NoiseColor | null {
  for (const color of NOISE_COLORS) {
    const c = NOISE_CORNERS[color];
    if (blend.x === c.x && blend.y === c.y) return color;
  }
  return null;
}

/** Carrier/beat seeds + labels for the three classic binaural presets. */
export const BINAURAL_PRESET_SEEDS: Record<
  BinauralPreset,
  { base: number; beat: number; label: string; note: string }
> = {
  flow: { base: 180, beat: 10, label: "Flow", note: "10 Hz alpha" },
  focus: { base: 210, beat: 16, label: "Deep focus", note: "16 Hz beta" },
  calm: { base: 150, beat: 6, label: "Calm", note: "6 Hz theta" },
};

export const BINAURAL_PRESETS = Object.keys(
  BINAURAL_PRESET_SEEDS,
) as BinauralPreset[];

/** Whether a binaural design is a flat (non-keyframed) instance of a preset. */
export function matchBinauralPreset(d: BinauralDesign): BinauralPreset | null {
  const flat =
    d.keyframes.length > 0 &&
    d.keyframes.every(
      (k) => k.base === d.keyframes[0].base && k.beat === d.keyframes[0].beat,
    );
  if (!flat) return null;
  const { base, beat } = d.keyframes[0];
  for (const p of BINAURAL_PRESETS) {
    const s = BINAURAL_PRESET_SEEDS[p];
    if (s.base === base && s.beat === beat) return p;
  }
  return null;
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** Linearly interpolate base/beat/volume at time `t` (seconds) along a track.
 *  Clamps to the first/last keyframe outside the keyframed range. */
export function interpolateBinaural(
  d: BinauralDesign,
  t: number,
): { base: number; beat: number; volume: number } {
  const kfs = d.keyframes;
  if (!kfs.length) return { base: 180, beat: 10, volume: 0.8 };
  const pick = (k: (typeof kfs)[number]) => ({
    base: k.base,
    beat: k.beat,
    volume: k.volume,
  });
  if (t <= kfs[0].t) return pick(kfs[0]);
  const last = kfs[kfs.length - 1];
  if (t >= last.t) return pick(last);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (t >= a.t && t <= b.t) {
      const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return {
        base: lerp(a.base, b.base, f),
        beat: lerp(a.beat, b.beat, f),
        volume: lerp(a.volume, b.volume, f),
      };
    }
  }
  return pick(last);
}

/** Keep keyframes sorted by time — the engine's scheduler assumes this. */
export function sortKeyframes<T extends { t: number }>(kfs: T[]): T[] {
  return [...kfs].sort((a, b) => a.t - b.t);
}

export const DEFAULT_LOWPASS = { enabled: false, cutoff: 1200, q: 0.7 };

export function defaultNoiseDesign(color: NoiseColor = "white"): NoiseDesign {
  const c = NOISE_CORNERS[color];
  return {
    blend: { x: c.x, y: c.y },
    lowpass: { ...DEFAULT_LOWPASS },
    volume: 0.8,
  };
}

export function defaultBinauralDesign(
  base = 180,
  beat = 10,
  durationSec = 600,
): BinauralDesign {
  return {
    durationSec,
    keyframes: [
      { t: 0, base, beat, volume: 0.8 },
      { t: durationSec, base, beat, volume: 0.8 },
    ],
  };
}

export function defaultAudioSettings(): AudioSettings {
  return {
    v: 2,
    category: "binaural",
    noise: defaultNoiseDesign("white"),
    binaural: defaultBinauralDesign(),
    media: { kind: "youtube", url: "" },
    volume: 0.6,
    pauseOnBreak: true,
  };
}
