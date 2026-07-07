import { describe, expect, it } from "vitest";
import { LaunchError, parseActor, parseLaunch } from "./launch.js";

const actorJson = JSON.stringify({
  objectType: "Agent",
  name: "Ada Learner",
  mbox: "mailto:ada@example.com",
});

const fullQuery =
  "?endpoint=" +
  encodeURIComponent("https://lrs.example.com/xapi/") +
  "&auth=" +
  encodeURIComponent("Basic YWJjOjEyMw==") +
  "&actor=" +
  encodeURIComponent(actorJson) +
  "&activity_id=" +
  encodeURIComponent("https://xapi.supercell.com/courses/c-1") +
  "&registration=11111111-2222-4333-8444-555555555555";

describe("parseLaunch", () => {
  it("parses a full tincan launch query with URL decoding", () => {
    const result = parseLaunch(fullQuery);
    expect(result.mode).toBe("tracked");
    if (result.mode !== "tracked") {
      return;
    }
    expect(result.context.endpoint).toBe("https://lrs.example.com/xapi/");
    expect(result.context.auth).toBe("Basic YWJjOjEyMw==");
    expect(result.context.actor.mbox).toBe("mailto:ada@example.com");
    expect(result.context.actor.name).toBe("Ada Learner");
    expect(result.context.activityId).toBe(
      "https://xapi.supercell.com/courses/c-1",
    );
    expect(result.context.registration).toBe(
      "11111111-2222-4333-8444-555555555555",
    );
  });

  it("falls back to untracked mode when endpoint is missing", () => {
    const result = parseLaunch("?actor=" + encodeURIComponent(actorJson));
    expect(result).toEqual({
      mode: "untracked",
      reason: "Missing endpoint launch parameter.",
    });
  });

  it("falls back to untracked mode when actor is missing", () => {
    const result = parseLaunch("?endpoint=https%3A%2F%2Flrs.example.com%2Fxapi");
    expect(result.mode).toBe("untracked");
  });

  it("falls back to untracked mode on malformed actor JSON", () => {
    const result = parseLaunch(
      "?endpoint=https%3A%2F%2Flrs.example.com%2Fxapi&actor=not-json",
    );
    expect(result.mode).toBe("untracked");
    if (result.mode === "untracked") {
      expect(result.reason).toContain("actor");
    }
  });

  it("throws LaunchError in strict mode instead of falling back", () => {
    expect(() => parseLaunch("?actor=" + encodeURIComponent(actorJson), { strict: true })).toThrow(
      LaunchError,
    );
    expect(() =>
      parseLaunch("?actor=" + encodeURIComponent(actorJson), { strict: true }),
    ).toThrow("Missing endpoint launch parameter.");
  });

  it("uses fallbackActivityId when activity_id is absent", () => {
    const result = parseLaunch(
      "?endpoint=https%3A%2F%2Flrs.example.com%2Fxapi&actor=" +
        encodeURIComponent(actorJson),
      { fallbackActivityId: "https://xapi.supercell.com/courses/c-2" },
    );
    expect(result.mode).toBe("tracked");
    if (result.mode === "tracked") {
      expect(result.context.activityId).toBe(
        "https://xapi.supercell.com/courses/c-2",
      );
    }
  });

  it("is untracked when activity_id is absent and no fallback is configured", () => {
    const result = parseLaunch(
      "?endpoint=https%3A%2F%2Flrs.example.com%2Fxapi&actor=" +
        encodeURIComponent(actorJson),
    );
    expect(result.mode).toBe("untracked");
  });

  it("generates a registration when the launch omits one", () => {
    const result = parseLaunch(
      "?endpoint=https%3A%2F%2Flrs.example.com%2Fxapi&actor=" +
        encodeURIComponent(actorJson) +
        "&activity_id=" +
        encodeURIComponent("https://xapi.supercell.com/courses/c-1"),
      { generateRegistration: () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" },
    );
    expect(result.mode).toBe("tracked");
    if (result.mode === "tracked") {
      expect(result.context.registration).toBe(
        "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      );
    }
  });

  it("generates a uuid registration by default", () => {
    const result = parseLaunch(
      "?endpoint=https%3A%2F%2Flrs.example.com%2Fxapi&actor=" +
        encodeURIComponent(actorJson) +
        "&activity_id=x",
    );
    expect(result.mode).toBe("tracked");
    if (result.mode === "tracked") {
      expect(result.context.registration).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    }
  });

  it("defaults auth to an empty string when absent", () => {
    const result = parseLaunch(
      "?endpoint=https%3A%2F%2Flrs.example.com%2Fxapi&actor=" +
        encodeURIComponent(actorJson) +
        "&activity_id=x",
    );
    expect(result.mode).toBe("tracked");
    if (result.mode === "tracked") {
      expect(result.context.auth).toBe("");
    }
  });
});

describe("parseActor", () => {
  it("normalizes the legacy TinCan array form", () => {
    const actor = parseActor(
      JSON.stringify({ name: ["Legacy Learner"], mbox: ["mailto:legacy@example.com"] }),
    );
    expect(actor).toEqual({
      objectType: "Agent",
      name: "Legacy Learner",
      mbox: "mailto:legacy@example.com",
    });
  });

  it("accepts account identifiers", () => {
    const actor = parseActor(
      JSON.stringify({
        account: { homePage: "https://stream.example.com", name: "user-42" },
      }),
    );
    expect(actor.account).toEqual({
      homePage: "https://stream.example.com",
      name: "user-42",
    });
  });

  it("rejects actors without any inverse functional identifier", () => {
    expect(() => parseActor(JSON.stringify({ name: "No Id" }))).toThrow(LaunchError);
  });

  it("rejects non-object actor payloads", () => {
    expect(() => parseActor('"just a string"')).toThrow(LaunchError);
  });
});
