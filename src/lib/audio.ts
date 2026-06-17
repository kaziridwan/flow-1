import { NOISE_COLORS, cornerWeights, interpolateBinaural } from "./audioDesign";
import type { BinauralDesign, NoiseColor, NoiseDesign } from "../types";

type NoiseKind = NoiseColor;

/** Combined peak level of the noise blend before the noise design volume and
 *  master gain are applied (bilinear corner weights sum to 1). */
const NOISE_LEVEL = 0.3;
/** Filter frequency used when the low-pass is disabled (effectively bypassed). */
const FILTER_OPEN_HZ = 20000;
/** Peak binaural gain before the per-keyframe volume and master gain. */
const BINAURAL_LEVEL = 0.16;

/**
 * A small Web Audio engine. Generates the transition bell, looping noise and
 * binaural beats entirely in the browser — no audio files required.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  /** Live noise-blend graph, kept so the X/Y pad can update it without
   *  rebuilding (and clicking). Null when noise isn't playing. */
  private noise: {
    gains: Record<NoiseColor, GainNode>;
    filter: BiquadFilterNode;
    out: GainNode;
  } | null = null;
  /** Per-tone fade gain (out → fade → master) for crossfading on breaks. */
  private fade: GainNode | null = null;
  /** Live binaural-track graph + the loop timer that re-anchors the keyframe
   *  schedule each pass. Null when binaural isn't playing. */
  private binaural: {
    left: OscillatorNode;
    right: OscillatorNode;
    gain: GainNode;
    loopId: ReturnType<typeof setInterval> | null;
  } | null = null;
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
    } else if (kind === "brown") {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    } else {
      // Blue: differentiated white noise (+6 dB/oct tilt, bright/airy).
      let lastW = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (w - lastW) * 0.5;
        lastW = w;
      }
    }
    return buffer;
  }

  /**
   * Play (or, if already running, smoothly update) a blend of all four noise
   * colors through a shared low-pass filter. The four looping sources run
   * simultaneously; the X/Y pad only changes their gains, so dragging never
   * restarts/clicks.
   */
  playNoiseBlend(design: NoiseDesign) {
    if (this.noise) {
      this.applyNoiseDesign(design);
      return;
    }
    const ctx = this.ensure();
    const fade = this.newFade();
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.connect(out).connect(fade);

    const gains = {} as Record<NoiseColor, GainNode>;
    const sources: AudioBufferSourceNode[] = [];
    for (const color of NOISE_COLORS) {
      const src = ctx.createBufferSource();
      src.buffer = this.buildNoiseBuffer(color);
      src.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(g).connect(filter);
      src.start();
      gains[color] = g;
      sources.push(src);
    }

    this.noise = { gains, filter, out };
    this.applyNoiseDesign(design);
    this.tone = {
      nodes: [...sources, ...Object.values(gains), filter, out, fade],
      stop: () => sources.forEach((s) => s.stop()),
    };
  }

  /** Create the fade gain that sits between a tone and the master. */
  private newFade(): GainNode {
    const ctx = this.ensure();
    const fade = ctx.createGain();
    fade.gain.value = 1;
    fade.connect(this.master!);
    this.fade = fade;
    return fade;
  }

  /** Crossfade the current tone in/out (e.g. when a break mutes audio). */
  duck(muted: boolean) {
    if (!this.fade || !this.ctx) return;
    this.fade.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.25);
  }

  private applyNoiseDesign(design: NoiseDesign) {
    if (!this.noise || !this.ctx) return;
    const t = this.ctx.currentTime;
    const w = cornerWeights(design.blend.x, design.blend.y);
    for (const color of NOISE_COLORS) {
      this.noise.gains[color].gain.setTargetAtTime(w[color] * NOISE_LEVEL, t, 0.05);
    }
    this.noise.out.gain.setTargetAtTime(design.volume, t, 0.05);
    this.noise.filter.Q.setTargetAtTime(design.lowpass.q, t, 0.05);
    this.noise.filter.frequency.setTargetAtTime(
      design.lowpass.enabled ? design.lowpass.cutoff : FILTER_OPEN_HZ,
      t,
      0.05,
    );
  }

  /**
   * Play (or, if already running, smoothly reschedule) a keyframed binaural
   * track: left = base, right = base+beat, both interpolated between keyframes,
   * with the track looping over `durationSec`. Editing the track while it plays
   * reschedules the automation without restarting the oscillators (no click).
   * `offsetSec` seeks playback into the track (used by the editor's preview
   * cursor); the track then loops back to its start and repeats every length.
   */
  playBinauralTrack(design: BinauralDesign, offsetSec = 0) {
    if (this.binaural) {
      this.scheduleBinaural(design, offsetSec);
      this.resetBinauralLoop(design, offsetSec);
      return;
    }
    const ctx = this.ensure();
    const fade = this.newFade();
    const merger = ctx.createChannelMerger(2);
    const gain = ctx.createGain();
    const left = ctx.createOscillator();
    left.type = "sine";
    const right = ctx.createOscillator();
    right.type = "sine";

    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    merger.connect(gain).connect(fade);

    this.binaural = { left, right, gain, loopId: null };
    this.scheduleBinaural(design, offsetSec);
    this.resetBinauralLoop(design, offsetSec);
    left.start();
    right.start();

    this.tone = {
      nodes: [left, right, merger, gain, fade],
      stop: () => {
        if (this.binaural?.loopId) clearInterval(this.binaural.loopId);
        left.stop();
        right.stop();
      },
    };
  }

  /** Lay keyframe automation onto the oscillators/gain from `currentTime`,
   *  starting `offset` seconds into the track (the value at the offset is set
   *  immediately, then later keyframes ramp from there). */
  private scheduleBinaural(design: BinauralDesign, offset = 0) {
    if (!this.binaural || !this.ctx) return;
    const { left, right, gain } = this.binaural;
    const t0 = this.ctx.currentTime;

    for (const p of [left.frequency, right.frequency, gain.gain]) {
      p.cancelScheduledValues(t0);
    }
    const start = interpolateBinaural(design, offset);
    left.frequency.setValueAtTime(start.base, t0);
    right.frequency.setValueAtTime(start.base + start.beat, t0);
    gain.gain.setValueAtTime(Math.max(0.0001, start.volume * BINAURAL_LEVEL), t0);

    for (const k of design.keyframes) {
      if (k.t <= offset) continue;
      const at = t0 + (k.t - offset);
      left.frequency.linearRampToValueAtTime(k.base, at);
      right.frequency.linearRampToValueAtTime(k.base + k.beat, at);
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, k.volume * BINAURAL_LEVEL), at);
    }
  }

  /** (Re)arm the loop. With an offset, the first re-anchor fires when the track
   *  reaches its end (`length − offset` away) and snaps back to t=0; thereafter
   *  it repeats every full length — keeping audio in phase with a UI cursor that
   *  wraps at the same moment. */
  private resetBinauralLoop(design: BinauralDesign, offset = 0) {
    if (!this.binaural) return;
    if (this.binaural.loopId) clearInterval(this.binaural.loopId);
    const dur = Math.max(1, design.durationSec);
    const period = dur * 1000;
    const firstDelay = Math.max(1, dur - offset) * 1000;
    this.binaural.loopId = setTimeout(() => {
      this.scheduleBinaural(design, 0);
      if (this.binaural) {
        this.binaural.loopId = setInterval(() => this.scheduleBinaural(design, 0), period);
      }
    }, firstDelay);
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
    this.noise = null;
    this.binaural = null;
    this.fade = null;
  }

  dispose() {
    this.stopTone();
    this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}
