// Lightweight UI preference persistence (V1.3/V1.4). Tool-chrome prefs only;
// course CONTENT never touches localStorage (ADR 0003, contract-check rule 5
// bans keys containing "course" -- keep it that way).
export function readPref(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / quota / disabled storage: prefs are best-effort.
  }
}

export const OUTLINE_COLLAPSED_PREF = "forge-outline-collapsed";

// ---- UI theme (D6 dark mode) ----

export type UiTheme = "light" | "dark";

const THEME_PREF = "forge-ui-theme";

/** The explicitly stored theme choice, or null when the user never chose. */
export function storedTheme(): UiTheme | null {
  const value = readPref(THEME_PREF);
  return value === "dark" || value === "light" ? value : null;
}

/** Explicit stored choice wins; otherwise follow the OS color scheme. */
export function resolveInitialTheme(): UiTheme {
  const stored = storedTheme();
  if (stored !== null) return stored;
  try {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    // Fall through to light.
  }
  return "light";
}

export function storeTheme(theme: UiTheme): void {
  writePref(THEME_PREF, theme);
}
