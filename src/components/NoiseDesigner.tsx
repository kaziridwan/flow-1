import { useEffect, useRef, useState } from "react";
import type { AudioEngine } from "../lib/audio";
import type { NoiseDesign } from "../types";
import { Eyebrow, Toggle } from "./controls";
import { PresetControls } from "./PresetControls";
import { XYPad } from "./XYPad";

/**
 * The full noise editor shown inside the Noise card's ⋯ sheet: an X/Y blend
 * pad over the four noise colors plus a low-pass filter (cutoff + resonance)
 * and a noise-level volume. Edits flow up via onChange.
 */
export function NoiseDesigner({
  design,
  onChange,
  engine,
  masterVolume,
}: {
  design: NoiseDesign;
  onChange: (next: NoiseDesign) => void;
  engine: AudioEngine;
  masterVolume: number;
}) {
  const set = (patch: Partial<NoiseDesign>) => onChange({ ...design, ...patch });
  const setLp = (patch: Partial<NoiseDesign["lowpass"]>) =>
    onChange({ ...design, lowpass: { ...design.lowpass, ...patch } });

  // Live preview: a play/stop toggle that plays the noise as it's designed.
  const [previewing, setPreviewing] = useState(false);
  const designRef = useRef(design);
  designRef.current = design;
  const { blend, lowpass, volume } = design;

  // Start / stop the preview tone (and always stop on unmount).
  useEffect(() => {
    if (previewing) {
      engine.resume();
      engine.setVolume(masterVolume);
      engine.playNoiseBlend(designRef.current);
      engine.duck(false);
    } else {
      engine.stopTone();
    }
    return () => engine.stopTone();
  }, [previewing, engine, masterVolume]);

  // Push live edits to the playing preview — no restart/click.
  useEffect(() => {
    if (previewing) engine.playNoiseBlend(designRef.current);
  }, [
    previewing,
    engine,
    blend.x,
    blend.y,
    lowpass.enabled,
    lowpass.cutoff,
    lowpass.q,
    volume,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setPreviewing((p) => !p)}
        aria-pressed={previewing}
        aria-label={previewing ? "Stop preview" : "Play preview"}
        className="neu-raised flex items-center justify-center gap-2 px-4 py-3 text-ink transition-transform active:scale-[0.99] active:neu-pressed"
      >
        <span className={previewing ? "text-accent" : "text-ink"}>
          {previewing ? <StopIcon /> : <PlayIcon />}
        </span>
        <span className="font-mono text-xs font-bold uppercase tracking-[0.12em]">
          {previewing ? "Stop preview" : "Preview"}
        </span>
        {previewing && (
          <span
            className="pulsing h-2 w-2 rounded-full"
            style={{ background: "#ff4f00" }}
            aria-hidden
          />
        )}
      </button>

      <PresetControls kind="noise" current={design} onApply={onChange} />

      <div>
        <div className="mb-2">
          <Eyebrow>Blend</Eyebrow>
        </div>
        <XYPad
          x={design.blend.x}
          y={design.blend.y}
          onChange={(blend) => set({ blend })}
        />
        <p className="mt-2 text-xs text-muted">
          Drag to mix the four noise colors. Each corner is one color; the centre
          is an even blend.
        </p>
      </div>

      <Toggle
        label="Low-pass filter"
        hint="Roll off the harsh high end for a softer noise"
        checked={design.lowpass.enabled}
        onChange={(enabled) => setLp({ enabled })}
      />

      {design.lowpass.enabled && (
        <>
          <Slider
            label="Cutoff"
            value={design.lowpass.cutoff}
            min={200}
            max={12000}
            step={50}
            format={(v) => `${(v / 1000).toFixed(1)} kHz`}
            onChange={(cutoff) => setLp({ cutoff })}
          />
          <Slider
            label="Resonance"
            value={design.lowpass.q}
            min={0.1}
            max={12}
            step={0.1}
            format={(v) => v.toFixed(1)}
            onChange={(q) => setLp({ q })}
          />
        </>
      )}

      <Slider
        label="Noise volume"
        value={design.volume}
        min={0}
        max={1}
        step={0.01}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(volume) => set({ volume })}
      />
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="neu-flat px-4 py-3">
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <span className="font-mono text-xs font-bold text-muted">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--color-accent)]"
        aria-label={label}
      />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
