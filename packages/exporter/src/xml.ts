/**
 * Minimal XML serializer. Every text node and attribute value is escaped;
 * element and attribute names are validated. There is deliberately no way
 * to inject raw markup (SPEC section 6.6: proper serializer, never string
 * templates).
 */

const XML_NAME = /^[A-Za-z_][A-Za-z0-9._-]*(?::[A-Za-z_][A-Za-z0-9._-]*)?$/;

export function escapeXml(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charAt(i);
    switch (ch) {
      case "&":
        out += "&amp;";
        break;
      case "<":
        out += "&lt;";
        break;
      case ">":
        out += "&gt;";
        break;
      case '"':
        out += "&quot;";
        break;
      case "'":
        out += "&apos;";
        break;
      default:
        out += ch;
    }
  }
  return out;
}

function assertName(name: string, kind: "element" | "attribute"): void {
  if (!XML_NAME.test(name)) {
    throw new Error(`Invalid XML ${kind} name: ${JSON.stringify(name)}`);
  }
}

export class XmlWriter {
  private readonly lines: string[] = [];

  private readonly stack: string[] = [];

  declaration(): this {
    this.lines.push('<?xml version="1.0" encoding="utf-8"?>');
    return this;
  }

  open(name: string, attributes: Readonly<Record<string, string>> = {}): this {
    assertName(name, "element");
    this.lines.push(`${this.indent()}<${name}${this.renderAttributes(attributes)}>`);
    this.stack.push(name);
    return this;
  }

  close(name: string): this {
    const expected = this.stack.pop();
    if (expected !== name) {
      throw new Error(
        `Mismatched close: expected </${expected ?? "(root)"}>, got </${name}>.`,
      );
    }
    this.lines.push(`${this.indent()}</${name}>`);
    return this;
  }

  /** Leaf element with escaped text content on a single line. */
  leaf(
    name: string,
    attributes: Readonly<Record<string, string>>,
    text: string,
  ): this {
    assertName(name, "element");
    this.lines.push(
      `${this.indent()}<${name}${this.renderAttributes(attributes)}>${escapeXml(text)}</${name}>`,
    );
    return this;
  }

  toString(): string {
    if (this.stack.length > 0) {
      throw new Error(`Unclosed XML elements: ${this.stack.join(" > ")}`);
    }
    return `${this.lines.join("\n")}\n`;
  }

  private indent(): string {
    return "  ".repeat(this.stack.length);
  }

  private renderAttributes(attributes: Readonly<Record<string, string>>): string {
    let out = "";
    for (const [key, value] of Object.entries(attributes)) {
      assertName(key, "attribute");
      out += ` ${key}="${escapeXml(value)}"`;
    }
    return out;
  }
}
