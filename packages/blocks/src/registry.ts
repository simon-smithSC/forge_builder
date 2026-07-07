import type { ComponentType } from "react";
import type { Block, BlockFamily } from "@forge/schema";
import { blockFamilyVariants, blockPayloadSchemas } from "@forge/schema";

export type PaletteGroup =
  | "text"
  | "media"
  | "interactive"
  | "quiz"
  | "data"
  | "structure";

export interface PaletteMeta {
  label: string;
  group: PaletteGroup;
  description: string;
  /** Icon name (lucide identifier); hosts map it to an icon component. */
  icon: string;
}

export interface BlockRendererProps {
  block: Block;
}

/**
 * Registry contract per coordination/CONTRACTS.md. One entry per family.
 * `Renderer` is THE single renderer used by both the editor canvas and the
 * player (enforced by scripts/contract-check.mjs and the module-identity test).
 */
export interface BlockRegistryEntry {
  family: BlockFamily;
  variants: readonly string[];
  palette: PaletteMeta;
  createDefaultPayload: (variant: string) => unknown;
  validatePayload: (payload: unknown, variant: string) => unknown;
  Renderer: ComponentType<BlockRendererProps>;
}

export function validateWithSchema(
  family: BlockFamily,
  variant: string,
  payload: unknown,
): unknown {
  const familySchemas = blockPayloadSchemas[family] as Record<
    string,
    { parse: (input: unknown) => unknown }
  >;
  const schema = familySchemas[variant];
  if (!schema) {
    throw new Error(`Unknown variant "${variant}" for family "${family}".`);
  }
  return schema.parse(payload);
}

export function variantsOf(family: BlockFamily): readonly string[] {
  return blockFamilyVariants[family];
}
