// LineHeight (POLISH-PLAN V2): `lineHeight` attribute on paragraph and
// heading nodes, serialized as style="line-height: X". Values are unitless
// only, matching the @forge/schema sanitizer's lineHeightValuePattern.
import { Extension } from "@tiptap/core";

export interface LineHeightOptions {
  /** Node types that carry the attribute. */
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      /** Set a unitless line height ("1.5") on selected blocks. */
      setLineHeight: (lineHeight: string) => ReturnType;
      /** Remove the line height from selected blocks. */
      unsetLineHeight: () => ReturnType;
    };
  }
}

/** Mirrors the sanitizer's lineHeightValuePattern (unitless number). */
const UNITLESS_VALUE = /^\d(\.\d+)?$/;

export const LineHeight = Extension.create<LineHeightOptions>({
  name: "lineHeight",

  addOptions() {
    return { types: ["paragraph", "heading"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const value = element.style.lineHeight;
              return UNITLESS_VALUE.test(value) ? value : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) => {
          if (!UNITLESS_VALUE.test(lineHeight)) return false;
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { lineHeight }),
          );
        },
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.every((type) =>
            commands.resetAttributes(type, "lineHeight"),
          ),
    };
  },
});
