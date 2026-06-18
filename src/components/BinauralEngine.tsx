import { useEffect, useRef, useState } from "react";
import type { AudioEngine } from "../lib/audio";
import {
  BINAURAL_BANDS,
  binauralBand,
  interpolateBinaural,
  resolveFreqEdit,
  sortKeyframes,
} from "../lib/audioDesign";
import {
  easingCurvePoints,
  isValidTiming,
  TIMING_KEYWORDS,
} from "../lib/easing";
import { hms, humanDuration, parseHms } from "../lib/format";
import type { BinauralDesign, BinauralKeyframe, FreqLock } from "../types";
import { Eyebrow } from "./controls";
import { PresetControls } from "./PresetControls";

const BASE_MIN = 50;
const BASE_MAX = 500;
const BEAT_MIN = 0.5;
const BEAT_MAX = 40;
const DUR_MIN = 60;
const DUR_MAX = 9000; // 2.5 hours
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (n: number) => Math.round(n * 10) / 10;

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

  // Resolve a left/right/diff edit (honoring the keyframe's lock / precedence),
  // then clamp + round to keep the stored base/beat tidy.
  const setFreq = (i: number, field: FreqLock, value: number) => {
    const k = kfs[i];
    const { left, diff } = resolveFreqEdit(k.base, k.beat, k.lock, field, value);
    setKf(i, {
      base: round1(clamp(left, BASE_MIN, BASE_MAX)),
      beat: round1(clamp(diff, BEAT_MIN, BEAT_MAX)),
    });
  };
  const toggleLock = (i: number, field: FreqLock) =>
    setKf(i, { lock: kfs[i].lock === field ? undefined : field });

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

      <PresetControls kind="binaural" current={design} onApply={onChange} />

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
                <LockField
                  label="Left Hz"
                  value={k.base}
                  locked={k.lock === "left"}
                  onLock={() => toggleLock(i, "left")}
                  onChange={(v) => setFreq(i, "left", v)}
                />
                <LockField
                  label="Right Hz"
                  value={round1(k.base + k.beat)}
                  locked={k.lock === "right"}
                  onLock={() => toggleLock(i, "right")}
                  onChange={(v) => setFreq(i, "right", v)}
                />
                <LockField
                  label="Diff Hz"
                  value={k.beat}
                  locked={k.lock === "diff"}
                  onLock={() => toggleLock(i, "diff")}
                  onChange={(v) => setFreq(i, "diff", v)}
                />
                <BandSelect beat={k.beat} onPick={(beat) => setFreq(i, "diff", beat)} />
              </div>
              <p className="text-xs text-muted">{binauralBand(k.beat).state}</p>
              {i !== lastIdx && (
                <TransitionField
                  value={k.transition ?? "linear"}
                  onChange={(t) => setKf(i, { transition: t })}
                />
              )}
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

/** Brainwave-band dropdown: shows which band the keyframe's beat falls in and,
 *  on pick, snaps the beat to that band's representative frequency. */
