import { describe, expect, it } from "vitest";
import {
  easeProgress,
  isStepTiming,
  isValidTiming,
  parseCubicBezier,
} from "./easing";

describe("parseCubicBezier", () => {
  it("parses a valid spec", () => {
    expect(parseCubicBezier("cubic-bezier(0.42, 0, 0.58, 1.0)")).toEqual([
      0.42, 0, 0.58, 1,
    ]);
  });
  it("rejects out-of-range x control points and malformed input", () => {
    expect(parseCubicBezier("cubic-bezier(1.2, 0, 0.5, 1)")).toBeNull();
    expect(parseCubicBezier("cubic-bezier(0, 0, -0.1, 1)")).toBeNull();
    expect(parseCubicBezier("cubic-bezier(0,0,1)")).toBeNull();
    expect(parseCubicBezier("ease")).toBeNull();
  });
});

describe("isValidTiming", () => {
  it("accepts keywords and valid beziers, rejects junk", () => {
    expect(isValidTiming("ease-in")).toBe(true);
    expect(isValidTiming("STEP-END")).toBe(true);
    expect(isValidTiming("cubic-bezier(0.73, 0.02, 0.31, 0.97)")).toBe(true);
    expect(isValidTiming("wobble")).toBe(false);
  });
});

describe("easeProgress", () => {
  it("is identity for linear and pins endpoints", () => {
    expect(easeProgress("linear", 0.37)).toBeCloseTo(0.37);
    expect(easeProgress("ease-in", 0)).toBeCloseTo(0);
    expect(easeProgress("ease-in", 1)).toBeCloseTo(1);
  });
  it("ease-in starts slow (below linear at the midpoint)", () => {
    expect(easeProgress("ease-in", 0.5)).toBeLessThan(0.5);
  });
  it("ease-out starts fast (above linear at the midpoint)", () => {
    expect(easeProgress("ease-out", 0.5)).toBeGreaterThan(0.5);
  });
  it("steps jump at their edge", () => {
    expect(easeProgress("step-start", 0)).toBe(0);
    expect(easeProgress("step-start", 0.01)).toBe(1);
    expect(easeProgress("step-end", 0.99)).toBe(0);
    expect(easeProgress("step-end", 1)).toBe(1);
  });
  it("falls back to linear for invalid specs", () => {
    expect(easeProgress("nonsense", 0.4)).toBeCloseTo(0.4);
  });
});

describe("isStepTiming", () => {
  it("classifies the stepped timings", () => {
    expect(isStepTiming("step-start")).toBe("start");
    expect(isStepTiming("step-end")).toBe("end");
    expect(isStepTiming("ease")).toBeNull();
  });
});
