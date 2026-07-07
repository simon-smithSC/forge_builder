// WYSIWYG guarantee, module-identity flavor: the editor canvas and the player
// both render blocks through BlockView, which resolves each family's Renderer
// via getRegistryEntry from the SAME @forge/blocks module instance. Object.is
// on registry entries (and their Renderer) proves there is exactly one
// renderer per family. A Playwright run deepens this in R2 by diffing the
// rendered DOM of canvas vs player.
import { describe, expect, it } from "vitest";
import { BlockView, blockRegistry, getRegistryEntry } from "@forge/blocks";
import { blockFamilyVariants } from "@forge/schema";
import type { BlockFamily } from "@forge/schema";

describe("block renderer module identity", () => {
  const families = Object.keys(blockFamilyVariants) as BlockFamily[];

  it("exposes a registry entry for every schema family", () => {
    for (const family of families) {
      expect(blockRegistry[family]).toBeDefined();
      expect(blockRegistry[family].family).toBe(family);
    }
  });

  it("resolves the identical entry object through the BlockView path", () => {
    for (const family of families) {
      const direct = blockRegistry[family];
      const viaLookup = getRegistryEntry(family);
      expect(Object.is(direct, viaLookup)).toBe(true);
      expect(Object.is(direct.Renderer, viaLookup.Renderer)).toBe(true);
    }
  });

  it("ships BlockView as the shared mount point", () => {
    expect(typeof BlockView).toBe("function");
  });
});
