import { describe, expect, it } from "vitest";
import { blockRegistry, resolveContentWidth, variantsOf } from "./index.js";

// TODO(module-identity): add a test asserting that the editor and the player
// resolve the SAME module instance of @forge/blocks (single-renderer contract,
// coordination/CONTRACTS.md). Requires both hosts to exist; placeholder for R1.

const CONTENT_WIDTHS = ["column", "wide", "full"] as const;

describe("blockRegistry", () => {
  for (const [family, entry] of Object.entries(blockRegistry)) {
    describe(family, () => {
      it("exposes a function Renderer and the schema variants", () => {
        expect(typeof entry.Renderer).toBe("function");
        expect(entry.family).toBe(family);
        expect([...entry.variants]).toEqual([...variantsOf(entry.family)]);
      });

      it("resolves a valid contentWidth for every variant", () => {
        for (const variant of entry.variants) {
          expect(CONTENT_WIDTHS).toContain(
            resolveContentWidth(entry.contentWidth, variant),
          );
        }
        // Per-variant maps may only name real variants of the family.
        if (entry.contentWidth && typeof entry.contentWidth === "object") {
          for (const key of Object.keys(entry.contentWidth)) {
            expect([...entry.variants]).toContain(key);
          }
        }
      });

      for (const variant of entry.variants) {
        it(`createDefaultPayload("${variant}") passes validatePayload`, () => {
          const payload = entry.createDefaultPayload(variant);
          expect(() => entry.validatePayload(payload, variant)).not.toThrow();
        });
      }
    });
  }
});
