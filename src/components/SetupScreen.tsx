import { useState } from "react";
import type { AudioEngine } from "../lib/audio";
import { LONG_BREAK_MIN_SESSIONS, MEAL_WINDOWS, usesLongBreaks } from "../lib/schedule";
import type {
  AudioSettings,
  Block,
  MealKey,
  SessionConfig,
} from "../types";
import { AudioPicker } from "./AudioPicker";
import { Eyebrow, Stepper, Toggle } from "./controls";
import { SchedulePreview } from "./SchedulePreview";

const MEALS: MealKey[] = ["breakfast", "lunch", "dinner"];

export function SetupScreen({
  cfg,
  setCfg,
  audio,
  setAudio,
  engine,
  blocks,
  start,
  onStart,
}: {
  cfg: SessionConfig;
  setCfg: (c: SessionConfig) => void;
  audio: AudioSettings;
  setAudio: (a: AudioSettings) => void;
  engine: AudioEngine;
  blocks: Block[];
  start: Date;
  onStart: () => void;
}) {
  const [mealsOpen, setMealsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const set = (patch: Partial<SessionConfig>) => setCfg({ ...cfg, ...patch });
  const setMeal = (key: MealKey, patch: Partial<SessionConfig["meals"][MealKey]>) =>
    setCfg({ ...cfg, meals: { ...cfg.meals, [key]: { ...cfg.meals[key], ...patch } } });

  const longActive = usesLongBreaks(cfg.sessions);

  return (
    <div className="flex flex-col gap-4">
      {/* durations */}
      <section className="neu-raised p-5">
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow>01 · Session</Eyebrow>
          <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted">
            Sequence
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stepper
            label="Sessions"
            value={cfg.sessions}
            min={1}
            max={16}
            onChange={(v) => set({ sessions: v })}
            accent="#ff4f00"
          />
          <Stepper
            label="Focus"
            value={cfg.focusMin}
            unit="min"
            min={5}
            max={90}
            step={5}
            onChange={(v) => set({ focusMin: v })}
            accent="#ff4f00"
          />
          <Stepper
            label="Short break"
            value={cfg.shortMin}
            unit="min"
            min={1}
            max={30}
            onChange={(v) => set({ shortMin: v })}
            accent="#2b8cff"
          />
          <Stepper
            label="Long break"
            value={cfg.longMin}
            unit="min"
            min={5}
            max={60}
            step={5}
            onChange={(v) => set({ longMin: v })}
            accent="#16b06a"
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          {longActive ? (
            <>A long break lands after every 4th focus session.</>
          ) : (
            <>
              Add {LONG_BREAK_MIN_SESSIONS}+ sessions to unlock a long break every
              4th focus.
            </>
          )}
        </p>
      </section>

      {/* transitions + audio */}
      <section className="neu-raised p-5">
        <div className="mb-3">
          <Eyebrow>02 · Sound</Eyebrow>
        </div>
        <div className="mb-3">
          <Toggle
            label="Transition bell"
            hint="A soft chime when a phase changes"
            checked={cfg.bell}
            onChange={(v) => set({ bell: v })}
          />
        </div>
        <AudioPicker cfg={audio} onChange={setAudio} engine={engine} />
      </section>

      {/* meals */}
      <section className="neu-raised p-5">
        <button
          type="button"
          onClick={() => setMealsOpen((o) => !o)}
          aria-expanded={mealsOpen}
          className="flex w-full items-center justify-between"
        >
          <Eyebrow>03 · Meal breaks</Eyebrow>
          <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted">
            {mealsOpen ? "Hide ▴" : "Show ▾"}
          </span>
        </button>
        {mealsOpen && (
          <>
        <div className="mt-3 flex flex-col gap-2.5">
          {MEALS.map((key) => {
            const w = MEAL_WINDOWS[key];
            const m = cfg.meals[key];
            const win = `${String(Math.floor(w.start / 60)).padStart(2, "0")}:${String(
              w.start % 60,
            ).padStart(2, "0")}–${String(Math.floor(w.end / 60)).padStart(2, "0")}:${String(
              w.end % 60,
            ).padStart(2, "0")}`;
            return (
              <div key={key} className="flex items-stretch gap-2">
                <div className="flex-1">
                  <Toggle
                    label={w.label}
                    hint={`Window ${win}`}
                    checked={m.enabled}
                    onChange={(v) => setMeal(key, { enabled: v })}
                  />
                </div>
                {m.enabled && (
                  <div className="neu-flat flex w-24 flex-col items-center justify-center px-2 py-1">
                    <span className="tech-label">min</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Decrease ${w.label} minutes`}
                        onClick={() =>
                          setMeal(key, { duration: Math.max(10, m.duration - 5) })
                        }
                        className="px-1 text-base font-bold text-muted"
                      >
                        –
                      </button>
                      <span className="font-mono text-lg font-extrabold tabular-nums text-ink">
                        {m.duration}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${w.label} minutes`}
                        onClick={() =>
                          setMeal(key, { duration: Math.min(90, m.duration + 5) })
                        }
                        className="px-1 text-base font-bold text-muted"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Meals are inserted only if a focus session would begin inside the
          window — so they follow your real start time.
        </p>
          </>
        )}
      </section>

      {/* preview */}
      <section className="neu-raised p-5">
        <button
          type="button"
          onClick={() => setPreviewOpen((o) => !o)}
          aria-expanded={previewOpen}
          className="flex w-full items-center justify-between"
        >
          <Eyebrow>04 · Preview</Eyebrow>
          <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted">
            {previewOpen ? "Hide ▴" : "Show ▾"}
          </span>
        </button>
        {previewOpen && (
          <div className="mt-3">
            <SchedulePreview
              blocks={blocks}
              start={start}
              mealSlots={cfg.mealSlots}
              onPinMeal={(meal, focusIndex) => {
                const next = { ...cfg.mealSlots };
                if (focusIndex == null) delete next[meal];
                else next[meal] = focusIndex;
                set({ mealSlots: next });
              }}
            />
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={onStart}
        className="neu-raised group relative flex items-center justify-center gap-3 py-5 text-base font-extrabold uppercase tracking-[0.15em] text-ink transition-transform active:scale-[0.99] active:neu-pressed"
      >
        <span
          className="h-3 w-3 rounded-full bg-accent"
          style={{ boxShadow: "0 0 10px #ff4f00" }}
          aria-hidden
        />
        Start session
      </button>
    </div>
  );
}
