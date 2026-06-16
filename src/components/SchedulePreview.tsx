import { clock, humanDuration } from "../lib/format";
import { MODE_META } from "../lib/modes";
import { totalDuration, withClockTimes } from "../lib/schedule";
import type { Block } from "../types";

export function SchedulePreview({
  blocks,
  start,
  activeIndex = -1,
}: {
  blocks: Block[];
  start: Date;
  activeIndex?: number;
}) {
  const rows = withClockTimes(blocks, start);
  const total = totalDuration(blocks);
  const endsAt = rows.length ? rows[rows.length - 1].endsAt : start;
  const meals = blocks.filter((b) => MODE_META[b.type].short === "EAT").length;

  return (
    <div className="neu-inset p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="tech-label">Timeline</span>
        <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted">
          {humanDuration(total)} · ends {clock(endsAt)}
        </span>
      </div>

      <ol className="flex flex-col gap-1.5">
        {rows.map(({ block, startsAt }, i) => {
          const meta = MODE_META[block.type];
          const active = i === activeIndex;
          return (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                active ? "neu-pressed" : ""
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: meta.color }}
                aria-hidden
              />
              <span className="font-mono text-xs font-bold tabular-nums text-muted">
                {clock(startsAt)}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-ink">
                {block.label}
              </span>
              <span className="font-mono text-xs tabular-nums text-faint">
                {humanDuration(block.duration)}
              </span>
            </li>
          );
        })}
      </ol>

      {meals > 0 && (
        <p className="mt-3 text-xs text-muted">
          {meals} meal break{meals > 1 ? "s" : ""} placed around your start time.
        </p>
      )}
    </div>
  );
}
