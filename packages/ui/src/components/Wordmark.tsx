// Forge brand mark (5A.1): a 24px rounded square filled with the cobalt
// brand gradient carrying a white anvil silhouette, plus a small ember
// "spark" facet on the corner (the accent gradient's one chrome moment).
// withText adds the "Forge" wordmark in the heading-small role.
import type { ReactElement } from "react";
import { cx } from "./util.js";

export interface WordmarkProps {
  /** Render the "Forge" name beside the glyph. Default false (glyph only). */
  withText?: boolean;
  className?: string;
}

export function Wordmark({
  withText = false,
  className,
}: WordmarkProps): ReactElement {
  return (
    <span className={cx("an-wordmark", className)}>
      <span className="an-wordmark-glyph" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          {/* Anvil silhouette: wide top slab with a horn sweep, waist, flared base. */}
          <path
            d="M4 5h16a1 1 0 0 1 1 1 6 6 0 0 1-6 6h-1v3h2.5a1.5 1.5 0 0 1 1.5 1.5V19H6v-2.5A1.5 1.5 0 0 1 7.5 15H10v-3H8.8A5.8 5.8 0 0 1 3 6.2 1 1 0 0 1 4 5Z"
            fill="currentColor"
          />
        </svg>
        <span className="an-wordmark-spark" />
      </span>
      {withText ? <span className="an-wordmark-text">Forge</span> : null}
    </span>
  );
}
