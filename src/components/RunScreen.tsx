import { useEffect } from "react";
import type { ReactNode } from "react";
import type { AudioEngine } from "../lib/audio";
import { humanDuration } from "../lib/format";
import {
  BINAURAL_PRESET_SEEDS,
  NOISE_CORNERS,
  blendCornerColor,
  matchBinauralPreset,
} from "../lib/audioDesign";
import { isBreak } from "../lib/modes";
import type { AudioSettings, Block, SessionConfig } from "../types";
import { AudioController } from "./AudioController";
import { Display } from "./Display";
import { SchedulePreview } from "./SchedulePreview";
import type { TimerStatus } from "../hooks/useTimer";

function TButton({
  children,
  label,
  onClick,
  primary,
  size = "md",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-20 w-20" : "h-16 w-16";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`neu-raised flex ${dim} items-center justify-center rounded-full text-ink transition-transform active:scale-95 active:neu-pressed`}
    >
      <span
        className={primary ? "text-accent" : "text-ink"}
        style={primary ? { filter: "drop-shadow(0 0 6px #ff4f0066)" } : undefined}
      >
        {children}
      </span>
    </button>
  );
}

const sourceLabel = (a: AudioSettings): string => {
  switch (a.category) {
    case "none":
      return "Silent";
    case "noise": {
      const c = blendCornerColor(a.noise.blend);
      return c ? `${NOISE_CORNERS[c].label} noise` : "Custom noise";
    }
    case "binaural": {
      const p = matchBinauralPreset(a.binaural);
      return p ? `Binaural · ${BINAURAL_PRESET_SEEDS[p].label}` : "Binaural · Custom";
    }
    case "media":
      return a.media.kind === "youtube"
        ? "YouTube"
        : a.media.kind === "podcast"
          ? "Podcast"
          : "Media URL";
  }
};

export function RunScreen({
  blocks,
  cfg,
  audio,
  engine,
  status,
  index,
  remaining,
  currentBlock,
  start,
  onPause,
  onResume,
  onSkip,
  onStop,
  onRestart,
}: {
  blocks: Block[];
  cfg: SessionConfig;
  audio: AudioSettings;
  engine: AudioEngine;
  status: TimerStatus;
  index: number;
  remaining: number;
  currentBlock: Block | null;
  start: Date;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onStop: () => void;
  onRestart: () => void;
}) {
  const focusTotal = cfg.sessions;
  const focusDone = blocks
    .slice(0, index)
    .filter((b) => b.type === "focus").length;

  const block = currentBlock;
  const progress = block ? 1 - remaining / block.duration : 0;
  const onBreak = block ? isBreak(block.type) : false;
  const running = status === "running" && audio.category !== "none";
  const muted = audio.pauseOnBreak && onBreak;
  const audioActive = running && !muted;

  const done = status === "done";

  // Keyboard transport: space = pause/resume, n = skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      if (done) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (status === "running") onPause();
        else if (status === "paused") onResume();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, done, onPause, onResume, onSkip]);

  // Announce the current phase to screen readers (changes only at boundaries).
  const announcement = done
    ? "Session complete"
    : block
      ? `${block.label}, ${humanDuration(block.duration)}`
      : "";

  return (
    <div className="flex flex-col gap-4">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <Display
        block={block}
        remaining={remaining}
        running={status === "running"}
        focusDone={focusDone}
        focusTotal={focusTotal}
        progress={progress}
      />

      {/* transport */}
      <section className="neu-raised p-5">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-accent">
              Session complete
            </p>
            <p className="text-sm text-muted">
              {focusTotal} focus unit{focusTotal > 1 ? "s" : ""} done. Nice flow.
            </p>
            <div className="flex gap-4">
              <TButton label="Restart" onClick={onRestart} primary size="lg">
                <PlayIcon />
              </TButton>
              <TButton label="New session" onClick={onStop} size="lg">
                <StopIcon />
              </TButton>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-5">
            <TButton label="Stop session" onClick={onStop}>
              <StopIcon />
            </TButton>
            {status === "running" ? (
              <TButton label="Pause" onClick={onPause} primary size="lg">
                <PauseIcon />
              </TButton>
            ) : (
              <TButton label="Resume" onClick={onResume} primary size="lg">
                <PlayIcon />
              </TButton>
            )}
            <TButton label="Skip phase" onClick={onSkip}>
              <SkipIcon />
            </TButton>
          </div>
        )}
      </section>

      {/* now playing */}
      {audio.category !== "none" && !done && (
        <section className="neu-flat flex items-center gap-3 px-5 py-4">
          <span
            className={`h-2.5 w-2.5 rounded-full ${audioActive ? "pulsing" : ""}`}
            style={{ background: audioActive ? "#ff4f00" : "var(--color-faint)" }}
            aria-hidden
          />
          <div className="flex-1">
            <span className="tech-label">Now playing</span>
            <p className="text-sm font-semibold text-ink">{sourceLabel(audio)}</p>
          </div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-muted">
            {audioActive ? "On" : onBreak && audio.pauseOnBreak ? "Break" : "Idle"}
          </span>
        </section>
      )}

      <AudioController engine={engine} cfg={audio} running={running} muted={muted} />

      <section className="neu-raised p-5">
        <SchedulePreview blocks={blocks} start={start} activeIndex={index} />
      </section>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
function SkipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5v14l9-7zM16 5h2.5v14H16z" />
    </svg>
  );
}
