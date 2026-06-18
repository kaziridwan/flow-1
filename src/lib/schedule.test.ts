import { describe, expect, it } from "vitest";
import { buildSchedule, totalDuration, usesLongBreaks } from "./schedule";
import type { SessionConfig } from "../types";

const noMeals = {
  breakfast: { enabled: false, duration: 30 },
  lunch: { enabled: false, duration: 45 },
  dinner: { enabled: false, duration: 45 },
};

function cfg(over: Partial<SessionConfig> = {}): SessionConfig {
  return {
    sessions: 4,
    focusMin: 25,
    shortMin: 5,
    longMin: 15,
    bell: true,
    meals: noMeals,
    mealSlots: {},
    ...over,
  };
}

// 10:00 is outside every meal window, isolating the break logic.
const morning = new Date(2026, 5, 17, 10, 0, 0);

describe("usesLongBreaks", () => {
  it("is off below 5 sessions, on at 5+", () => {
    expect(usesLongBreaks(4)).toBe(false);
    expect(usesLongBreaks(5)).toBe(true);
  });
});

describe("buildSchedule break logic", () => {
  it("alternates focus/short with no trailing break, no long break under 5 sessions", () => {
    const blocks = buildSchedule(cfg({ sessions: 4 }), morning);
    expect(blocks.map((b) => b.type)).toEqual([
      "focus",
      "short",
      "focus",
      "short",
      "focus",
      "short",
      "focus",
    ]);
    expect(blocks.some((b) => b.type === "long")).toBe(false);
  });

  it("inserts a long break after every 4th focus when 5+ sessions", () => {
    const blocks = buildSchedule(cfg({ sessions: 5 }), morning);
    expect(blocks.map((b) => b.type)).toEqual([
      "focus",
      "short",
      "focus",
      "short",
      "focus",
      "short",
      "focus",
      "long",
      "focus",
    ]);
  });

  it("never appends a break after the last focus block", () => {
    const blocks = buildSchedule(cfg({ sessions: 6 }), morning);
    expect(blocks[blocks.length - 1].type).toBe("focus");
  });

  it("numbers focus blocks 1..n", () => {
    const blocks = buildSchedule(cfg({ sessions: 3 }), morning);
    const focusIdx = blocks.filter((b) => b.type === "focus").map((b) => b.focusIndex);
    expect(focusIdx).toEqual([1, 2, 3]);
  });
});

describe("buildSchedule meal insertion", () => {
  it("inserts an enabled meal when a focus block starts inside its window", () => {
    // 12:10 is inside the lunch window (12:00–14:30).
    const lunchTime = new Date(2026, 5, 17, 12, 10, 0);
    const blocks = buildSchedule(
      cfg({ sessions: 1, meals: { ...noMeals, lunch: { enabled: true, duration: 45 } } }),
      lunchTime,
    );
    expect(blocks[0].type).toBe("lunch");
    expect(blocks[1].type).toBe("focus");
  });

  it("skips meals that are disabled", () => {
    const lunchTime = new Date(2026, 5, 17, 12, 10, 0);
    const blocks = buildSchedule(cfg({ sessions: 1 }), lunchTime);
    expect(blocks.some((b) => b.type === "lunch")).toBe(false);
  });

  it("does not insert a meal outside its clock window", () => {
    const blocks = buildSchedule(
      cfg({ sessions: 1, meals: { ...noMeals, lunch: { enabled: true, duration: 45 } } }),
      morning,
    );
    expect(blocks.some((b) => b.type === "lunch")).toBe(false);
  });
});

describe("buildSchedule manual meal slots", () => {
  const enabledLunch = {
    breakfast: { enabled: false, duration: 30 },
    lunch: { enabled: true, duration: 45 },
    dinner: { enabled: false, duration: 45 },
  };

  it("pins a meal before its chosen focus session, ignoring the clock window", () => {
    // 10:00 is outside the lunch window, so without a slot it wouldn't appear.
    const blocks = buildSchedule(
      cfg({ sessions: 3, meals: enabledLunch, mealSlots: { lunch: 2 } }),
      morning,
    );
    const labels = blocks.map((b) => `${b.type}${b.focusIndex ?? ""}`);
    expect(labels).toEqual([
      "focus1",
      "short",
      "lunch",
      "focus2",
      "short",
      "focus3",
    ]);
  });

  it("does not place a meal whose slot exceeds the session count", () => {
    const blocks = buildSchedule(
      cfg({ sessions: 2, meals: enabledLunch, mealSlots: { lunch: 9 } }),
      morning,
    );
    expect(blocks.some((b) => b.type === "lunch")).toBe(false);
  });
});

describe("totalDuration", () => {
  it("sums block durations in seconds", () => {
    const blocks = buildSchedule(cfg({ sessions: 2 }), morning);
    // f(25) + short(5) + f(25) = 55 min
    expect(totalDuration(blocks)).toBe(55 * 60);
  });
});
