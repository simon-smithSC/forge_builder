// FontSize (POLISH-PLAN V2): global `fontSize` attribute on the textStyle
// mark. The official @tiptap/extension-font-size is v3-only, so this mirrors
// its shape for Tiptap v2. Values are px-only because the @forge/schema
// sanitizer (isSafeStyleAttribute) accepts nothing else for font-size.
import { Extension } from "@tiptap/core";

export interface FontSizeOptions {
  /** Mark types that carry the attribute. */
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /** Set the font size as a px length ("18px"). */
      setFontSize: (fontSize: string) => ReturnType;
      /** Remove the font size and clean up empty textStyle marks. */
      unsetFontSize: () => ReturnType;
    };
  }
}

/** Mirrors the sanitizer's fontSizeValuePattern (px, up to three digits). */
const PX_VALUE = /^\d{1,3}(\.\d+)?px$/;

export const FontSize = Extension.create<FontSizeOptions>({
  name: "fontSize",

  addOptions() {
    return { types: ["textStyle"] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const value = element.style.fontSize;
              return PX_VALUE.test(value) ? value : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) => {
          if (!PX_VALUE.test(fontSize)) return false;
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});
