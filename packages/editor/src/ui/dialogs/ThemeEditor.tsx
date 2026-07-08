// Theme editor dialog: form over themeSchema with live WCAG contrast checks.
// Apply validates via themeSchema and commits through the course-meta update
// path; the canvas re-derives --forge-* CSS vars from course.theme.
import type { ReactElement } from "react";
import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Badge, Button, Input, Select } from "@forge/ui";
import type { Theme } from "@forge/schema";
import { defaultTheme, themeSchema } from "@forge/schema";
import { setTheme } from "../../state/courseToolsActions.js";
import { useStore } from "../../state/store.js";
import { Dialog } from "./Dialog.js";
import { MediaPicker } from "./MediaPicker.js";
import "./dialogs.css";

const HEX_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const COLOR_FIELDS = [
  { key: "primaryColor", label: "Primary" },
  { key: "backgroundColor", label: "Background" },
  { key: "surfaceColor", label: "Surface" },
  { key: "textColor", label: "Text" },
  { key: "accentColor", label: "Accent" },
] as const;

type ColorKey = (typeof COLOR_FIELDS)[number]["key"];

const TYPEFACE_FIELDS = [
  { key: "headingTypeface", label: "Heading typeface" },
  { key: "bodyTypeface", label: "Body typeface" },
  { key: "uiTypeface", label: "UI typeface" },
] as const;

type TypefaceKey = (typeof TYPEFACE_FIELDS)[number]["key"];

interface ThemeDraft {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  accentColor: string;
  headingTypeface: string;
  bodyTypeface: string;
  uiTypeface: string;
  spacingScale: Theme["spacingScale"];
  logoMediaId: string | null;
}

function draftFromTheme(theme: Theme): ThemeDraft {
  return {
    primaryColor: theme.primaryColor,
    backgroundColor: theme.backgroundColor,
    surfaceColor: theme.surfaceColor,
    textColor: theme.textColor,
    accentColor: theme.accentColor,
    headingTypeface: theme.headingTypeface,
    bodyTypeface: theme.bodyTypeface,
    uiTypeface: theme.uiTypeface,
    spacingScale: theme.spacingScale,
    logoMediaId: theme.logoMediaId ?? null,
  };
}

// ---- WCAG relative-luminance contrast (WCAG 2.x definition) ----

