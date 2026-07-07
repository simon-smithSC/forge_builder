import { describe, expect, it } from "vitest";
import { escapeXml, XmlWriter } from "./xml.js";
import { buildTincanXml } from "./tincan.js";
import { makeCourse, makeSettings } from "./testutil.js";

describe("escapeXml", () => {
  it("escapes all five special characters", () => {
    expect(escapeXml(`Tom & "Jerry" <met> 'here'`)).toBe(
      "Tom &amp; &quot;Jerry&quot; &lt;met&gt; &apos;here&apos;",
    );
  });

  it("leaves normal text untouched", () => {
    expect(escapeXml("plain text 123")).toBe("plain text 123");
  });
});

describe("XmlWriter", () => {
  it("escapes attribute values and text nodes", () => {
    const writer = new XmlWriter();
    writer.declaration();
    writer.open("root", { attr: `a"b<c>&'d` });
    writer.leaf("child", {}, `x < y & z > "w" 'v'`);
    writer.close("root");
    const xml = writer.toString();
    expect(xml).toContain('attr="a&quot;b&lt;c&gt;&amp;&apos;d"');
    expect(xml).toContain(
      "<child>x &lt; y &amp; z &gt; &quot;w&quot; &apos;v&apos;</child>",
    );
  });

  it("rejects invalid element names", () => {
    const writer = new XmlWriter();
    expect(() => writer.open("bad name")).toThrow(/Invalid XML element name/);
    expect(() => writer.open("a", { "bad attr": "x" })).toThrow(
      /Invalid XML attribute name/,
    );
  });

  it("rejects mismatched close tags", () => {
    const writer = new XmlWriter();
    writer.open("a");
    expect(() => writer.close("b")).toThrow(/Mismatched close/);
  });
});

describe("buildTincanXml escaping", () => {
  it("escapes hostile course titles and descriptions", () => {
    const course = makeCourse({
      title: `Sales & "Support" <Intro> 'Course'`,
      description: `desc & <tag> "q" 'a'`,
    });
    const xml = buildTincanXml(course, makeSettings());
    expect(xml).toContain(
      "Sales &amp; &quot;Support&quot; &lt;Intro&gt; &apos;Course&apos;",
    );
    expect(xml).toContain("desc &amp; &lt;tag&gt; &quot;q&quot; &apos;a&apos;");
    expect(xml).not.toContain("<Intro>");
    // Well-formed check: attribute values contain no raw ampersands.
    expect(xml).not.toMatch(/&(?!(amp|lt|gt|quot|apos);)/);
  });
});
