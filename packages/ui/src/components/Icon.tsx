// Anvil icon: renders vendored Lucide geometry (src/icons/icons.ts, ISC) on
// the 24x24 stroke grid. Sizing convention (icon.size tokens): 16 inline with
// text, 20 default controls, 24 emphasis. Stroke width 2 (icon.stroke token)
// at every size. Decorative by default (aria-hidden); pass a label for
// standalone semantics.
import type { ReactElement, SVGProps } from "react";
import { createElement } from "react";
import { iconData } from "../icons/icons.js";
import type { IconName } from "../icons/icons.js";

export interface IconProps
  extends Omit<SVGProps<SVGSVGElement>, "name" | "children"> {
  name: IconName;
  /** Pixel size; token steps are 16 / 20 / 24. Default 16. */
  size?: number;
  /** Stroke width on the 24px grid. Default 2 (--an-icon-stroke-regular). */
  strokeWidth?: number;
  /** Accessible name. Omitted = decorative (aria-hidden). */
  label?: string;
}

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  label,
  ...rest
}: IconProps): ReactElement {
  return (
    <svg
      {...rest}
      className={["an-icon", rest.className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label !== undefined ? "img" : undefined}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
    >
      {iconData[name].map(([tag, attrs], i) =>
        createElement(tag, { ...attrs, key: i }),
      )}
    </svg>
  );
}
