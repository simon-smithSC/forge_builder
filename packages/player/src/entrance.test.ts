import { describe, expect, it } from "vitest";
import {
  ENTRANCE_BASE_DELAY_S,
  ENTRANCE_DURATION_S,
  ENTRANCE_EASING,
  ENTRANCE_FALLBACK_MS,
  ENTRANCE_ROOT_MARGIN,
  ENTRANCE_STAGGER_S,
  entranceDelaySeconds,
  resolveEntranceKind,
} from "./entrance.js";

describe("resolveEntranceKind", () => {
  it("falls back to the course setting when the block override is absent", () => {
    expect(resolveEntranceKind("fade")).toBe("fade");
    expect(resolveEntranceKind("slide")).toBe("slide");
    expect(resolveEntranceKind("zoom")).toBe("zoom");
    expect(resolveEntranceKind("none")).toBe("none");
  });

  it("treats an explicit inherit exactly like an absent override", () => {
    expect(resolveEntranceKind("fade", "inherit")).toBe("fade");
    expect(resolveEntranceKind("none", "inherit")).toBe("none");
  });

  it("lets any explicit block override win over the course setting", () => {
    expect(resolveEntranceKind("fade", "zoom")).toBe("zoom");
    expect(resolveEntranceKind("none", "slide")).toBe("slide");
    expect(resolveEntranceKind("zoom", "fade")).toBe("fade");
  });

  it("yields none when the block opts out despite an animated course", () => {
    expect(resolveEntranceKind("fade", "none")).toBe("none");
    expect(resolveEntranceKind("slide", "none")).toBe("none");
  });
});

describe("Rise timing constants", () => {
  it("matches the measured Rise scroll-animation mechanics", () => {
    expect(ENTRANCE_DURATION_S).toBe(1);
    expect(ENTRANCE_EASING).toBe("ease-out");
    expect(ENTRANCE_BASE_DELAY_S).toBe(0.12);
    expect(ENTRANCE_STAGGER_S).toBe(0.15);
    expect(ENTRANCE_FALLBACK_MS).toBe(1000);
    expect(ENTRANCE_ROOT_MARGIN).toBe("2% 0px");
  });
});

describe("entranceDelaySeconds", () => {
  it("staggers 0.12s + idx * 0.15s like Rise's calc()", () => {
    expect(entranceDelaySeconds(0)).toBe(0.12);
    expect(entranceDelaySeconds(1)).toBe(0.27);
    expect(entranceDelaySeconds(2)).toBe(0.42);
    expect(entranceDelaySeconds(5)).toBe(0.87);
  });

  it("clamps negative or fractional indexes safely", () => {
    expect(entranceDelaySeconds(-3)).toBe(0.12);
    expect(entranceDelaySeconds(1.9)).toBe(0.27);
  });
});
