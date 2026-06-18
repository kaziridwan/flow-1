import { useState } from "react";
import { clock, humanDuration } from "../lib/format";
import { MODE_META } from "../lib/modes";
import { totalDuration, withClockTimes } from "../lib/schedule";
import type { Block, MealKey } from "../types";

const MEAL_TYPES: MealKey[] = ["breakfast", "lunch", "dinner"];
const isMeal = (t: Block["type"]): t is MealKey =>
  (MEAL_TYPES as string[]).includes(t);

export function SchedulePreview({
  blocks,
  start,
  activeIndex = -1,
  mealSlots,
  onPinMeal,
}: {
  blocks: Block[];
  start: Date;
  activeIndex?: number;
  /** Current manual meal pins (meal → focus index), for the pinned badge. */
  mealSlots?: Partial<Record<MealKey, number>>;
  /** When provided, drag a meal onto a focus block to pin it there (or unpin
   *  with null). Enables the drag affordances; omit in run mode. */
  onPinMeal?: (meal: MealKey, focusIndex: number | null) => void;
}) {
  const rows = withClockTimes(blocks, start);
  const total = totalDuration(blocks);
  const endsAt = rows.length ? rows[rows.length - 1].endsAt : start;
  const meals = blocks.filter((b) => MODE_META[b.type].short === "EAT").length;
  const editable = !!onPinMeal;

  const [dragMeal, setDragMeal] = useState<MealKey | null>(null);
  const [overFocus, setOverFocus] = useState<number | null>(null);

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
          const mealRow = editable && isMeal(block.type);
          const pinned = mealRow && mealSlots?.[block.type as MealKey] != null;
          const dragging = mealRow && dragMeal === block.type;
          const isFocusTarget =
            editable && dragMeal !== null && block.type === "focus";
          const over = isFocusTarget && overFocus === block.focusIndex;

          return (
            <li
              key={i}
              draggable={mealRow}
              onDragStart={
                mealRow ? () => setDragMeal(block.type as MealKey) : undefined
              }
              onDragEnd={
                mealRow
                  ? () => {
                      setDragMeal(null);
                      setOverFocus(null);
                    }
                  : undefined
              }
              onDragOver={
                isFocusTarget
                  ? (e) => {
                      e.preventDefault();
                      setOverFocus(block.focusIndex ?? null);
                    }
                  : undefined
              }
              onDrop={
                isFocusTarget
                  ? () => {
                      if (dragMeal && block.focusIndex != null)
                        onPinMeal!(dragMeal, block.focusIndex);
                      setDragMeal(null);
                      setOverFocus(null);
                    }
                  : undefined
              }
              className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                active ? "neu-pressed" : ""
              } ${mealRow ? "cursor-grab active:cursor-grabbing" : ""} ${
                dragging ? "opacity-50" : ""
              } ${over ? "neu-pressed ring-1 ring-accent" : ""}`}
            >
              {mealRow && (
                <span className="text-faint" aria-hidden title="Drag onto a focus block to place this meal">
                  ⠿
                </span>
              )}
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
              {pinned && (
                <button
                  type="button"
                  onClick={() => onPinMeal!(block.type as MealKey, null)}
                  className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-accent"
                  title="Pinned here — click to revert to its time window"
                >
                  pinned ✕
                </button>
              )}
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
          {editable && " Drag a meal onto a focus block to place it there."}
        </p>
      )}
    </div>
  );
}
