import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * A lightweight modal sheet for the sound designers. Quiet neumorphic surface
 * (preserves the "one bold element" rule), with backdrop dismiss, Escape to
 * close, and a simple focus trap. No external dependencies.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") trapTab(e, panelRef.current);
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the panel.
    panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    )?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="neu-raised w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-3xl p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm font-extrabold uppercase tracking-[0.12em] text-ink">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="neu-flat flex h-9 w-9 items-center justify-center rounded-xl text-muted active:neu-pressed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function trapTab(e: KeyboardEvent, panel: HTMLElement | null) {
  if (!panel) return;
  const focusable = panel.querySelectorAll<HTMLElement>(
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
