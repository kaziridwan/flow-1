export type BlockType =
  | "focus"
  | "short"
  | "long"
  | "breakfast"
  | "lunch"
  | "dinner";

export interface Block {
  type: BlockType;
  /** Duration in seconds */
  duration: number;
  /** 1-based index among focus blocks (focus only) */
  focusIndex?: number;
  label: string;
}

export type MealKey = "breakfast" | "lunch" | "dinner";

export interface MealConfig {
  enabled: boolean;
  /** minutes */
  duration: number;
}

export interface SessionConfig {
  sessions: number;
  focusMin: number;
  shortMin: number;
  longMin: number;
  bell: boolean;
  meals: Record<MealKey, MealConfig>;
}

export type BinauralPreset = "flow" | "focus" | "calm";

// --- audio model ----------------------------------------------------------

export type AudioCategory = "none" | "noise" | "binaural" | "media";
export type NoiseColor = "white" | "pink" | "brown" | "blue";
export type MediaKind = "youtube" | "podcast" | "url";

/** A blended-noise design: an X/Y point over the four noise-color corners
 *  plus an optional low-pass filter. */
export interface NoiseDesign {
  blend: { x: number; y: number }; // 0..1 each → bilinear corner weights
  lowpass: { enabled: boolean; cutoff: number; q: number };
  volume: number; // 0..1
}

export interface BinauralKeyframe {
  t: number; // seconds from track start
  base: number; // carrier frequency, Hz
  beat: number; // L/R frequency difference, Hz
  volume: number; // 0..1
}

/** A binaural track of a fixed length whose parameters interpolate between
 *  keyframes. Invariant: keyframes sorted by t, first t=0, last t=durationSec. */
export interface BinauralDesign {
  durationSec: number;
  keyframes: BinauralKeyframe[];
}

/** v2 audio configuration: one active category, each with its own design. */
export interface AudioSettings {
  v: 2;
  category: AudioCategory;
  noise: NoiseDesign;
  binaural: BinauralDesign;
  media: { kind: MediaKind; url: string };
  volume: number; // master 0..1
  pauseOnBreak: boolean;
}
