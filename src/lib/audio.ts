import type { BinauralPreset } from "../types";

export const BINAURAL_PRESETS: Record<
  BinauralPreset,
  { base: number; beat: number; label: string; note: string }
> = {
  flow: { base: 180, beat: 10, label: "Flow", note: "10 Hz alpha" },
  focus: { base: 210, beat: 16, label: "Deep focus", note: "16 Hz beta" },
  calm: { base: 150, beat: 6, label: "Calm", note: "6 Hz theta" },
};

type NoiseKind = "white" | "pink" | "brown";

/**
 * A small Web Audio engine. Generates the transition bell, looping noise and
 * binaural beats entirely in the browser — no audio files required.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private tone: {
    nodes: AudioNode[];
    stop: () => void;
  } | null = null;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async resume() {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
  }

  setVolume(v: number) {
    if (this.master) this.master.gain.value = Math.max(0, Math.min(1, v));
  }

  /** A soft two-partial bell with exponential decay. */
  bell() {
    const ctx = this.ensure();
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    out.connect(this.master!);

    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1 : 0.35;
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + 1.7);
    });
  }

  private buildNoiseBuffer(kind: NoiseKind): AudioBuffer {
    const ctx = this.ensure();
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (kind === "white") {
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } else if (kind === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buffer;
  }

  playNoise(kind: NoiseKind) {
    this.stopTone();
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = this.buildNoiseBuffer(kind);
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.22;
    src.connect(g).connect(this.master!);
    src.start();
    this.tone = { nodes: [src, g], stop: () => src.stop() };
  }

  playBinaural(base: number, beat: number) {
    this.stopTone();
    const ctx = this.ensure();
    const merger = ctx.createChannelMerger(2);
    const g = ctx.createGain();
    g.gain.value = 0.16;

    const left = ctx.createOscillator();
    left.type = "sine";
    left.frequency.value = base;
    const right = ctx.createOscillator();
    right.type = "sine";
    right.frequency.value = base + beat;

    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    merger.connect(g).connect(this.master!);
    left.start();
    right.start();
    this.tone = {
      nodes: [left, right, merger, g],
      stop: () => {
        left.stop();
        right.stop();
      },
    };
  }

  stopTone() {
    if (this.tone) {
      try {
        this.tone.stop();
      } catch {
        /* already stopped */
      }
      this.tone.nodes.forEach((n) => n.disconnect());
      this.tone = null;
    }
  }

  dispose() {
    this.stopTone();
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
