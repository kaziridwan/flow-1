import { mmss } from "../lib/format";
import { MODE_META } from "../lib/modes";
import type { Block } from "../types";

export function Display({
  block,
  remaining,
  running,
  focusDone,
  focusTotal,
  progress,
}: {
  block: Block | null;
  remaining: number;
  running: boolean;
  focusDone: number;
  focusTotal: number;
  progress: number; // 0..1 within current block
}) {
  const meta = block ? MODE_META[block.type] : null;
  const color = meta?.color ?? "#f0e9dd";

  return (
    <div className="screen-bezel p-3">
      <div className="screen-face px-5 py-6 sm:px-7 sm:py-8">
        {/* top status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${running ? "pulsing" : ""}`}
              style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              aria-hidden
            />
            <span
              className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em]"
              style={{ color }}
            >
              {block ? meta!.label : "Ready"}
            </span>
          </div>
          <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#6f6a60]">
            {block?.type === "focus"
              ? `Unit ${block.focusIndex}/${focusTotal}`
              : block
                ? "Break"
                : `${focusTotal} units`}
          </span>
        </div>

        {/* digits */}
        <div
          className="lcd-digits mt-3 text-center text-[4.2rem] leading-none sm:text-[5.5rem]"
          style={{ color, textShadow: `0 0 18px ${color}66` }}
        >
          {mmss(remaining)}
        </div>

        {/* progress hairline */}
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-[#332f2a]">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        </div>

        {/* focus progress dots */}
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: focusTotal }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{
                background:
                  i < focusDone
                    ? "#ff4f00"
                    : i === focusDone && block?.type === "focus"
                      ? "#ff4f00"
                      : "#3a352f",
                boxShadow:
                  i === focusDone && block?.type === "focus"
                    ? "0 0 7px #ff4f00"
                    : "none",
                opacity: i === focusDone && block?.type === "focus" ? 1 : undefined,
              }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}
