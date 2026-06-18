import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "./lib/audio";
import { defaultAudioSettings } from "./lib/audioDesign";
import { migrateAudio } from "./lib/migrate";
import { buildSchedule } from "./lib/schedule";
import { clearRun, restoreRun, saveRun } from "./lib/runStore";
import { useTimer } from "./hooks/useTimer";
import { SetupScreen } from "./components/SetupScreen";
import { RunScreen } from "./components/RunScreen";
import type { AudioSettings, Block, SessionConfig } from "./types";

const DEFAULT_CFG: SessionConfig = {
  sessions: 4,
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  bell: true,
  meals: {
    breakfast: { enabled: false, duration: 30 },
    lunch: { enabled: true, duration: 45 },
    dinner: { enabled: false, duration: 45 },
  },
  mealSlots: {},
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [cfg, setCfg] = useState<SessionConfig>(() => load("flow.cfg", DEFAULT_CFG));
  const [audio, setAudio] = useState<AudioSettings>(() => {
    try {
      const raw = localStorage.getItem("flow.audio");
      return migrateAudio(raw ? JSON.parse(raw) : null);
    } catch {
      return defaultAudioSettings();
    }
  });
  const [committed, setCommitted] = useState<{ blocks: Block[]; start: Date } | null>(
    null,
  );
  const [runId, setRunId] = useState(0);
  const [now, setNow] = useState(() => new Date());

  const engineRef = useRef<AudioEngine | null>(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();
  const engine = engineRef.current;

  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  // Keep meal-window preview honest as the clock moves.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("flow.cfg", JSON.stringify(cfg));
    } catch {
      /* ignore */
    }
  }, [cfg]);
  useEffect(() => {
    try {
      localStorage.setItem("flow.audio", JSON.stringify(audio));
    } catch {
      /* ignore */
    }
  }, [audio]);

  const previewBlocks = useMemo(() => buildSchedule(cfg, now), [cfg, now]);

  const onAdvance = useCallback(() => {
    if (cfgRef.current.bell) engine.bell();
  }, [engine]);
  const onComplete = useCallback(() => {
    if (cfgRef.current.bell) engine.bell();
  }, [engine]);

  const timer = useTimer(committed?.blocks ?? [], { onAdvance, onComplete });
  const timerRef = useRef(timer);
  timerRef.current = timer;

  // Position to resume at when restoring a persisted run; null = fresh start.
  const pendingStartRef = useRef<{
    index: number;
    remaining: number;
    paused: boolean;
  } | null>(null);

  useEffect(() => {
    if (runId > 0) {
      engine.resume();
      const p = pendingStartRef.current;
      if (p) {
        timerRef.current.restore(p.index, p.remaining, p.paused);
        pendingStartRef.current = null;
      } else {
        timerRef.current.start();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Restore an in-progress run across reloads (once, on mount).
  useEffect(() => {
    const r = restoreRun();
    if (!r) {
      clearRun();
      return;
    }
    setCommitted({ blocks: r.blocks, start: r.start });
    pendingStartRef.current = {
      index: r.index,
      remaining: r.remaining,
      paused: r.paused,
    };
    setRunId((id) => id + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the run at each block boundary and on pause/resume/stop/complete.
  useEffect(() => {
    if (!committed) {
      clearRun();
      return;
    }
    if (timer.status === "done" || timer.status === "idle") {
      clearRun();
      return;
    }
    saveRun({
      blocks: committed.blocks,
      startMs: committed.start.getTime(),
      index: timer.index,
      remaining: timer.remaining,
      status: timer.status,
      savedAt: Date.now(),
    });
    // timer.remaining intentionally omitted from deps — captured at each block
    // boundary / pause, not every second (the snapshot derives the rest from
    // savedAt + wall clock).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committed, timer.index, timer.status]);

  const handleStart = () => {
    const start = new Date();
    const blocks = buildSchedule(cfg, start);
    setCommitted({ blocks, start });
    setRunId((id) => id + 1);
  };

  const handleStop = () => {
    timer.reset();
    engine.stopTone();
    setCommitted(null);
  };

  const handleRestart = () => {
    if (!committed) return;
    const start = new Date();
    const blocks = buildSchedule(cfg, start);
    setCommitted({ blocks, start });
    setRunId((id) => id + 1);
  };

  useEffect(() => () => engine.dispose(), [engine]);

  const running = committed !== null;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-12 pt-8 sm:max-w-lg">
      <header className="mb-6 flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="neu-raised flex h-11 w-11 items-center justify-center rounded-2xl">
            <span
              className="h-4 w-4 rounded-full border-[3px] border-accent"
              aria-hidden
            />
          </div>
          <div className="leading-none">
            <h1 className="font-mono text-base font-extrabold tracking-[0.06em] text-ink">
              FLOW-1
            </h1>
            <p className="tech-label">pomodoro unit</p>
          </div>
        </div>
        <span className="neu-flat px-3 py-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted">
          {running ? "Run" : "Patch"}
        </span>
      </header>

      {running ? (
        <RunScreen
          blocks={committed.blocks}
          cfg={cfg}
          audio={audio}
          engine={engine}
          status={timer.status}
          index={timer.index}
          remaining={timer.remaining}
          currentBlock={timer.currentBlock}
          start={committed.start}
          onPause={timer.pause}
          onResume={timer.resume}
          onSkip={timer.skip}
          onStop={handleStop}
          onRestart={handleRestart}
        />
      ) : (
        <SetupScreen
          cfg={cfg}
          setCfg={setCfg}
          audio={audio}
          setAudio={setAudio}
          engine={engine}
          blocks={previewBlocks}
          start={now}
          onStart={handleStart}
        />
      )}

      <footer className="mt-8 text-center">
        <p className="tech-label">Stay in flow · sound stays in your browser</p>
      </footer>
    </div>
  );
}
