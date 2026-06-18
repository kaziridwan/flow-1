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
  /** Manual placement override: a meal pinned here is inserted right before the
   *  given focus-session index (1-based), ignoring its clock window. Meals not
   *  listed fall back to window-based placement. Set by dragging in the preview. */
  mealSlots: Partial<Record<MealKey, number>>;
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

/** Which of left/right/diff is held constant when another is edited. */
export type FreqLock = "left" | "right" | "diff";

export interface BinauralKeyframe {
  t: number; // seconds from track start
  base: number; // left carrier frequency, Hz
  beat: number; // diff = right − left, Hz (right ear = base + beat)
  volume: number; // 0..1
  /** Timing function for the glide to the next keyframe (CSS-style). Default
   *  "linear"; a keyword or a `cubic-bezier(...)` string. Ignored on the last. */
  transition?: string;
  /** Editing lock for the left/right/diff trio (see FreqLock). */
  lock?: FreqLock;
}

/** A binaural track of a fixed length whose parameters interpolate between
 *  keyframes. Invariant: keyframes sorted by t, first t=0, last t=durationSec. */
export interface BinauralDesign {
  durationSec: number;
  keyframes: BinauralKeyframe[];
}

/** A playable background sound: one active category, each with its own design,
 *  plus its own level. Shared by the focus sound and the optional break sound. */
export interface SoundConfig {
  category: AudioCategory;
  noise: NoiseDesign;
  binaural: BinauralDesign;
  media: { kind: MediaKind; url: string };
  volume: number; // 0..1
}

/** v2 audio configuration. The focus sound is held flat on the settings (a
 *  `SoundConfig`); `break` is an optional separate sound played during breaks
 *  when `pauseOnBreak` is off (null = keep playing the focus sound). */
export interface AudioSettings extends SoundConfig {
  v: 2;
  pauseOnBreak: boolean;
  break: SoundConfig | null;
}
