export const richTextSanitizerConfig = {
  allowedTags: [
    "a",
    "blockquote",
    "br",
    "code",
    "em",
    "h2",
    "h3",
    "h4",
    "li",
    "mark",
    "ol",
    "p",
    "pre",
    "span",
    "strong",
    "sub",
    "sup",
    "s",
    "u",
    "ul",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    code: ["class"],
    span: ["style", "data-color", "data-highlight"],
    mark: ["data-color", "style"],
    p: ["style"],
    h2: ["style"],
    h3: ["style"],
    h4: ["style"],
    li: ["style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
} as const;

export const richTextEditorConfig = {
  allowedMarks: [
    "bold",
    "italic",
    "underline",
    "strike",
    "code",
    "link",
    "superscript",
    "subscript",
    "textColor",
    "highlight",
    "fontSize",
    "fontFamily",
  ],
  allowedNodes: [
    "paragraph",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "blockquote",
    "codeBlock",
    "hardBreak",
    "text",
  ],
} as const;

export const embedAllowlist = [
  "https://www.youtube.com/embed/",
  "https://player.vimeo.com/video/",
  "https://forms.office.com/",
  "https://app.powerbi.com/reportEmbed",
] as const;

export const embedAllowlistPattern =
  "^(?:https:\\/\\/www\\.youtube\\.com\\/embed\\/|https:\\/\\/player\\.vimeo\\.com\\/video\\/|https:\\/\\/forms\\.office\\.com\\/|https:\\/\\/app\\.powerbi\\.com\\/reportEmbed).*";

export const safeHtmlFragmentPattern =
  "^(?![\\s\\S]*<\\s*script\\b)(?![\\s\\S]*<\\s*!)(?![\\s\\S]*\\son[A-Za-z]+\\s*=)(?![\\s\\S]*href\\s*=\\s*(['\"]?)\\s*javascript:)[\\s\\S]*$";

const tagPattern = /<\s*(\/?)([A-Za-z][A-Za-z0-9-]*)([^>]*)>/g;
const attrPattern =
  /([:@A-Za-z_][A-Za-z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const allowedTagSet = new Set<string>(richTextSanitizerConfig.allowedTags);
const allowedSchemeSet = new Set<string>(richTextSanitizerConfig.allowedSchemes);
const voidTagSet = new Set<string>(["br"]);

const allowedAttributesFor = (tagName: string): readonly string[] => {
  const attributes =
    richTextSanitizerConfig.allowedAttributes[
      tagName as keyof typeof richTextSanitizerConfig.allowedAttributes
    ];
  return attributes ?? [];
};

const hasAllowedHrefScheme = (value: string): boolean => {
  const schemeMatch = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(value.trim());
  const scheme = schemeMatch?.[1];
  return Boolean(scheme && allowedSchemeSet.has(scheme.toLowerCase()));
};

// Inline style policy (POLISH-PLAN V0): per-tag property allowlist with
// strict value regexes, feeding the rich text toolbar's continuous values
// (color, font-size, font-family, text-align, line-height).
const colorValuePattern =
  /^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/;
const fontSizeValuePattern = /^\d{1,3}(\.\d+)?px$/;
const fontFamilyValuePattern = /^[A-Za-z0-9 ,'"-]+$/;
const textAlignValuePattern = /^(left|center|right)$/;
const lineHeightValuePattern = /^\d(\.\d+)?$/;

const blockStyleProperties: Record<string, RegExp> = {
  "text-align": textAlignValuePattern,
  "line-height": lineHeightValuePattern,
};

const styleAllowlistByTag: Record<string, Record<string, RegExp>> = {
  span: {
    color: colorValuePattern,
    "background-color": colorValuePattern,
    "font-size": fontSizeValuePattern,
    "font-family": fontFamilyValuePattern,
  },
  mark: {
    "background-color": colorValuePattern,
  },
  p: blockStyleProperties,
  h2: blockStyleProperties,
  h3: blockStyleProperties,
  h4: blockStyleProperties,
  li: blockStyleProperties,
};

// Raw-value tripwires: URL loads, escapes, IE expression(), at-rules.
const styleInjectionPattern = /url\(|\\|expression|@/i;

/** A style attribute is safe only when every declaration is `prop: value`
 *  with the property in the tag's allowlist and the value matching its
 *  strict regex. Empty declarations (trailing ";") are ignored. */
export function isSafeStyleAttribute(tag: string, value: string): boolean {
  if (styleInjectionPattern.test(value)) {
    return false;
  }
  const allowedProperties = styleAllowlistByTag[tag.toLowerCase()];
  if (allowedProperties === undefined) {
    return false;
  }
  for (const declaration of value.split(";")) {
    const trimmed = declaration.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      return false;
    }
    const property = trimmed.slice(0, colonIndex).trim().toLowerCase();
    const propertyValue = trimmed.slice(colonIndex + 1).trim();
    const valuePattern = allowedProperties[property];
    if (valuePattern === undefined || !valuePattern.test(propertyValue)) {
      return false;
    }
  }
  return true;
}

export function isSafeHtmlFragment(input: string): boolean {
  if (input.trim().length === 0 || /<\s*!/u.test(input)) {
    return false;
  }

  const openTags: string[] = [];
  let cursor = 0;

  for (const match of input.matchAll(tagPattern)) {
    const matchIndex = match.index ?? 0;
    if (/[<>]/u.test(input.slice(cursor, matchIndex))) {
      return false;
    }

    const closingSlash = match[1];
    const tagName = match[2]?.toLowerCase();
    const rawAttributes = match[3] ?? "";
    cursor = matchIndex + match[0].length;

    if (!tagName) {
      return false;
    }

    if (!allowedTagSet.has(tagName)) {
      return false;
    }

    if (closingSlash) {
      if (openTags.pop() !== tagName) {
        return false;
      }
      continue;
    }

    const allowedAttributes = new Set(allowedAttributesFor(tagName));
    for (const attrMatch of rawAttributes.matchAll(attrPattern)) {
      const attrName = attrMatch[1]?.toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

      if (!attrName) {
        return false;
      }

      if (attrName === "/" || attrName.startsWith("/")) {
        continue;
      }

      if (attrName.startsWith("on") || !allowedAttributes.has(attrName)) {
        return false;
      }

      if (attrName === "href" && !hasAllowedHrefScheme(attrValue)) {
        return false;
      }

      if (attrName === "style" && !isSafeStyleAttribute(tagName, attrValue)) {
        return false;
      }
    }

    if (!voidTagSet.has(tagName) && !rawAttributes.trim().endsWith("/")) {
      openTags.push(tagName);
    }
  }

  return openTags.length === 0 && !/[<>]/u.test(input.slice(cursor));
}
