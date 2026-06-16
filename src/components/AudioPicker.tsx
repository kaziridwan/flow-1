import { BINAURAL_PRESETS } from "../lib/audio";
import type { AudioConfig, AudioSource, BinauralPreset } from "../types";
import { Eyebrow, Segmented, Toggle } from "./controls";

const SOURCES: { value: AudioSource; label: string; dot?: string }[] = [
  { value: "none", label: "Silent" },
  { value: "white", label: "White", dot: "#9aa0a6" },
  { value: "pink", label: "Pink", dot: "#ff8fa3" },
  { value: "brown", label: "Brown", dot: "#b07a4a" },
  { value: "binaural", label: "Binaural", dot: "#ff4f00" },
  { value: "youtube", label: "YouTube", dot: "#ff3b30" },
  { value: "podcast", label: "Podcast", dot: "#9b59ff" },
  { value: "media", label: "Media URL", dot: "#16b06a" },
];

const PRESETS: { value: BinauralPreset; label: string }[] = [
  { value: "flow", label: "Flow" },
  { value: "focus", label: "Deep focus" },
  { value: "calm", label: "Calm" },
];

export function AudioPicker({
  cfg,
  onChange,
}: {
  cfg: AudioConfig;
  onChange: (next: AudioConfig) => void;
}) {
  const set = (patch: Partial<AudioConfig>) => onChange({ ...cfg, ...patch });
  const needsUrl =
    cfg.source === "youtube" || cfg.source === "podcast" || cfg.source === "media";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Eyebrow>Background sound</Eyebrow>
        </div>
        <Segmented
          options={SOURCES}
          value={cfg.source}
          onChange={(v) => set({ source: v })}
          columns={4}
        />
      </div>

      {cfg.source === "binaural" && (
        <div>
          <div className="mb-2">
            <Eyebrow>Binaural preset · {BINAURAL_PRESETS[cfg.preset].note}</Eyebrow>
          </div>
          <Segmented
            options={PRESETS}
            value={cfg.preset}
            onChange={(v) => set({ preset: v })}
            columns={3}
          />
          <p className="mt-2 text-xs text-muted">
            Use stereo headphones — binaural beats rely on a small frequency
            offset between the left and right ears.
          </p>
        </div>
      )}

      {needsUrl && (
        <label className="neu-inset block px-4 py-3">
          <span className="tech-label">
            {cfg.source === "youtube"
              ? "YouTube link"
              : cfg.source === "podcast"
                ? "Podcast audio URL"
                : "Media URL"}
          </span>
          <input
            type="url"
            inputMode="url"
            value={cfg.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder={
              cfg.source === "youtube"
                ? "https://youtu.be/…"
                : "https://…/audio.mp3"
            }
            className="mt-1 w-full bg-transparent font-mono text-sm text-ink outline-none placeholder:text-faint"
          />
        </label>
      )}

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

      {cfg.source !== "none" && (
        <Toggle
          label="Mute audio during breaks"
          checked={cfg.pauseOnBreak}
          onChange={(v) => set({ pauseOnBreak: v })}
        />
      )}
    </div>
  );
}
