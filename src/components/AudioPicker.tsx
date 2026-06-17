import { useState } from "react";
import type { AudioEngine } from "../lib/audio";
import {
  BINAURAL_PRESET_SEEDS,
  BINAURAL_PRESETS,
  NOISE_CORNERS,
  NOISE_COLORS,
  blendCornerColor,
  defaultBinauralDesign,
  defaultNoiseDesign,
  matchBinauralPreset,
} from "../lib/audioDesign";
import type {
  AudioCategory,
  AudioSettings,
  BinauralPreset,
  MediaKind,
  NoiseColor,
} from "../types";
import { BinauralEngine } from "./BinauralEngine";
import { Eyebrow, Segmented, Toggle } from "./controls";
import { NoiseDesigner } from "./NoiseDesigner";
import { Sheet } from "./Sheet";

const CATEGORIES: { value: AudioCategory; label: string; dot?: string }[] = [
  { value: "none", label: "Silent" },
  { value: "noise", label: "Noise", dot: "#9aa0a6" },
  { value: "binaural", label: "Binaural", dot: "#ff4f00" },
  { value: "media", label: "Custom Media", dot: "#16b06a" },
];

const NOISE_OPTIONS = NOISE_COLORS.map((c) => ({
  value: c,
  label: NOISE_CORNERS[c].label,
  dot: NOISE_CORNERS[c].dot,
}));

const PRESET_OPTIONS = BINAURAL_PRESETS.map((p) => ({
  value: p,
  label: BINAURAL_PRESET_SEEDS[p].label,
}));

const MEDIA_OPTIONS: { value: MediaKind; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "url", label: "Media URL" },
];

export function AudioPicker({
  cfg,
  onChange,
  engine,
}: {
  cfg: AudioSettings;
  onChange: (next: AudioSettings) => void;
  engine: AudioEngine;
}) {
  const [sheet, setSheet] = useState<"noise" | "binaural" | null>(null);
  const set = (patch: Partial<AudioSettings>) => onChange({ ...cfg, ...patch });

  const noiseColor = blendCornerColor(cfg.noise.blend);
  const binauralPreset = matchBinauralPreset(cfg.binaural);

  const setNoiseColor = (color: NoiseColor) =>
    set({ noise: { ...cfg.noise, blend: { ...defaultNoiseDesign(color).blend } } });

  const setBinauralPreset = (p: BinauralPreset) => {
    const s = BINAURAL_PRESET_SEEDS[p];
    set({ binaural: defaultBinauralDesign(s.base, s.beat, cfg.binaural.durationSec) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-2">
          <Eyebrow>Background sound</Eyebrow>
        </div>
        <Segmented
          options={CATEGORIES}
          value={cfg.category}
          onChange={(v) => set({ category: v })}
          columns={2}
        />
      </div>

      {cfg.category === "noise" && (
        <Card
          title={`Noise · ${noiseColor ? NOISE_CORNERS[noiseColor].label : "Custom blend"}`}
          onOpen={() => setSheet("noise")}
          openLabel="Open Noise Designer"
        >
          <Segmented
            options={NOISE_OPTIONS}
            value={noiseColor ?? "white"}
            onChange={setNoiseColor}
            columns={4}
          />
        </Card>
      )}

      {cfg.category === "binaural" && (
        <Card
          title={`Binaural · ${
            binauralPreset ? BINAURAL_PRESET_SEEDS[binauralPreset].note : "Custom track"
          }`}
          onOpen={() => setSheet("binaural")}
          openLabel="Open Binaural Engine"
        >
          <Segmented
            options={PRESET_OPTIONS}
            value={binauralPreset ?? "flow"}
            onChange={setBinauralPreset}
            columns={3}
          />
          <p className="mt-2 text-xs text-muted">
            Use stereo headphones — binaural beats rely on a small frequency offset
            between the left and right ears.
          </p>
        </Card>
      )}

      {cfg.category === "media" && (
        <div className="neu-flat flex flex-col gap-3 px-4 py-3">
          <Segmented
            options={MEDIA_OPTIONS}
            value={cfg.media.kind}
            onChange={(kind) => set({ media: { ...cfg.media, kind } })}
            columns={3}
          />
          <label className="neu-inset block px-4 py-3">
            <span className="tech-label">
              {cfg.media.kind === "youtube"
                ? "YouTube link"
                : cfg.media.kind === "podcast"
                  ? "Podcast audio URL"
                  : "Media URL"}
            </span>
            <input
              type="url"
              inputMode="url"
              value={cfg.media.url}
              onChange={(e) => set({ media: { ...cfg.media, url: e.target.value } })}
              placeholder={
                cfg.media.kind === "youtube"
                  ? "https://youtu.be/…"
                  : "https://…/audio.mp3"
              }
              className="mt-1 w-full bg-transparent font-mono text-sm text-ink outline-none placeholder:text-faint"
            />
          </label>
        </div>
      )}

      {cfg.category !== "none" && (
        <div className="neu-flat px-4 py-3">
          <div className="flex items-center justify-between">
            <Eyebrow>Volume</Eyebrow>
            <span className="font-mono text-xs font-bold text-muted">
              {Math.round(cfg.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={cfg.volume}
            onChange={(e) => set({ volume: Number(e.target.value) })}
            className="mt-2 w-full accent-[var(--color-accent)]"
            aria-label="Volume"
          />
        </div>
      )}

      {cfg.category !== "none" && (
        <Toggle
          label="Mute audio during breaks"
          checked={cfg.pauseOnBreak}
          onChange={(v) => set({ pauseOnBreak: v })}
        />
      )}

      <Sheet
        open={sheet === "noise"}
        title="Noise Designer"
        onClose={() => setSheet(null)}
      >
        <NoiseDesigner
          design={cfg.noise}
          onChange={(noise) => set({ noise })}
          engine={engine}
          masterVolume={cfg.volume}
        />
      </Sheet>

      <Sheet
        open={sheet === "binaural"}
        title="Binaural Engine"
        onClose={() => setSheet(null)}
      >
        <BinauralEngine
          design={cfg.binaural}
          onChange={(binaural) => set({ binaural })}
        />
      </Sheet>
    </div>
  );
}

function Card({
  title,
  onOpen,
  openLabel,
  children,
}: {
  title: string;
  onOpen: () => void;
  openLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="neu-flat flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between">
        <Eyebrow>{title}</Eyebrow>
        <button
          type="button"
          aria-label={openLabel}
          onClick={onOpen}
          className="neu-flat flex h-7 w-9 items-center justify-center rounded-lg text-muted active:neu-pressed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}
