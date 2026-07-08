#!/usr/bin/env node
// Rich text pipeline smoke (POLISH-PLAN V2 follow-up): every HTML shape the
// selection toolbar can produce (Tiptap serialization) must pass BOTH commit
// gates - the @forge/schema sanitizer (isSafeHtmlFragment, which the editor's
// sanitizeRichTextHtml wraps) and the block payload zod validation
// (registry validatePayload, the InlineHtmlEditor commit path). A rejected
// fragment would silently revert the field, which reads as "the toolbar does
// nothing" in the editor. Run: node e2e/smoke/richtext-smoke.mjs
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const schema = await import(join(root, "packages/schema/dist/index.js"));
const blocks = await import(join(root, "packages/blocks/dist/index.js"));

const { isSafeHtmlFragment } = schema;
const { blockRegistry } = blocks;

// Representative serializations for every toolbar command (Tiptap getHTML
// output shapes: StarterKit marks/nodes, Underline, Sub/Superscript, Link,
// Color/Highlight/FontSize/FontFamily via textStyle/mark, TextAlign and
// LineHeight as block styles).
const toolbarOutputs = [
  ["bold", "<p><strong>x</strong></p>"],
  ["italic", "<p><em>x</em></p>"],
  ["underline", "<p><u>x</u></p>"],
  ["strike", "<p><s>x</s></p>"],
  ["inline code", "<p><code>x</code></p>"],
  ["subscript", "<p><sub>x</sub></p>"],
  ["superscript", "<p><sup>x</sup></p>"],
  ["link", '<p><a target="_blank" rel="noopener noreferrer" href="https://example.com">x</a></p>'],
  ["mailto link", '<p><a target="_blank" rel="noopener noreferrer" href="mailto:a@b.c">x</a></p>'],
  ["text color", '<p><span style="color: #e11d48">x</span></p>'],
  ["text color rgb", '<p><span style="color: rgb(225, 29, 72)">x</span></p>'],
  ["highlight", '<p><mark data-color="#fff3a3" style="background-color: #fff3a3">x</mark></p>'],
  ["highlight rgb", '<p><mark data-color="rgb(255, 243, 163)" style="background-color: rgb(255, 243, 163)">x</mark></p>'],
  ["font size", '<p><span style="font-size: 18px">x</span></p>'],
  ["font family", '<p><span style="font-family: Georgia, Iowan Old Style, Times New Roman, serif">x</span></p>'],
  ["combined textStyle", '<p><span style="color: #1f6feb; font-size: 21px; font-family: Georgia, serif">x</span></p>'],
  ["align center", '<p style="text-align: center">x</p>'],
  ["align right on heading", '<h2 style="text-align: right">x</h2>'],
  ["line height", '<p style="line-height: 1.5">x</p>'],
  ["align + line height", '<p style="text-align: center; line-height: 2">x</p>'],
  ["bullet list", "<ul><li><p>x</p></li></ul>"],
  ["ordered list", "<ol><li><p>x</p></li></ol>"],
  ["nested list (indent)", "<ul><li><p>a</p><ul><li><p>b</p></li></ul></li></ul>"],
  ["list item alignment", '<ul><li style="text-align: center"><p style="text-align: center">x</p></li></ul>'],
  ["heading 2", "<h2>x</h2>"],
  ["heading 3", "<h3>x</h3>"],
  ["heading 4", "<h4>x</h4>"],
  ["blockquote", "<blockquote><p>x</p></blockquote>"],
  ["code block", "<pre><code>x</code></pre>"],
  ["hard break", "<p>a<br>b</p>"],
  ["marks nested", "<p><strong><em><u>x</u></em></strong></p>"],
];

// Negative controls: the gates must still reject unsafe markup.
const rejected = [
  ["div", "<div>x</div>"],
  ["script", "<p><script>alert(1)</script></p>"],
  ["event handler", '<p onclick="alert(1)">x</p>'],
  ["js href", '<p><a href="javascript:alert(1)">x</a></p>'],
  ["style url()", '<p style="background: url(x)">x</p>'],
  ["style off-allowlist", '<p><strong style="color: #ff0000">x</strong></p>'],
];

const failures = [];

const textEntry = blockRegistry.text;
const basePayload = textEntry.createDefaultPayload("paragraph");

for (const [name, html] of toolbarOutputs) {
  if (!isSafeHtmlFragment(html)) {
    failures.push(`sanitizer rejected toolbar output "${name}": ${html}`);
    continue;
  }
  try {
    textEntry.validatePayload({ ...basePayload, html }, "paragraph");
  } catch (error) {
    failures.push(
      `payload validation rejected toolbar output "${name}": ${html} (${error.message})`,
    );
  }
}

for (const [name, html] of rejected) {
  if (isSafeHtmlFragment(html)) {
    failures.push(`sanitizer ACCEPTED unsafe markup "${name}": ${html}`);
  }
}

if (failures.length > 0) {
  console.error(`richtext-smoke: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `richtext-smoke: OK (${toolbarOutputs.length} toolbar shapes accepted, ${rejected.length} unsafe shapes rejected)`,
);
