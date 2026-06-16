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

export type AudioSource =
  | "none"
  | "white"
  | "pink"
  | "brown"
  | "binaural"
  | "youtube"
  | "podcast"
  | "media";

export type BinauralPreset = "flow" | "focus" | "calm";

export interface AudioConfig {
  source: AudioSource;
  preset: BinauralPreset;
  url: string;
  volume: number; // 0..1
  pauseOnBreak: boolean;
}
