import { describe, expect, it } from "vitest";
import { migrateAudio } from "./migrate";
import { NOISE_CORNERS } from "./audioDesign";

describe("migrateAudio v1 → v2", () => {
  it("maps a noise source to the noise category at the right corner", () => {
    const r = migrateAudio({ source: "brown", volume: 0.4, pauseOnBreak: false });
    expect(r.v).toBe(2);
    expect(r.category).toBe("noise");
    expect(r.noise.blend).toEqual({ x: NOISE_CORNERS.brown.x, y: NOISE_CORNERS.brown.y });
    expect(r.volume).toBe(0.4);
    expect(r.pauseOnBreak).toBe(false);
  });

  it("maps a binaural preset into seed keyframes", () => {
    const r = migrateAudio({ source: "binaural", preset: "focus" });
    expect(r.category).toBe("binaural");
    expect(r.binaural.keyframes[0]).toMatchObject({ base: 210, beat: 16 });
    expect(r.binaural.keyframes.at(-1)).toMatchObject({ base: 210, beat: 16 });
  });

  it("maps youtube / podcast / media to the media category with kinds", () => {
    expect(migrateAudio({ source: "youtube", url: "u" }).media).toEqual({
      kind: "youtube",
      url: "u",
    });
    expect(migrateAudio({ source: "podcast", url: "u" }).media).toEqual({
      kind: "podcast",
      url: "u",
    });
    expect(migrateAudio({ source: "media", url: "u" }).media).toEqual({
      kind: "url",
      url: "u",
    });
  });

  it("maps the silent source to the none category", () => {
    expect(migrateAudio({ source: "none" }).category).toBe("none");
  });
});

describe("migrateAudio robustness", () => {
  it("returns defaults for null / non-object input", () => {
    expect(migrateAudio(null).category).toBe("binaural");
    expect(migrateAudio(undefined).v).toBe(2);
    expect(migrateAudio("garbage").v).toBe(2);
  });

  it("passes a v2 object through, backfilling missing fields", () => {
    const r = migrateAudio({ v: 2, category: "noise", volume: 0.9 });
    expect(r.category).toBe("noise");
    expect(r.volume).toBe(0.9);
    expect(r.binaural.keyframes.length).toBeGreaterThan(0); // backfilled
  });

  it("clamps an out-of-range legacy volume", () => {
    expect(migrateAudio({ source: "white", volume: 5 }).volume).toBe(1);
  });
});
