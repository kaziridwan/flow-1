import type { Block, MealKey, SessionConfig } from "../types";

/** Clock windows (minutes from midnight) within which a meal break is offered. */
export const MEAL_WINDOWS: Record<MealKey, { start: number; end: number; label: string }> = {
  breakfast: { start: 7 * 60, end: 9 * 60 + 30, label: "Breakfast" },
  lunch: { start: 12 * 60, end: 14 * 60 + 30, label: "Lunch" },
  dinner: { start: 18 * 60 + 30, end: 21 * 60, label: "Dinner" },
};

export const MEAL_ORDER: MealKey[] = ["breakfast", "lunch", "dinner"];

/** A long break replaces a short break after every 4th focus session,
 *  but only when the plan has 5 or more sessions. */
export const LONG_BREAK_EVERY = 4;
export const LONG_BREAK_MIN_SESSIONS = 5;

export function usesLongBreaks(sessions: number): boolean {
  return sessions >= LONG_BREAK_MIN_SESSIONS;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Build the full ordered timeline of blocks, inserting meal breaks whenever a
 * focus session is about to begin inside an un-taken meal window. The start
 * clock time therefore decides which meals land in the plan.
 */
export function buildSchedule(cfg: SessionConfig, start: Date = new Date()): Block[] {
  const blocks: Block[] = [];
  const cursor = new Date(start.getTime());
  const taken: Record<MealKey, boolean> = {
    breakfast: false,
    lunch: false,
    dinner: false,
  };
  const longBreaks = usesLongBreaks(cfg.sessions);
  const slots = cfg.mealSlots ?? {};

  const advance = (minutes: number) =>
    cursor.setMinutes(cursor.getMinutes() + minutes);

  for (let i = 1; i <= cfg.sessions; i++) {
    // Insert meals before this focus block: a manually-pinned meal lands at its
    // chosen session (ignoring its window); otherwise a meal lands if the cursor
    // is currently inside its clock window.
    for (const meal of MEAL_ORDER) {
      const m = cfg.meals[meal];
      if (!m.enabled || taken[meal]) continue;
      const slot = slots[meal];
      const place =
        slot != null
          ? slot === i
          : (() => {
              const w = MEAL_WINDOWS[meal];
              const now = minutesOfDay(cursor);
              return now >= w.start && now < w.end;
            })();
      if (place) {
        blocks.push({
          type: meal,
          duration: m.duration * 60,
          label: MEAL_WINDOWS[meal].label,
        });
        taken[meal] = true;
        advance(m.duration);
      }
    }

    blocks.push({
      type: "focus",
      duration: cfg.focusMin * 60,
      focusIndex: i,
      label: `Focus ${i}`,
    });
    advance(cfg.focusMin);

    const isLast = i === cfg.sessions;
    if (!isLast) {
      const isLong = longBreaks && i % LONG_BREAK_EVERY === 0;
      blocks.push({
        type: isLong ? "long" : "short",
        duration: (isLong ? cfg.longMin : cfg.shortMin) * 60,
        label: isLong ? "Long break" : "Short break",
      });
      advance(isLong ? cfg.longMin : cfg.shortMin);
    }
  }

  return blocks;
}

/** Lay out clock times for a built schedule, for preview purposes. */
export function withClockTimes(
  blocks: Block[],
  start: Date = new Date(),
): { block: Block; startsAt: Date; endsAt: Date }[] {
  const cursor = new Date(start.getTime());
  return blocks.map((block) => {
    const startsAt = new Date(cursor.getTime());
    cursor.setSeconds(cursor.getSeconds() + block.duration);
    const endsAt = new Date(cursor.getTime());
    return { block, startsAt, endsAt };
  });
}

export function totalDuration(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + b.duration, 0);
}
