import type { BlockType } from "../types";

export const MODE_META: Record<
  BlockType,
  { color: string; label: string; short: string }
> = {
  focus: { color: "#ff4f00", label: "Focus", short: "FOC" },
  short: { color: "#2b8cff", label: "Short break", short: "BRK" },
  long: { color: "#16b06a", label: "Long break", short: "LNG" },
  breakfast: { color: "#f5a623", label: "Breakfast", short: "EAT" },
  lunch: { color: "#f5a623", label: "Lunch", short: "EAT" },
  dinner: { color: "#f5a623", label: "Dinner", short: "EAT" },
};

export function isBreak(t: BlockType): boolean {
  return t !== "focus";
}
