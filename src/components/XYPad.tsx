import { useRef } from "react";
import { NOISE_CORNERS } from "../lib/audioDesign";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * An Endel-style 2D blend pad. Each corner is a noise color; the handle's
 * position is the bilinear mix. Pointer-draggable and keyboard-accessible
 * (arrow keys nudge by 5%). Respects prefers-reduced-motion via Tailwind's
 * `motion-safe`/`motion-reduce` variants on the handle transition.
 */
export function XYPad({
  x,
  y,
  onChange,
}: {
  x: number;
  y: number;
  onChange: (p: { x: number; y: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromEvent = (e: { clientX: number; clientY: number }) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onChange({
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.2 : 0.05;
    if (e.key === "ArrowLeft") onChange({ x: clamp01(x - step), y });
    else if (e.key === "ArrowRight") onChange({ x: clamp01(x + step), y });
    else if (e.key === "ArrowUp") onChange({ x, y: clamp01(y - step) });
    else if (e.key === "ArrowDown") onChange({ x, y: clamp01(y + step) });
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      role="application"
      aria-label={`Noise blend pad. Horizontal ${Math.round(
        x * 100,
      )}%, vertical ${Math.round(y * 100)}%. Arrow keys to adjust.`}
      tabIndex={0}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        fromEvent(e);
      }}
      onPointerMove={(e) => dragging.current && fromEvent(e)}
      onPointerUp={() => (dragging.current = false)}
      onKeyDown={onKeyDown}
      className="neu-inset relative aspect-square w-full touch-none select-none rounded-2xl"
    >
      {/* corner labels — positions mirror NOISE_CORNERS (x→right, y→down) */}
      <CornerLabel pos="top-2 left-2" color="white" />
      <CornerLabel pos="top-2 right-2" color="pink" />
      <CornerLabel pos="bottom-2 left-2" color="brown" />
      <CornerLabel pos="bottom-2 right-2" color="blue" />

      {/* handle */}
      <span
        className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-screen motion-safe:transition-[left,top] motion-safe:duration-75"
        style={{
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          boxShadow: "0 0 8px #ff4f0088",
        }}
        aria-hidden
      />
    </div>
  );
}

function CornerLabel({
  pos,
  color,
}: {
  pos: string;
  color: keyof typeof NOISE_CORNERS;
}) {
  const c = NOISE_CORNERS[color];
  return (
    <span
      className={`absolute ${pos} flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: c.dot }}
        aria-hidden
      />
      {c.label}
    </span>
  );
}