function parseHex(value: string): [number, number, number] | null {
  if (!HEX_PATTERN.test(value)) return null;
  let hex = value.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  // Ignore the alpha channel for contrast purposes.
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

function channelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/** WCAG contrast ratio (L_lighter + 0.05) / (L_darker + 0.05); null when a
 * color is not a parseable hex value (e.g. var(--x)). */
function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const lumA = relativeLuminance(fg);
  const lumB = relativeLuminance(bg);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_RATIO = 4.5;

function ContrastRow({
  label,
  foreground,
  background,
}: {
  label: string;
  foreground: string;
  background: string;
}): ReactElement {
  const ratio = contrastRatio(foreground, background);
  const pass = ratio !== null && ratio >= AA_RATIO;
  const swatchStyle = HEX_PATTERN.test(foreground) && HEX_PATTERN.test(background)
    ? { color: foreground, background }
    : {};
  return (
    <li className="fe-contrast-item">
      <span className="fe-contrast-swatch" style={swatchStyle} aria-hidden>
        Aa
      </span>
      <span className="fe-contrast-label">{label}</span>
      {ratio === null ? (
        <Badge tone="danger">not checkable</Badge>
      ) : (
        <Badge tone={pass ? "success" : "danger"}>
          {pass ? <Check size={12} aria-hidden /> : <TriangleAlert size={12} aria-hidden />}
          {ratio.toFixed(2)}:1 {pass ? "AA pass" : "below AA 4.5:1"}
        </Badge>
      )}
    </li>
  );
}

export function ThemeEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactElement | null {
  if (!open) return null;
  return <ThemeEditorDialog onClose={onClose} />;
}

function ThemeEditorDialog({ onClose }: { onClose: () => void }): ReactElement {
  const theme = useStore((state) => state.course?.theme);
  const media = useStore((state) => state.course?.media);
  const [draft, setDraft] = useState<ThemeDraft>(() =>
    draftFromTheme(theme ?? defaultTheme),
  );
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const setColor = (key: ColorKey, value: string): void => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const apply = (): void => {
    const candidate = {
      primaryColor: draft.primaryColor.trim(),
      backgroundColor: draft.backgroundColor.trim(),
      surfaceColor: draft.surfaceColor.trim(),
      textColor: draft.textColor.trim(),
      accentColor: draft.accentColor.trim(),
      headingTypeface: draft.headingTypeface.trim(),
      bodyTypeface: draft.bodyTypeface.trim(),
      uiTypeface: draft.uiTypeface.trim(),
      spacingScale: draft.spacingScale,
      ...(draft.logoMediaId ? { logoMediaId: draft.logoMediaId } : {}),
    };
    const parsed = themeSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setApplyError(
        first ? `${first.path.join(".")}: ${first.message}` : "Invalid theme.",
      );
      return;
    }
    setTheme(parsed.data);
    onClose();
  };

  const logoRef = draft.logoMediaId ? media?.[draft.logoMediaId] : undefined;

  return (
    <Dialog title="Theme" onClose={onClose}>
      <h3 className="fe-dlg-section-title">Colors</h3>
      <div className="fe-dlg-grid-2">
        {COLOR_FIELDS.map(({ key, label }) => {
          const value = draft[key];
          const valid = HEX_PATTERN.test(value.trim());
          return (
            <div key={key} className="fe-field">
              <span className="fe-field-label">{label}</span>
              <span className="fe-color-row">
                <input
                  type="color"
                  value={valid ? normalizeForColorInput(value.trim()) : "#000000"}
                  onChange={(event) => setColor(key, event.target.value)}
                  aria-label={`${label} color swatch`}
                />
                <Input
                  type="text"
                  value={value}
                  onChange={(event) => setColor(key, event.target.value)}
                  aria-label={`${label} hex value`}
                  spellCheck={false}
                />
              </span>
              {valid ? null : (
                <span className="fe-field-error">
                  Enter a hex color like #1f6feb.
                </span>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="fe-dlg-section-title">Contrast (WCAG AA)</h3>
      <ul className="fe-contrast-list">
        <ContrastRow
          label="Text on background"
          foreground={draft.textColor.trim()}
          background={draft.backgroundColor.trim()}
        />
        <ContrastRow
          label="Text on surface"
          foreground={draft.textColor.trim()}
          background={draft.surfaceColor.trim()}
        />
        <ContrastRow
          label="White on primary (buttons)"
          foreground="#ffffff"
          background={draft.primaryColor.trim()}
        />
      </ul>

      <h3 className="fe-dlg-section-title">Typography and spacing</h3>
      <div className="fe-dlg-grid-2">
        {TYPEFACE_FIELDS.map(({ key, label }) => (
          <label key={key} className="fe-field">
            <span className="fe-field-label">{label}</span>
            <Input
              value={draft[key]}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, [key]: event.target.value }))
              }
            />
          </label>
        ))}
        <label className="fe-field">
          <span className="fe-field-label">Spacing scale</span>
          <Select
            value={draft.spacingScale}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                spacingScale: event.target.value as Theme["spacingScale"],
              }))
            }
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </Select>
        </label>
      </div>

      <h3 className="fe-dlg-section-title">Logo (optional)</h3>
      <div className="fe-field-row">
        <span className="fe-media-current">
          {logoRef ? logoRef.filename : "No logo selected."}
        </span>
        <Button size="sm" onClick={() => setLogoPickerOpen(true)}>
          {logoRef ? "Replace" : "Choose logo"}
        </Button>
        {draft.logoMediaId ? (
          <Button
            size="sm"
            onClick={() => setDraft((prev) => ({ ...prev, logoMediaId: null }))}
          >
            Remove
          </Button>
        ) : null}
      </div>

      {applyError ? (
        <p className="fe-field-error" role="alert">
          {applyError}
        </p>
      ) : null}

      <div className="fe-dlg-footer">
        <span className="fe-dlg-footer-start">
          <Button onClick={() => setDraft(draftFromTheme(defaultTheme))}>
            Reset to default
          </Button>
        </span>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={apply}>
          Apply
        </Button>
      </div>

      <MediaPicker
        open={logoPickerOpen}
        kind="image"
        onClose={() => setLogoPickerOpen(false)}
        onSelect={(mediaId) =>
          setDraft((prev) => ({ ...prev, logoMediaId: mediaId }))
        }
      />
    </Dialog>
  );
}

/** Native color inputs only accept #rrggbb; expand short/alpha hex forms. */
function normalizeForColorInput(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#000000";
  return `#${rgb.map((ch) => ch.toString(16).padStart(2, "0")).join("")}`;
}
