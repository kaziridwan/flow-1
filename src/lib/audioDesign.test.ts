import { describe, expect, it } from "vitest";
import {
  cornerWeights,
  blendCornerColor,
  interpolateBinaural,
  matchBinauralPreset,
  defaultBinauralDesign,
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
});