function BandSelect({
  beat,
  onPick,
}: {
  beat: number;
  onPick: (beat: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="tech-label">Band</span>
      <select
        value={binauralBand(beat).name}
        onChange={(e) => {
          const band = BINAURAL_BANDS.find((b) => b.name === e.target.value);
          if (band) onPick(band.beat);
        }}
        aria-label="Brainwave band"
        className="neu-flat w-full appearance-none bg-transparent px-2 py-1 font-mono text-sm font-bold text-ink outline-none"
      >
        {BINAURAL_BANDS.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
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
  readOnly,
  hint,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="tech-label">
        {label}
        {hint && <span className="ml-1 normal-case text-faint">· {hint}</span>}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="neu-flat w-full bg-transparent px-2 py-1 font-mono text-sm font-bold text-ink outline-none disabled:opacity-60"
      />
    </label>
  );
}

/** A frequency field (Left / Right / Diff) with a lock toggle. A locked field
 *  is held constant when its siblings change, so its own input is disabled. */
function LockField({
  label,
  value,
  locked,
  onLock,
  onChange,
}: {
  label: string;
  value: number;
  locked: boolean;
  onLock: () => void;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="tech-label flex items-center justify-between gap-1">
        {label}
        <button
          type="button"
          aria-label={`${locked ? "Unlock" : "Lock"} ${label}`}
          aria-pressed={locked}
          onClick={onLock}
          className={locked ? "text-accent" : "text-faint hover:text-muted"}
        >
          <LockIcon locked={locked} />
        </button>
      </span>
      <input
        type="number"
        value={value}
        step={0.1}
        readOnly={locked}
        disabled={locked}
        onChange={(e) => onChange(Number(e.target.value))}
        className="neu-flat w-full bg-transparent px-2 py-1 font-mono text-sm font-bold text-ink outline-none disabled:opacity-60"
      />
    </label>
  );
}

const TIMING_LABEL = (k: string) =>
  k.charAt(0).toUpperCase() + k.slice(1).replace("-", " ");

/** Per-keyframe transition picker: a dropdown of the CSS keywords plus a
 *  validated `cubic-bezier(...)` custom field, with a small curve preview. */
function TransitionField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const keyword = (TIMING_KEYWORDS as readonly string[]).includes(
    value.trim().toLowerCase(),
  );
  const mode = keyword ? value.trim().toLowerCase() : "custom";
  const [custom, setCustom] = useState(
    keyword ? "cubic-bezier(0.42, 0, 0.58, 1)" : value,
  );
  useEffect(() => {
    if (!keyword) setCustom(value);
  }, [value, keyword]);
  const customValid = isValidTiming(custom);
  const previewSpec = mode === "custom" ? (customValid ? custom : "linear") : value;

  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>Transition (to next)</Eyebrow>
      <div className="flex items-center gap-2">
        <select
          value={mode}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "custom" ? custom : v);
          }}
          aria-label="Transition timing function"
          className="neu-flat flex-1 appearance-none bg-transparent px-2 py-1 font-mono text-sm font-bold text-ink outline-none"
        >
          {TIMING_KEYWORDS.map((k) => (
            <option key={k} value={k}>
              {TIMING_LABEL(k)}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        <CurvePreview spec={previewSpec} />
      </div>
      {mode === "custom" && (
        <input
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            if (isValidTiming(e.target.value)) onChange(e.target.value);
          }}
          placeholder="cubic-bezier(0.42, 0, 0.58, 1)"
          aria-invalid={!customValid}
          spellCheck={false}
          className={`neu-inset w-full rounded-lg bg-transparent px-2 py-1 font-mono text-xs outline-none ${
            customValid ? "text-ink" : "text-accent"
          }`}
        />
      )}
    </div>
  );
}

/** A small line plot of an easing curve (progress x → eased y). */
function CurvePreview({ spec }: { spec: string }) {
  const d = easingCurvePoints(spec, 24)
    .map(([x, y], i) => `${i ? "L" : "M"}${x * 100},${100 - y * 100}`)
    .join(" ");
  return (
    <svg
      viewBox="-10 -10 120 120"
      className="neu-inset h-9 w-9 shrink-0 rounded-md"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      {locked ? (
        <path d="M8 11V8a4 4 0 0 1 8 0v3h-2V8a2 2 0 0 0-4 0v3H8z" />
      ) : (
        <path d="M8 11V8a4 4 0 0 1 7.5-1.9l-1.7 1A2 2 0 0 0 10 8v3H8z" />
      )}
    </svg>
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
  const yOf = (base: number) => H - ((base - lo) / span) * (H - 6) - 3;
  const pt = (k: { t: number; base: number }) => [(k.t / dur) * W, yOf(k.base)] as const;
  const dots = design.keyframes.map(pt);
  // Sample the (eased) base curve so the line reflects each segment's timing.
  const SAMPLES = 80;
  const curve = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const t = (i / SAMPLES) * dur;
    return [(t / dur) * W, yOf(interpolateBinaural(design, t).base)] as const;
  });
  const cx = cursorFrac != null ? clamp(cursorFrac, 0, 1) * W : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="neu-inset h-12 w-full rounded-xl"
      aria-hidden
    >
      <polyline
        points={curve.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      {dots.map(([x, y], i) => (
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
