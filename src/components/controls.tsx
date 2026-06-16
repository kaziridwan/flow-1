import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="tech-label">{children}</span>;
}

export function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  accent = "var(--color-accent)",
}: {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="neu-flat px-4 py-3">
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
          className="neu-flat h-9 w-9 rounded-xl text-lg font-bold text-ink active:[box-shadow:inset_3px_3px_7px_var(--sh-dark),inset_-3px_-3px_7px_var(--sh-light)]"
        >
          –
        </button>
        <div className="flex items-baseline tabular-nums">
          <span className="font-mono text-2xl font-extrabold text-ink">{value}</span>
          {unit && <span className="ml-1 text-xs font-medium text-muted">{unit}</span>}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
          className="neu-flat h-9 w-9 rounded-xl text-lg font-bold text-ink active:[box-shadow:inset_3px_3px_7px_var(--sh-dark),inset_-3px_-3px_7px_var(--sh-light)]"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="neu-flat flex w-full items-center justify-between px-4 py-3 text-left"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "neu-pressed" : "neu-pressed"
        }`}
        style={{ background: checked ? "var(--color-accent)" : "#d6d1c8" }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-[#f7f4ee] transition-all"
          style={{
            left: checked ? "calc(100% - 1.5rem)" : "0.25rem",
            boxShadow: "1px 1px 3px rgba(0,0,0,0.25)",
          }}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { value: T; label: string; dot?: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div
      className="neu-inset grid gap-1.5 p-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all ${
              active ? "neu-raised text-ink" : "text-muted"
            }`}
          >
            {opt.dot && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: active ? opt.dot : "var(--color-faint)" }}
                aria-hidden
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
