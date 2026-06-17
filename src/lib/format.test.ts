import { describe, expect, it } from "vitest";
import { hms, humanDuration, mmss, parseHms, youtubeId } from "./format";

describe("mmss", () => {
  it("zero-pads minutes and seconds", () => {
    expect(mmss(0)).toBe("00:00");
    expect(mmss(65)).toBe("01:05");
    expect(mmss(3599)).toBe("59:59");
  });
  it("clamps negatives to zero", () => {
    expect(mmss(-10)).toBe("00:00");
  });
});

describe("hms", () => {
  it("zero-pads hours, minutes and seconds", () => {
    expect(hms(0)).toBe("00:00:00");
    expect(hms(65)).toBe("00:01:05");
    expect(hms(9000)).toBe("02:30:00");
  });
  it("clamps negatives to zero", () => {
    expect(hms(-5)).toBe("00:00:00");
  });
});

describe("parseHms", () => {
  it("parses HH:MM:SS / MM:SS / SS", () => {
    expect(parseHms("02:30:00")).toBe(9000);
    expect(parseHms("01:05")).toBe(65);
    expect(parseHms("90")).toBe(90);
  });
  it("round-trips with hms", () => {
    expect(parseHms(hms(4271))).toBe(4271);
  });
  it("returns null for malformed input", () => {
    expect(parseHms("")).toBeNull();
    expect(parseHms("aa:bb")).toBeNull();
    expect(parseHms("1:2:3:4")).toBeNull();
    expect(parseHms("1:-2")).toBeNull();
  });
});

describe("humanDuration", () => {
  it("renders minutes under an hour", () => {
    expect(humanDuration(1500)).toBe("25 min");
  });
  it("renders whole hours without trailing minutes", () => {
    expect(humanDuration(3600)).toBe("1 h");
  });
  it("renders hours and minutes", () => {
    expect(humanDuration(5400)).toBe("1 h 30 min");
  });
});

describe("youtubeId", () => {
  it("accepts a bare 11-char id", () => {
    expect(youtubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("parses youtu.be short links", () => {
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("parses watch?v= links", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s")).toBe(
      "dQw4w9WgXcQ",
    );
  });
  it("parses embed / shorts / live paths", () => {
    expect(youtubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(youtubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(youtubeId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });
  it("returns null for empty or non-YouTube input", () => {
    expect(youtubeId("")).toBeNull();
    expect(youtubeId("   ")).toBeNull();
    expect(youtubeId("not a url")).toBeNull();
    expect(youtubeId("https://example.com/video")).toBeNull();
  });
});
