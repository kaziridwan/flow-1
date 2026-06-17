import { interpolateBinaural, sortKeyframes } from "../lib/audioDesign";
import { mmss } from "../lib/format";
import type { BinauralDesign, BinauralKeyframe } from "../types";
import { Eyebrow } from "./controls";

const BASE_MIN = 50;
const BASE_MAX = 500;
const BEAT_MIN = 0.5;
const BEAT_MAX = 40;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Keyframe track editor shown in the Binaural card's ⋯ sheet. A track has a
 * length and a list of keyframes (base carrier, beat offset, volume); the
 * engine interpolates between them and loops. Kept intentionally modest:
 * numeric rows + a base/beat sparkline rather than a full DAW.
 */
export function BinauralEngine({
  design,
  onChange,
}: {
  design: BinauralDesign;
  onChange: (next: BinauralDesign) => void;
}) {
  const kfs = design.keyframes;

  const commit = (next: BinauralKeyframe[]) =>
    onChange({ ...design, keyframes: sortKeyframes(next) });

  const setKf = (i: number, patch: Partial<BinauralKeyframe>) =>
    commit(kfs.map((k, j) => (j === i ? { ...k, ...patch } : k)));

  const removeKf = (i: number) => commit(kfs.filter((_, j) => j !== i));

  const addKf = () => {
    // Insert at the largest time gap, with interpolated values.
    let at = design.durationSec / 2;
    let widest = -1;
    for (let i = 0; i < kfs.length - 1; i++) {
      const gap = kfs[i + 1].t - kfs[i].t;
      if (gap > widest) {
        widest = gap;
        at = (kfs[i].t + kfs[i + 1].t) / 2;
      }
    }
    commit([...kfs, { t: Math.round(at), ...interpolateBinaural(design, at) }]);
  };

  const setDuration = (durationSec: number) => {
    // Clamp keyframe times into the new length so the schedule stays valid.
    onChange({
      ...design,
      durationSec,
      keyframes: sortKeyframes(
        kfs.map((k) => ({ ...k, t: clamp(k.t, 0, durationSec) })),
      ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="neu-flat px-4 py-3">
        <div className="flex items-center justify-between">
          <Eyebrow>Track length</Eyebrow>
          <span className="font-mono text-xs font-bold text-muted">
            {Math.round(design.durationSec / 60)} min
          </span>
        </div>
        <input
          type="range"
          min={60}
          max={1800}
          step={60}
          value={design.durationSec}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--color-accent)]"
          aria-label="Track length"
        />
      </div>

      <Sparkline design={design} />

      <div className="flex flex-col gap-2">
        <Eyebrow>Keyframes</Eyebrow>
        {kfs.map((k, i) => (
          <div key={i} className="neu-inset flex flex-col gap-2 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-muted">
                @ {mmss(k.t)}
              </span>
              <button
                type="button"
                aria-label={`Remove keyframe at ${mmss(k.t)}`}
                onClick={() => removeKf(i)}
                disabled={kfs.length <= 2}
                className="text-xs font-bold text-muted disabled:opacity-30"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Time (s)"
                value={k.t}
                min={0}
                max={design.durationSec}
                step={5}
                onChange={(v) => setKf(i, { t: clamp(v, 0, design.durationSec) })}
              />
              <Field
                label="Volume %"
                value={Math.round(k.volume * 100)}
                min={0}
                max={100}
                step={5}
                onChange={(v) => setKf(i, { volume: clamp(v, 0, 100) / 100 })}
              />
              <Field
                label="Base Hz"
                value={k.base}
                min={BASE_MIN}
                max={BASE_MAX}
                step={5}
                onChange={(v) => setKf(i, { base: clamp(v, BASE_MIN, BASE_MAX) })}
              />
              <Field
                label="Beat Hz"
                value={k.beat}
                min={BEAT_MIN}
                max={BEAT_MAX}
                step={0.5}
                onChange={(v) => setKf(i, { beat: clamp(v, BEAT_MIN, BEAT_MAX) })}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addKf}
          className="neu-flat py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted active:neu-pressed"
        >
          + Add keyframe
        </button>
      </div>

      <p className="text-xs text-muted">
        The carrier (base) and beat glide between keyframes; the track loops every
        {` ${Math.round(design.durationSec / 60)} min`}. Use stereo headphones.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="tech-label">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="neu-flat w-full bg-transparent px-2 py-1 font-mono text-sm font-bold text-ink outline-none"
      />
    </label>
  );
}

/** Base-frequency sparkline across the track, with keyframe dots. */
function Sparkline({ design }: { design: BinauralDesign }) {
  const W = 100;
  const H = 28;
  const dur = Math.max(1, design.durationSec);
  const bases = design.keyframes.map((k) => k.base);
  const lo = Math.min(...bases);
  const hi = Math.max(...bases);
  const span = hi - lo || 1;
  const pt = (k: { t: number; base: number }) => {
    const x = (k.t / dur) * W;
    const y = H - ((k.base - lo) / span) * (H - 6) - 3;
    return [x, y] as const;
  };
  const pts = design.keyframes.map(pt);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="neu-inset h-12 w-full rounded-xl"
      aria-hidden
    >
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.8} fill="var(--color-accent)" />
      ))}
    </svg>
  );
}
