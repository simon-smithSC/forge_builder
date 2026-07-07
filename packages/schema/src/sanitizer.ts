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
    span: ["data-color", "data-highlight"],
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
    }

    if (!voidTagSet.has(tagName) && !rawAttributes.trim().endsWith("/")) {
      openTags.push(tagName);
    }
  }

  return openTags.length === 0 && !/[<>]/u.test(input.slice(cursor));
}
