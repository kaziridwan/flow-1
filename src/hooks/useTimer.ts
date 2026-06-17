import { useCallback, useEffect, useRef, useState } from "react";
import type { Block } from "../types";

export type TimerStatus = "idle" | "running" | "paused" | "done";

interface Options {
  onAdvance?: (from: Block, to: Block | null, index: number) => void;
  onComplete?: () => void;
}

const TICK_MS = 200;

export function useTimer(blocks: Block[], opts: Options = {}) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const deadlineRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSecRef = useRef(-1);
  const indexRef = useRef(0);

  const optsRef = useRef(opts);
  optsRef.current = opts;
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const clearLoop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const goTo = useCallback((i: number) => {
    const list = blocksRef.current;
    indexRef.current = i;
    setIndex(i);
    if (i >= list.length) {
      setStatus("done");
      setRemaining(0);
      optsRef.current.onComplete?.();
      return false;
    }
    const dur = list[i].duration;
    deadlineRef.current = performance.now() + dur * 1000;
    lastSecRef.current = dur;
    setRemaining(dur);
    return true;
  }, []);

  const tick = useCallback(() => {
    const left = (deadlineRef.current - performance.now()) / 1000;
    if (left <= 0) {
      const cur = indexRef.current;
      const list = blocksRef.current;
      const next = cur + 1;
      optsRef.current.onAdvance?.(
        list[cur],
        next < list.length ? list[next] : null,
        next,
      );
      if (!goTo(next)) clearLoop();
    } else {
      const sec = Math.ceil(left);
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        setRemaining(left);
      }
    }
  }, [goTo]);

  const startLoop = useCallback(() => {
    clearLoop();
    intervalRef.current = setInterval(tick, TICK_MS);
  }, [tick]);

  const start = useCallback(() => {
    if (!blocksRef.current.length) return;
    if (goTo(0)) {
      setStatus("running");
      startLoop();
    }
  }, [goTo, startLoop]);

  const pause = useCallback(() => {
    setStatus((s) => {
      if (s !== "running") return s;
      clearLoop();
      const left = (deadlineRef.current - performance.now()) / 1000;
      lastSecRef.current = Math.ceil(left);
      setRemaining(Math.max(0, left));
      return "paused";
    });
  }, []);

  const resume = useCallback(() => {
    setStatus((s) => {
      if (s !== "paused") return s;
      deadlineRef.current = performance.now() + remaining * 1000;
      startLoop();
      return "running";
    });
  }, [remaining, startLoop]);

  const skip = useCallback(() => {
    if (status === "idle" || status === "done") return;
    const cur = indexRef.current;
    const list = blocksRef.current;
    const next = cur + 1;
    optsRef.current.onAdvance?.(
      list[cur],
      next < list.length ? list[next] : null,
      next,
    );
    const ok = goTo(next);
    if (ok && status === "running") startLoop();
    else if (!ok) clearLoop();
  }, [goTo, startLoop, status]);

  /** Resume a persisted run at a given block/remaining (running or paused). */
  const restore = useCallback(
    (i: number, rem: number, paused: boolean) => {
      const list = blocksRef.current;
      if (i < 0 || i >= list.length) return;
      indexRef.current = i;
      setIndex(i);
      setRemaining(rem);
      lastSecRef.current = Math.ceil(rem);
      deadlineRef.current = performance.now() + rem * 1000;
      if (paused) {
        setStatus("paused");
      } else {
        setStatus("running");
        startLoop();
      }
    },
    [startLoop],
  );

  const reset = useCallback(() => {
    clearLoop();
    indexRef.current = 0;
    lastSecRef.current = -1;
    setIndex(0);
    setRemaining(0);
    setStatus("idle");
  }, []);

  useEffect(() => () => clearLoop(), []);

  const currentBlock = status === "idle" ? null : (blocks[index] ?? null);

  return {
    status,
    index,
    remaining,
    currentBlock,
    start,
    pause,
    resume,
    skip,
    reset,
    restore,
  };
}
