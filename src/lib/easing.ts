/**
 * CSS-style timing functions for binaural keyframe transitions. A keyframe's
 * `transition` governs how values glide *from that keyframe to the next* —
 * mirroring `animation-timing-function` declared inside a CSS @keyframe.
 *
 * Supported: the keywords below plus `cubic-bezier(x1, y1, x2, y2)` (x's must be
 * in [0,1], per the CSS spec). Default is `linear`.
 */
export const TIMING_KEYWORDS = [
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "step-start",
  "step-end",
] as const;

export type TimingKeyword = (typeof TIMING_KEYWORDS)[number];

/** Control points for the keyword curves (CSS-defined). */
const KEYWORD_BEZIER: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Parse a `cubic-bezier(...)` spec into its 4 control points, or null if it's
 *  malformed or violates the CSS constraint that x1/x2 ∈ [0,1]. */
export function parseCubicBezier(
  spec: string,
): [number, number, number, number] | null {
  const m = spec
    .trim()
    .match(
      /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/i,
    );
  if (!m) return null;
  const nums = m.slice(1, 5).map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const [x1, , x2] = nums;
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
  return nums as [number, number, number, number];
}

/** Whether a transition spec is a valid keyword or cubic-bezier. */
export function isValidTiming(spec: string): boolean {
  const s = spec.trim().toLowerCase();
  if ((TIMING_KEYWORDS as readonly string[]).includes(s)) return true;
  return parseCubicBezier(s) !== null;
}

/** Evaluate the y of a cubic-bezier easing at progress x (both in [0,1]). */
function bezierY(p: [number, number, number, number], x: number): number {
  const [x1, y1, x2, y2] = p;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  // Newton-Raphson to find the bezier parameter t for the given x…
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = sampleX(t) - x;
    if (Math.abs(err) < 1e-6) return sampleY(t);
    const d = sampleDX(t);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }
  // …with a bisection fallback if the derivative was unhelpful.
  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 24; i++) {
    const xe = sampleX(t);
    if (Math.abs(xe - x) < 1e-6) break;
    if (x > xe) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return sampleY(t);
}

/** Eased progress in [0,1] for a transition spec at linear progress p∈[0,1].
 *  Invalid specs fall back to linear. Steps jump at the segment edges. */
export function easeProgress(spec: string | undefined, p: number): number {
  const s = (spec ?? "linear").trim().toLowerCase();
  const x = clamp01(p);
  if (s === "linear") return x;
  if (s === "step-start") return x <= 0 ? 0 : 1;
  if (s === "step-end") return x >= 1 ? 1 : 0;
  const bez = KEYWORD_BEZIER[s] ?? parseCubicBezier(s);
  return bez ? bezierY(bez, x) : x;
}

/** True for the two stepped timings (the engine schedules these as jumps). */
export function isStepTiming(spec: string | undefined): "start" | "end" | null {
  const s = (spec ?? "linear").trim().toLowerCase();
  if (s === "step-start") return "start";
  if (s === "step-end") return "end";
  return null;
}

/** A polyline (x,y in [0,1]) tracing the easing curve, for a small UI preview. */
export function easingCurvePoints(spec: string, steps = 24): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = i / steps;
    return [x, easeProgress(spec, x)] as [number, number];
  });
}
