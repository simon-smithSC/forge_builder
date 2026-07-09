import { describe, expect, it } from "vitest";
import type { Block, BlocksLesson } from "@forge/schema";
import {
  computeLessonPercent,
  consumesByInteraction,
  isContinueGate,
  visibleBlocks,
} from "./progress.js";

const settings = {
  paddingTop: 2,
  paddingBottom: 2,
  textColorMode: "auto",
} as const;

function paragraph(id: string): Block {
  return {
    id,
    family: "text",
    variant: "paragraph",
    payload: { html: "<p>Body</p>" },
    settings,
  };
}

function continueGate(id: string): Block {
  return {
    id,
    family: "divider",
    variant: "continue button",
    payload: { label: "Continue" },
    settings,
  };
}

function lineDivider(id: string): Block {
  return {
    id,
    family: "divider",
    variant: "line",
    payload: { style: "solid" },
    settings,
  };
}

function timeline(
  id: string,
  payload: {
    events: {
      id: string;
      title: string;
      html: string;
      label?: string;
      startExpanded?: boolean;
    }[];
    detailsAlwaysVisible?: boolean;
  },
): Block {
  return {
    id,
    family: "interactive-fullscreen",
    variant: "timeline",
    payload,
    settings,
  } as Block;
}

const timelineEvent = (
  id: string,
  startExpanded?: boolean,
): { id: string; title: string; html: string; startExpanded?: boolean } => ({
  id,
  title: "Event",
  html: "<p>Detail</p>",
  ...(startExpanded === undefined ? {} : { startExpanded }),
});

function lessonOf(blocks: Block[]): BlocksLesson {
  return { type: "blocks", id: "lesson-1", title: "Lesson", blocks };
}

const ids = (blocks: Block[]): string[] => blocks.map((block) => block.id);
const consumed = (...blockIds: string[]): ReadonlySet<string> =>
  new Set(blockIds);

describe("isContinueGate", () => {
  it("matches only the divider / continue button variant", () => {
    expect(isContinueGate(continueGate("g1"))).toBe(true);
    expect(isContinueGate(lineDivider("d1"))).toBe(false);
    expect(isContinueGate(paragraph("p1"))).toBe(false);
  });
});

describe("consumesByInteraction", () => {
  it("keeps the default timeline interaction-gated", () => {
    const block = timeline("t1", {
      events: [timelineEvent("e1"), timelineEvent("e2")],
    });
    expect(consumesByInteraction(block)).toBe(true);
  });

  it("consumes by scroll when detailsAlwaysVisible is set", () => {
    const block = timeline("t1", {
      events: [timelineEvent("e1"), timelineEvent("e2")],
      detailsAlwaysVisible: true,
    });
    expect(consumesByInteraction(block)).toBe(false);
  });

  it("consumes by scroll when every event starts expanded", () => {
    const block = timeline("t1", {
      events: [timelineEvent("e1", true), timelineEvent("e2", true)],
    });
    expect(consumesByInteraction(block)).toBe(false);
  });

  it("stays interaction-gated while any event starts collapsed", () => {
    const block = timeline("t1", {
      events: [timelineEvent("e1", true), timelineEvent("e2")],
    });
    expect(consumesByInteraction(block)).toBe(true);
  });

  it("keeps the non-timeline behavior unchanged", () => {
    expect(consumesByInteraction(continueGate("g1"))).toBe(true);
    expect(consumesByInteraction(lineDivider("d1"))).toBe(false);
    expect(consumesByInteraction(paragraph("p1"))).toBe(false);
  });
});

describe("visibleBlocks", () => {
  it("returns every block when no continue divider exists", () => {
    const lesson = lessonOf([paragraph("a"), lineDivider("d"), paragraph("b")]);
    expect(ids(visibleBlocks(lesson, consumed()))).toEqual(["a", "d", "b"]);
  });

  it("stops at (and includes) the first unconsumed continue divider", () => {
    const lesson = lessonOf([
      paragraph("a"),
      continueGate("g1"),
      paragraph("b"),
      paragraph("c"),
    ]);
    expect(ids(visibleBlocks(lesson, consumed()))).toEqual(["a", "g1"]);
  });

  it("chains gates: a consumed gate exposes up to the next unconsumed one", () => {
    const lesson = lessonOf([
      paragraph("a"),
      continueGate("g1"),
      paragraph("b"),
      continueGate("g2"),
      paragraph("c"),
    ]);
    expect(ids(visibleBlocks(lesson, consumed("g1")))).toEqual([
      "a",
      "g1",
      "b",
      "g2",
    ]);
  });

  it("returns everything once all gates are consumed", () => {
    const lesson = lessonOf([
      paragraph("a"),
      continueGate("g1"),
      paragraph("b"),
      continueGate("g2"),
      paragraph("c"),
    ]);
    expect(ids(visibleBlocks(lesson, consumed("g1", "g2")))).toEqual([
      "a",
      "g1",
      "b",
      "g2",
      "c",
    ]);
  });

  it("handles a continue divider as the very first block", () => {
    const lesson = lessonOf([continueGate("g1"), paragraph("a")]);
    expect(ids(visibleBlocks(lesson, consumed()))).toEqual(["g1"]);
    expect(ids(visibleBlocks(lesson, consumed("g1")))).toEqual(["g1", "a"]);
  });

  it("never gates on non-continue divider variants", () => {
    const lesson = lessonOf([lineDivider("d1"), paragraph("a")]);
    expect(ids(visibleBlocks(lesson, consumed()))).toEqual(["d1", "a"]);
  });
});

describe("completion still counts hidden blocks", () => {
  it("keeps lesson percent below 100 while gated blocks stay unconsumed", () => {
    const lesson = lessonOf([
      paragraph("a"),
      continueGate("g1"),
      paragraph("b"),
    ]);
    // Everything visible is consumed, but "b" is still hidden and unconsumed.
    expect(computeLessonPercent(lesson, consumed("a", "g1"))).toBe(67);
    expect(computeLessonPercent(lesson, consumed("a", "g1", "b"))).toBe(100);
  });
});
