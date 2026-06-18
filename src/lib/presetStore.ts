import { useSyncExternalStore } from "react";
import type { BinauralDesign, NoiseDesign } from "../types";

/**
 * User-saved sound presets, persisted in `localStorage["flow.presets"]`.
 *
 * Kept as a tiny external store (subscribe + snapshot) rather than threaded
 * through App → SetupScreen → AudioPicker → SoundPicker → designer props,
 * because presets are read/written at several of those levels. `usePresets()`
 * subscribes any component; the mutators persist and notify synchronously.
 */
export type PresetKind = "binaural" | "noise";

export interface SavedBinauralPreset {
  id: string;
  name: string;
  design: BinauralDesign;
}
export interface SavedNoisePreset {
  id: string;
  name: string;
  design: NoiseDesign;
}

export interface PresetState {
  binaural: SavedBinauralPreset[];
  noise: SavedNoisePreset[];
}

const KEY = "flow.presets";
const EMPTY: PresetState = { binaural: [], noise: [] };

function read(): PresetState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const o = JSON.parse(raw) as Partial<PresetState>;
    return {
      binaural: Array.isArray(o.binaural) ? o.binaural : [],
      noise: Array.isArray(o.noise) ? o.noise : [],
    };
  } catch {
    return EMPTY;
  }
}

let state: PresetState = read();
const listeners = new Set<() => void>();

function commit(next: PresetState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / unavailable — keep the in-memory copy */
  }
  listeners.forEach((l) => l());
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function addBinauralPreset(name: string, design: BinauralDesign) {
  commit({
    ...state,
    binaural: [...state.binaural, { id: newId(), name, design }],
  });
}

export function addNoisePreset(name: string, design: NoiseDesign) {
  commit({
    ...state,
    noise: [...state.noise, { id: newId(), name, design }],
  });
}

export function deletePreset(kind: PresetKind, id: string) {
  commit({ ...state, [kind]: state[kind].filter((p) => p.id !== id) });
}

export function renamePreset(kind: PresetKind, id: string, name: string) {
  commit({
    ...state,
    [kind]: state[kind].map((p) => (p.id === id ? { ...p, name } : p)),
  });
}

export function usePresets(): PresetState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
