import type { ComponentPropsWithRef, ReactElement, ReactNode } from "react";
import { cx } from "./util.js";

export interface RadioProps
  extends Omit<ComponentPropsWithRef<"input">, "type" | "size"> {
  /** Visible label text; omit only when labelled externally. */
  label?: ReactNode;
}

export function Radio({ label, className, ...rest }: RadioProps): ReactElement {
  return (
    <label className={cx("an-radio", className)}>
      <input {...rest} type="radio" className="an-radio-input" />
      <span className="an-radio-dot" aria-hidden />
      {label !== undefined ? (
        <span className="an-radio-label">{label}</span>
      ) : null}
    </label>
  );
}
