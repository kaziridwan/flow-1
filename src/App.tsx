import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "./lib/audio";
import { buildSchedule } from "./lib/schedule";
import { useTimer } from "./hooks/useTimer";
import { SetupScreen } from "./components/SetupScreen";
import { RunScreen } from "./components/RunScreen";
import type { AudioConfig, Block, SessionConfig } from "./types";

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
};

const DEFAULT_AUDIO: AudioConfig = {
  source: "binaural",
  preset: "flow",
  url: "",
  volume: 0.6,
  pauseOnBreak: true,
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
  const [audio, setAudio] = useState<AudioConfig>(() =>
    load("flow.audio", DEFAULT_AUDIO),
  );
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

  useEffect(() => {
    if (runId > 0) {
      engine.resume();
      timerRef.current.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

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
