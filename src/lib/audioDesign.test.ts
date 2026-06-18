import { describe, expect, it } from "vitest";
import {
  cornerWeights,
  binauralBand,
  blendCornerColor,
  interpolateBinaural,
  matchBinauralPreset,
  defaultBinauralDesign,
  resolveFreqEdit,
  NOISE_CORNERS,
} from "./audioDesign";

describe("cornerWeights", () => {
  it("puts full weight on a single corner", () => {
    expect(cornerWeights(0, 0)).toMatchObject({ white: 1, pink: 0, brown: 0, blue: 0 });
    expect(cornerWeights(1, 1)).toMatchObject({ white: 0, pink: 0, brown: 0, blue: 1 });
  });
  it("splits evenly at the centre and always sums to 1", () => {
    const w = cornerWeights(0.5, 0.5);
    for (const v of Object.values(w)) expect(v).toBeCloseTo(0.25);
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });
  it("clamps out-of-range input", () => {
    expect(cornerWeights(-1, 2)).toMatchObject({ brown: 1 });
  });
});

describe("blendCornerColor", () => {
  it("identifies an exact corner, else null", () => {
    expect(blendCornerColor(NOISE_CORNERS.pink)).toBe("pink");
    expect(blendCornerColor({ x: 0.3, y: 0.7 })).toBeNull();
  });
});

describe("matchBinauralPreset", () => {
  it("matches a flat preset design and rejects a varying one", () => {
    expect(matchBinauralPreset(defaultBinauralDesign(210, 16))).toBe("focus");
    const varying = {
      durationSec: 100,
      keyframes: [
        { t: 0, base: 180, beat: 10, volume: 0.8 },
        { t: 100, base: 200, beat: 14, volume: 0.8 },
      ],
    };
    expect(matchBinauralPreset(varying)).toBeNull();
  });
});

describe("binauralBand", () => {
  it("classifies beats into brainwave bands", () => {
    expect(binauralBand(2).name).toBe("Delta");
    expect(binauralBand(6).name).toBe("Theta");
    expect(binauralBand(10).name).toBe("Alpha");
    expect(binauralBand(16).name).toBe("Beta");
    expect(binauralBand(40).name).toBe("Gamma");
  });
  it("treats band edges as the start of the higher band", () => {
    expect(binauralBand(4).name).toBe("Theta");
    expect(binauralBand(8).name).toBe("Alpha");
    expect(binauralBand(14).name).toBe("Beta");
    expect(binauralBand(30).name).toBe("Gamma");
  });
});

describe("interpolateBinaural", () => {
  const d = {
    durationSec: 100,
    keyframes: [
      { t: 0, base: 100, beat: 4, volume: 0.2 },
      { t: 100, base: 200, beat: 14, volume: 1 },
    ],
  };
  it("returns endpoints at and beyond the bounds", () => {
    expect(interpolateBinaural(d, 0)).toMatchObject({ base: 100, beat: 4 });
    expect(interpolateBinaural(d, 999)).toMatchObject({ base: 200, beat: 14 });
  });
  it("interpolates linearly at the midpoint", () => {
    const mid = interpolateBinaural(d, 50);
    expect(mid.base).toBeCloseTo(150);
    expect(mid.beat).toBeCloseTo(9);
    expect(mid.volume).toBeCloseTo(0.6);
  });
  it("applies the segment's easing (ease-in lags linear at the midpoint)", () => {
    const eased = {
      durationSec: 100,
      keyframes: [
        { t: 0, base: 100, beat: 4, volume: 0.2, transition: "ease-in" },
        { t: 100, base: 200, beat: 14, volume: 1 },
      ],
    };
    expect(interpolateBinaural(eased, 50).base).toBeLessThan(150);
  });
});

describe("resolveFreqEdit", () => {
  // Start: left=100, diff=10 (right=110).
  it("default precedence: editing left holds right, diff recomputes", () => {
    expect(resolveFreqEdit(100, 10, undefined, "left", 90)).toEqual({
      left: 90,
      diff: 20,
    });
  });
  it("default: editing right holds left, diff recomputes", () => {
    expect(resolveFreqEdit(100, 10, undefined, "right", 120)).toEqual({
      left: 100,
      diff: 20,
    });
  });
  it("diff locked: editing right updates left", () => {
    expect(resolveFreqEdit(100, 10, "diff", "right", 120)).toEqual({
      left: 110,
      diff: 10,
    });
  });
  it("left locked: editing diff updates right (left held)", () => {
    expect(resolveFreqEdit(100, 10, "left", "diff", 25)).toEqual({
      left: 100,
      diff: 25,
    });
  });
  it("right locked: editing diff updates left", () => {
    expect(resolveFreqEdit(100, 10, "right", "diff", 4)).toEqual({
      left: 106,
      diff: 4,
    });
  });
});
