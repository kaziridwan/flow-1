import { useEffect, useRef, useState } from "react";
import type { AudioEngine } from "../lib/audio";
import {
  BINAURAL_BANDS,
  binauralBand,
  interpolateBinaural,
  sortKeyframes,
} from "../lib/audioDesign";
import { hms, humanDuration, parseHms } from "../lib/format";
import type { BinauralDesign, BinauralKeyframe } from "../types";
import { Eyebrow } from "./controls";

const BASE_MIN = 50;
const BASE_MAX = 500;
const BEAT_MIN = 0.5;
const BEAT_MAX = 40;
const DUR_MIN = 60;
const DUR_MAX = 9000; // 2.5 hours
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Keyframe track editor shown in the Binaural card's ⋯ sheet. A track has a
 * length and a list of keyframes (base carrier, beat offset, volume); the
 * engine interpolates between them and loops. Kept intentionally modest:
 * numeric rows + a base/beat sparkline rather than a full DAW.
 *
 * Invariant (see types.ts): keyframes stay sorted by time, the first sits at
 * t=0 and the last at t=durationSec — so those two times are locked in the UI.
 * A live preview plays the track with a draggable cursor for scrubbing.
 */
export function BinauralEngine({
  design,
  onChange,
  engine,
  masterVolume,
}: {
  design: BinauralDesign;
  onChange: (next: BinauralDesign) => void;
  engine: AudioEngine;
  masterVolume: number;
}) {
  const kfs = design.keyframes;
  const lastIdx = kfs.length - 1;

  const commit = (next: BinauralKeyframe[]) =>
    onChange({ ...design, keyframes: sortKeyframes(next) });

  const setKf = (i: number, patch: Partial<BinauralKeyframe>) =>
    commit(kfs.map((k, j) => (j === i ? { ...k, ...patch } : k)));

  const removeKf = (i: number) => commit(kfs.filter((_, j) => j !== i));

  // After adding a keyframe, scroll the bottom of the sheet (the Frequency
  // guide) into view so the freshly added card + controls stay in sight.
  const guideRef = useRef<HTMLDivElement>(null);
  const scrollOnAddRef = useRef(false);

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
    scrollOnAddRef.current = true;
    commit([...kfs, { t: Math.round(at), ...interpolateBinaural(design, at) }]);
  };

  useEffect(() => {
    if (!scrollOnAddRef.current) return;
    scrollOnAddRef.current = false;
    guideRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [kfs.length]);

  const setDuration = (durationSec: number) => {
    // Keep the endpoints pinned (first=0, last=length) and middle keyframes in
    // range, so the schedule and the locked time fields stay consistent.
    onChange({
      ...design,
      durationSec,
      keyframes: sortKeyframes(
        kfs.map((k, i) => {
          if (i === 0) return { ...k, t: 0 };
          if (i === lastIdx) return { ...k, t: durationSec };
          return { ...k, t: clamp(k.t, 0, durationSec) };
        }),
      ),
    });
  };

  // --- Live preview + scrub cursor ----------------------------------------
  const [previewing, setPreviewing] = useState(false);
  const [posSec, setPosSec] = useState(0);
  const designRef = useRef(design);
  designRef.current = design;
  // Cursor position is driven by rAF while playing; these anchor the math.
  const posRef = useRef(0);
  const startedAtRef = useRef(0);
  const startOffsetRef = useRef(0);
  const draggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const dur = Math.max(1, design.durationSec);

  // Begin playback (from the current cursor) on toggle-on; stop otherwise and
  // always on unmount (the sheet unmounts its children when closed).
  useEffect(() => {
    if (previewing) {
      engine.resume();
      engine.setVolume(masterVolume);
      startedAtRef.current = performance.now();
      startOffsetRef.current = clamp(posRef.current, 0, dur);
      engine.playBinauralTrack(designRef.current, startOffsetRef.current);
      engine.duck(false);
    } else {
      engine.stopTone();
    }
    return () => engine.stopTone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewing, engine, masterVolume]);

  // Re-schedule the playing track on edits, continuing from the live cursor so
  // the audio reflects new keyframes/length without a click or a cursor jump.
  useEffect(() => {
    if (!previewing) return;
    const pos = clamp(posRef.current, 0, dur);
    posRef.current = pos;
    startedAtRef.current = performance.now();
    startOffsetRef.current = pos;
    engine.playBinauralTrack(designRef.current, pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewing, engine, design.keyframes, design.durationSec]);

  // Advance the cursor each frame while playing (unless the user is scrubbing).
  useEffect(() => {
    if (!previewing) return;
    let raf = 0;
    const tick = () => {
      if (!draggingRef.current) {
        const elapsed = (performance.now() - startedAtRef.current) / 1000;
        const pos = (((startOffsetRef.current + elapsed) % dur) + dur) % dur;
        posRef.current = pos;
        setPosSec(pos);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [previewing, dur]);

  const seekTo = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = clamp((clientX - rect.left) / rect.width, 0, 1);
    const pos = frac * Math.max(1, designRef.current.durationSec);
    posRef.current = pos;
    setPosSec(pos);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current) seekTo(e.clientX);
  };
  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (previewing) {
      // Resume the audio from the scrubbed position.
      startedAtRef.current = performance.now();
      startOffsetRef.current = clamp(posRef.current, 0, dur);
      engine.playBinauralTrack(designRef.current, startOffsetRef.current);
    }
  };

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
          {previewing ? `Stop · ${hms(posSec)}` : "Preview"}
        </span>
        {previewing && (
          <span
            className="pulsing h-2 w-2 rounded-full"
            style={{ background: "#ff4f00" }}
            aria-hidden
          />
        )}
      </button>

      <div className="neu-flat px-4 py-3">
        <div className="flex items-center justify-between">
          <Eyebrow>Track length</Eyebrow>
          <span className="font-mono text-xs font-bold text-muted">
            {humanDuration(design.durationSec)}
          </span>
        </div>
        <input
          type="range"
          min={DUR_MIN}
          max={DUR_MAX}
          step={60}
          value={design.durationSec}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--color-accent)]"
          aria-label="Track length"
        />
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative cursor-ew-resize touch-none"
        role="slider"
        aria-label="Preview position"
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(posSec)}
        aria-valuetext={hms(posSec)}
        tabIndex={0}
      >
        <Sparkline design={design} cursorFrac={posSec / dur} />
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>Keyframes</Eyebrow>
        {kfs.map((k, i) => {
          const locked = i === 0 || i === lastIdx;
          return (
            <div
              key={i}
              className="neu-inset flex flex-col gap-2 px-3 py-2"
              // Zebra-stripe alternate cards (darker gradient) so adjacent
              // keyframes are easy to tell apart at a glance.
              style={
                i % 2 === 1
                  ? { background: "linear-gradient(145deg, #d3cfc6, #e1ddd5)" }
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-muted">
                  @ {hms(k.t)}
                  {locked && (
                    <span className="ml-2 text-faint">
                      {i === 0 ? "start" : "end"}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={`Remove keyframe at ${hms(k.t)}`}
                  onClick={() => removeKf(i)}
                  disabled={locked}
                  className="text-xs font-bold text-muted disabled:opacity-30"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TimeField
                  label="Time"
                  value={k.t}
                  min={0}
                  max={design.durationSec}
                  locked={locked}
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
              <BandTag beat={k.beat} />
            </div>
          );
        })}
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
        {` ${humanDuration(design.durationSec)}`}. Use stereo headphones.
      </p>

      <div ref={guideRef}>
        <FrequencyGuide />
      </div>
    </div>
  );
}

/** Small chip naming the brainwave band a keyframe's beat falls into, with its
 *  associated mental state — the per-keyframe half of the Frequency Guide. */
function BandTag({ beat }: { beat: number }) {
  const band = binauralBand(beat);
  return (
    <div className="flex items-center gap-2">
      <span className="neu-flat rounded-md px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-accent">
        {band.name}
      </span>
      <span className="text-xs text-muted">{band.state}</span>
    </div>
  );
}

/** Collapsible reference table of the binaural beat bands. */
function FrequencyGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="neu-flat px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between"
      >
        <Eyebrow>Frequency guide</Eyebrow>
        <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted">
          {open ? "Hide ▴" : "Show ▾"}
        </span>
      </button>
      {open && (
        <table className="mt-3 w-full border-collapse text-left">
          <thead>
            <tr className="tech-label">
              <th className="pb-2 pr-2 font-normal">Band</th>
              <th className="pb-2 pr-2 font-normal">Beat</th>
              <th className="pb-2 font-normal">Mental state</th>
            </tr>
          </thead>
          <tbody>
            {BINAURAL_BANDS.map((b) => (
              <tr key={b.name} className="align-top">
                <td className="py-1 pr-2 font-mono text-xs font-bold text-accent">
                  {b.name}
                </td>
                <td className="py-1 pr-2 font-mono text-xs text-muted">
                  {b.min}–{b.max === Infinity ? "100" : b.max} Hz
                </td>
                <td className="py-1 text-xs text-muted">{b.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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

/** HH:MM:SS time entry. Commits on blur/Enter (reverting malformed input);
 *  locked endpoints render read-only since first=0 and last=length. */
function TimeField({
  label,
  value,
  min,
  max,
  locked,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  locked: boolean;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(hms(value));
  const [editing, setEditing] = useState(false);

  // Reflect external changes (e.g. sort/clamp) while not actively editing.
  useEffect(() => {
    if (!editing) setText(hms(value));
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseHms(text);
    if (parsed == null) {
      setText(hms(value));
      return;
    }
    onChange(clamp(parsed, min, max));
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="tech-label">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={locked ? hms(value) : text}
        readOnly={locked}
        disabled={locked}
        onFocus={(e) => {
          setEditing(true);
          e.currentTarget.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.currentTarget.blur();
          }
        }}
        aria-label={label}
        title="Enter as H:MM:SS, MM:SS or seconds"
        className="neu-flat w-full bg-transparent px-2 py-1 font-mono text-sm font-bold text-ink outline-none disabled:opacity-50"
      />
    </label>
  );
}

/** Base-frequency sparkline across the track, with keyframe dots and an
 *  optional playback cursor (0..1 along the width). */
function Sparkline({
  design,
  cursorFrac,
}: {
  design: BinauralDesign;
  cursorFrac?: number;
}) {
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
  const cx = cursorFrac != null ? clamp(cursorFrac, 0, 1) * W : null;

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
      {cx != null && (
        <line
          x1={cx}
          y1={0}
          x2={cx}
          y2={H}
          stroke="#ff4f00"
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
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
