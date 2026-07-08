// D6 dark mode toggle. Flips the tool-chrome theme only: the canvas paper
// and published output stay author-themed (--forge- and --fb- tokens),
// exactly like Rise/Figma.
import type { ReactElement } from "react";
import { Icon, IconButton } from "@forge/ui";
import { toggleUiTheme } from "../state/actions.js";
import { useStore } from "../state/store.js";

export function ThemeToggle(): ReactElement {
  const uiTheme = useStore((state) => state.uiTheme);
  const dark = uiTheme === "dark";
  return (
    <IconButton
      label={dark ? "Switch to light mode" : "Switch to dark mode"}
      icon={<Icon name={dark ? "sun" : "moon"} size={18} />}
      onClick={() => toggleUiTheme()}
    />
  );
}
