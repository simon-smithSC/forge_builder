import { describe, expect, it } from "vitest";
import { blockRegistry, variantsOf } from "./index.js";

// TODO(module-identity): add a test asserting that the editor and the player
// resolve the SAME module instance of @forge/blocks (single-renderer contract,
// coordination/CONTRACTS.md). Requires both hosts to exist; placeholder for R1.

describe("blockRegistry", () => {
  for (const [family, entry] of Object.entries(blockRegistry)) {
    describe(family, () => {
      it("exposes a function Renderer and the schema variants", () => {
        expect(typeof entry.Renderer).toBe("function");
        expect(entry.family).toBe(family);
        expect([...entry.variants]).toEqual([...variantsOf(entry.family)]);
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
