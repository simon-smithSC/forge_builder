// Typography primitives: Heading / Text / Label. Thin role mappers onto the
// --an-type-* tokens (an-type-<role> utility classes from anvil.css), so copy
// in the chrome always lands on the role scale instead of ad hoc font-size.
// The `role` prop is the TYPE role (Base-style); it intentionally shadows the
// ARIA attribute, which these leaf elements do not need.
import type { ComponentPropsWithRef, ElementType, ReactElement } from "react";
import { cx } from "./util.js";

function roleClass(role: string): string {
  return `an-type-${role.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

export type HeadingRole =
  | "displayLarge"
  | "display"
  | "headingLarge"
  | "heading"
  | "headingSmall";

export interface HeadingProps
  extends Omit<ComponentPropsWithRef<"h2">, "role"> {
  /** Type role; independent from the semantic level. Default "heading". */
  role?: HeadingRole;
  /** Rendered element, h1-h6. Default h2. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function Heading({
  role = "heading",
  as = "h2",
  className,
  ...rest
}: HeadingProps): ReactElement {
  const Tag: ElementType = as;
  return <Tag {...rest} className={cx("an-heading", roleClass(role), className)} />;
}

export type TextRole =
  | "paragraphLarge"
  | "paragraph"
  | "paragraphSmall"
  | "labelLarge"
  | "label"
  | "labelSmall"
  | "mono";

export interface TextProps extends Omit<ComponentPropsWithRef<"p">, "role"> {
  /** Type role. Default "paragraph" (16px reading size). */
  role?: TextRole;
  /** Rendered element. Default p; use span for inline runs. */
  as?: "p" | "span" | "div";
  /** Semantic color slot. Default inherits. */
  tone?: "primary" | "secondary" | "muted";
}

export function Text({
  role = "paragraph",
  as = "p",
  tone,
  className,
  ...rest
}: TextProps): ReactElement {
  const Tag: ElementType = as;
  return (
    <Tag
      {...rest}
      className={cx("an-text", roleClass(role), className)}
      data-tone={tone}
    />
  );
}

export interface LabelProps
  extends Omit<ComponentPropsWithRef<"label">, "role"> {
  /** Type role; labels floor at 13px. Default "label" (14px). */
  role?: "labelLarge" | "label" | "labelSmall";
}

/** Form caption bound to a control via htmlFor. */
export function Label({
  role = "label",
  className,
  ...rest
}: LabelProps): ReactElement {
  return <label {...rest} className={cx("an-label", roleClass(role), className)} />;
}
