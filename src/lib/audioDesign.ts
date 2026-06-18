import { easeProgress } from "./easing";
import type {
  AudioSettings,
  BinauralDesign,
  BinauralPreset,
  FreqLock,
  NoiseColor,
  NoiseDesign,
  SoundConfig,
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

/** Brainwave bands the binaural *beat* (L/R offset, Hz) falls into, with the
 *  mental state each is associated with. Ranges are [min, max) in Hz; the last
 *  band is open-ended. Mirrors the in-app Frequency Guide. */
export interface BinauralBand {
  name: string;
  min: number;
  max: number;
  /** Representative beat (Hz) applied when the band is picked from the dropdown. */
  beat: number;
  state: string;
}

export const BINAURAL_BANDS: BinauralBand[] = [
  { name: "Delta", min: 0, max: 4, beat: 1, state: "Deep sleep, healing & deep relaxation" },
  { name: "Theta", min: 4, max: 8, beat: 5, state: "Meditation, light sleep & creativity" },
  { name: "Alpha", min: 8, max: 14, beat: 10, state: "Relaxation, calm & reflective focus" },
  { name: "Beta", min: 14, max: 30, beat: 20, state: "Alertness, active thinking & concentration" },
  { name: "Gamma", min: 30, max: Infinity, beat: 40, state: "Flow state & heightened focus" },
];

/** Classify a beat frequency (Hz) into its brainwave band. */
export function binauralBand(beatHz: number): BinauralBand {
  return (
    BINAURAL_BANDS.find((b) => beatHz >= b.min && beatHz < b.max) ??
    BINAURAL_BANDS[BINAURAL_BANDS.length - 1]
  );
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
      const raw = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      // The glide from a→b follows a's transition timing function.
      const f = easeProgress(a.transition, raw);
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

/**
 * Resolve an edit to one of a keyframe's left/right/diff values (where
 * right = left + diff). The edited field takes `value`; an anchor field is
 * held — the `lock` if it isn't the edited field, otherwise the highest of the
 * remaining two by the Left > Right > Diff precedence — and the third
 * recomputes. Returns the new {left, diff} (un-clamped).
 */
export function resolveFreqEdit(
  left: number,
  diff: number,
  lock: FreqLock | undefined,
  field: FreqLock,
  value: number,
): { left: number; diff: number } {
  let L = left;
  let D = diff;
  let R = left + diff;
  if (field === "left") L = value;
  else if (field === "right") R = value;
  else D = value;
  const others = (["left", "right", "diff"] as FreqLock[]).filter(
    (f) => f !== field,
  );
  const anchor =
    lock && lock !== field && others.includes(lock) ? lock : others[0];
  const third = others.find((f) => f !== anchor)!;
  if (third === "left") L = R - D;
  else if (third === "right") R = L + D;
  else D = R - L;
  return { left: L, diff: D };
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

/** A fresh, self-contained background sound (used to seed the break sound when
 *  the user first enables a separate one). */
export function defaultSoundConfig(): SoundConfig {
  return {
    category: "binaural",
    noise: defaultNoiseDesign("white"),
    binaural: defaultBinauralDesign(),
    media: { kind: "youtube", url: "" },
    volume: 0.6,
  };
}

/** Pull just the playable sound out of the full settings (the focus sound). */
export function soundOf(a: AudioSettings): SoundConfig {
  return {
    category: a.category,
    noise: a.noise,
    binaural: a.binaural,
    media: a.media,
    volume: a.volume,
  };
}

/** Built-in keyframed binaural tracks, offered (apply-only) alongside the
 *  user's saved presets in the Binaural Engine. Volume defaults to 0.8. */
export const BUILTIN_BINAURAL_PRESETS: { name: string; design: BinauralDesign }[] = [
  {
    name: "20 Minute Power Nap",
    design: {
      durationSec: 20 * 60,
      keyframes: [
        { t: 0, base: 100, beat: 13.7, volume: 0.8, transition: "ease-out" },
        { t: 180, base: 98.3, beat: 6.7, volume: 0.8 },
        {
          t: 1080,
          base: 90,
          beat: 7.4,
          volume: 0.8,
          transition: "cubic-bezier(0.73, 0.02, 0.31, 0.97)",
        },
        { t: 1200, base: 100, beat: 14, volume: 0.8 },
      ],
    },
  },
  {
    name: "25 Minute Study",
    design: {
      durationSec: 25 * 60,
      keyframes: [
        { t: 0, base: 159, beat: 14, volume: 0.8, transition: "ease-out" },
        { t: 200, base: 140, beat: 10, volume: 0.8 },
        { t: 300, base: 140, beat: 10, volume: 0.8 },
        { t: 360, base: 150, beat: 11, volume: 0.8 },
        { t: 600, base: 150, beat: 11, volume: 0.8 },
        { t: 660, base: 140, beat: 10, volume: 0.8 },
        { t: 900, base: 140, beat: 10, volume: 0.8 },
        { t: 960, base: 150, beat: 11, volume: 0.8 },
        { t: 1200, base: 150, beat: 11, volume: 0.8 },
        { t: 1260, base: 140, beat: 10, volume: 0.8 },
        { t: 1380, base: 140, beat: 10, volume: 0.8, transition: "ease-in" },
        { t: 1500, base: 159, beat: 14, volume: 0.8 },
      ],
    },
  },
];

export function defaultAudioSettings(): AudioSettings {
  return {
    v: 2,
    ...defaultSoundConfig(),
    pauseOnBreak: true,
    break: null,
  };
}
