import type { Block } from "../types";
import type { TimerStatus } from "../hooks/useTimer";

const KEY = "flow.run";

export interface RunSnapshot {
  blocks: Block[];
  startMs: number; // original run start (for the schedule preview clock)
  index: number;
  remaining: number; // seconds left in the block at savedAt
  status: TimerStatus;
  savedAt: number; // Date.now() when this snapshot was written
}

export function saveRun(s: RunSnapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function loadRun(): RunSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as RunSnapshot;
    if (!Array.isArray(s.blocks) || typeof s.savedAt !== "number") return null;
    return s;
  } catch {
    return null;
  }
}

/**
 * Restore a persisted run to the current wall-clock moment. A running snapshot
 * is fast-forwarded across any blocks that elapsed while away; a paused one is
 * returned untouched. Returns null if there's nothing live to resume (no
 * snapshot, finished while away, or not a resumable state).
 */
export function restoreRun(): {
  blocks: Block[];
  start: Date;
  index: number;
  remaining: number;
  paused: boolean;
} | null {
  const s = loadRun();
  if (!s) return null;

  if (s.status === "paused") {
    return {
      blocks: s.blocks,
      start: new Date(s.startMs),
      index: s.index,
      remaining: s.remaining,
      paused: true,
    };
  }
  if (s.status !== "running") return null;

  let elapsed = (Date.now() - s.savedAt) / 1000;
  let i = s.index;
  let rem = s.remaining;
  while (elapsed >= rem) {
    elapsed -= rem;
    i += 1;
    if (i >= s.blocks.length) return null; // finished while away
    rem = s.blocks[i].duration;
  }
  return {
    blocks: s.blocks,
    start: new Date(s.startMs),
    index: i,
    remaining: rem - elapsed,
    paused: false,
  };
}
