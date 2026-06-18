import { useState } from "react";
import { BUILTIN_BINAURAL_PRESETS } from "../lib/audioDesign";
import {
  addBinauralPreset,
  addNoisePreset,
  deletePreset,
  renamePreset,
  usePresets,
  type PresetKind,
} from "../lib/presetStore";
import type { BinauralDesign, NoiseDesign } from "../types";
import { Eyebrow } from "./controls";

/**
 * Save / apply / rename / delete user presets for one sound type. Shared by the
 * Noise Designer and Binaural Engine sheets and by the main `SoundPicker`, so a
 * preset saved in either place is selectable in both. Backed by `presetStore`.
 */
export function PresetControls<T extends BinauralDesign | NoiseDesign>({
  kind,
  current,
  onApply,
}: {
  kind: PresetKind;
  current: T;
  onApply: (design: T) => void;
}) {
  const presets = usePresets();
  const list = kind === "binaural" ? presets.binaural : presets.noise;
  const builtins = kind === "binaural" ? BUILTIN_BINAURAL_PRESETS : [];

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // The save form (name input + button) is hidden until the user opts in.
  const [creating, setCreating] = useState(false);

  const save = () => {
    const n = name.trim();
    if (!n) return;
    if (kind === "binaural") addBinauralPreset(n, current as BinauralDesign);
    else addNoisePreset(n, current as NoiseDesign);
    setName("");
  };

  const commitRename = () => {
    if (editingId) {
      const n = draft.trim();
      if (n) renamePreset(kind, editingId, n);
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Eyebrow>Saved presets</Eyebrow>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          aria-expanded={creating}
          className="text-xs text-muted hover:text-ink"
        >
          {creating ? "(close)" : "(select or create)"}
        </button>
      </div>

      {builtins.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {builtins.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => onApply(p.design as T)}
              className="neu-flat rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink"
              title="Built-in preset"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {list.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {list.map((p) =>
            editingId === p.id ? (
              <input
                key={p.id}
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
                aria-label={`Rename ${p.name}`}
                className="neu-inset rounded-lg bg-transparent px-2 py-1 text-xs font-semibold text-ink outline-none"
              />
            ) : (
              <span key={p.id} className="neu-flat flex items-center rounded-lg pl-2.5">
                <button
                  type="button"
                  onClick={() => onApply(p.design as T)}
                  className="py-1.5 text-xs font-semibold text-ink"
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${p.name}`}
                  onClick={() => {
                    setEditingId(p.id);
                    setDraft(p.name);
                  }}
                  className="px-1.5 text-muted hover:text-ink"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => deletePreset(kind, p.id)}
                  className="pr-2 pl-0.5 text-muted hover:text-accent"
                >
                  ✕
                </button>
              </span>
            ),
          )}
        </div>
      ) : (
        <p className="text-xs text-faint">No saved presets yet.</p>
      )}

      {creating && (
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            placeholder="Name this preset…"
            aria-label="Preset name"
            className="neu-inset min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-sm text-ink outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="neu-flat rounded-lg px-4 text-xs font-bold uppercase tracking-[0.12em] text-muted active:neu-pressed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}
