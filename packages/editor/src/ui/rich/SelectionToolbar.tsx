// Rise-style two-row selection toolbar (POLISH-PLAN V2). Rendered in a
// Tiptap BubbleMenu: tippy MOVES this component's DOM node into a popper it
// appends elsewhere, so the popper must land INSIDE the React root (#root,
// see main.tsx) - React delegates all synthetic events at that container, and
// a body-level popper would sit outside it, leaving every onClick/onChange
// dead (buttons render but no command ever runs). The root div still carries
// .anvil (plus data-theme) itself because the popper is a sibling of the
// .anvil app shell, outside its token scope. Selection survival: plain buttons preventDefault
// on mousedown so the editor never loses focus; focus-stealing controls
// (selects, the link input, native color inputs) store the selection when the
// interaction starts and re-apply it via setTextSelection before running the
// command, while an interacting latch keeps shouldShow true meanwhile.
import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChainedCommands, Editor } from "@tiptap/core";
import type { BubbleMenuProps } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalSpaceAround,
  Baseline,
  Bold,
  Code,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Plus,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import { Button, IconButton, Input, Popover, Select } from "@forge/ui";
import { useStore } from "../../state/store.js";
import { FONT_OPTIONS, fontNameOfStack, toolbarFontStack } from "./fontOptions.js";
import { isAllowedLinkHref } from "./richTextConfig.js";
import "./selectionToolbar.css";

const ICON_SIZE = 14;

/** Body copy renders at 17px in .fb-html; headings match blocks CSS
 *  (h2 2rem, h3 1.35rem, h4 falls between h3 and body). */
const BODY_DEFAULT_PX = 17;
const HEADING_DEFAULT_PX: Record<number, number> = { 2: 32, 3: 22, 4: 19 };
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 72;

const STANDARD_COLORS: readonly { name: string; value: string }[] = [
  { name: "Black", value: "#1f2328" },
  { name: "Gray", value: "#6b7280" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#e11d48" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#0d9488" },
  { name: "Blue", value: "#1f6feb" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
];

const LINE_HEIGHTS = ["1", "1.15", "1.5", "2"] as const;

type PanelKey = "color" | "highlight" | "link" | "align" | "spacing";

type ParagraphStyle = "normal" | "h2" | "h3" | "h4" | "quote";

/** Prefix bare host names so authors can type "example.com". */
function normalizeLinkHref(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "" || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export interface SelectionToolbarProps {
  editor: Editor;
}

export function SelectionToolbar({ editor }: SelectionToolbarProps): ReactElement {
  const uiTheme = useStore((state) => state.uiTheme);
  const theme = useStore((state) => state.course?.theme);
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [, setTick] = useState(0);

  // Latch + stored range for controls that move focus out of the editor.
  const interactingRef = useRef(false);
  const storedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const openPanelRef = useRef<PanelKey | null>(null);

  // Toggle/select states must track the document, not React renders.
  useEffect(() => {
    const rerender = (): void => {
      setTick((tick) => tick + 1);
    };
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
    };
  }, [editor]);

  // shouldShow is captured once by the BubbleMenu plugin, so it may only
  // read refs: visible while a text selection exists, or while the author is
  // inside a toolbar control (select, popover, input) that stole focus.
  const shouldShow = useCallback<NonNullable<BubbleMenuProps["shouldShow"]>>(
    ({ editor: current }) =>
      current.isEditable &&
      (interactingRef.current ||
        openPanelRef.current !== null ||
        !current.state.selection.empty),
    [],
  );

  const storeSelection = (): void => {
    const { from, to } = editor.state.selection;
    storedSelectionRef.current = { from, to };
    interactingRef.current = true;
  };

  const setPanel = (panel: PanelKey | null): void => {
    setOpenPanel(panel);
    openPanelRef.current = panel;
    if (panel !== null) storeSelection();
    else interactingRef.current = false;
  };

  /** Re-apply the stored selection (if any), run the command, end latch. */
  const runWithSelection = (
    apply: (chain: ChainedCommands) => ChainedCommands,
  ): void => {
    let chain = editor.chain().focus();
    const stored = storedSelectionRef.current;
    if (stored !== null) chain = chain.setTextSelection(stored);
    apply(chain).run();
    storedSelectionRef.current = null;
    interactingRef.current = false;
  };

  /** For controls that never take focus (mousedown is prevented). */
  const run = (apply: (chain: ChainedCommands) => ChainedCommands): void => {
    apply(editor.chain().focus()).run();
  };

  const preventFocusSteal = (event: { preventDefault: () => void }): void => {
    event.preventDefault();
  };

  // ----- derived state ------------------------------------------------

  const paragraphStyle: ParagraphStyle = editor.isActive("blockquote")
    ? "quote"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : editor.isActive("heading", { level: 4 })
          ? "h4"
          : "normal";

  const fontName =
    fontNameOfStack(editor.getAttributes("textStyle").fontFamily as string | null) ?? "";

  const currentFontSize = (): number => {
    const marked = editor.getAttributes("textStyle").fontSize as string | null | undefined;
    if (typeof marked === "string") {
      const parsed = Number.parseFloat(marked);
      if (Number.isFinite(parsed)) return Math.round(parsed);
    }
    const level = editor.getAttributes("heading").level as number | undefined;
    if (typeof level === "number") {
      return HEADING_DEFAULT_PX[level] ?? BODY_DEFAULT_PX;
    }
    return BODY_DEFAULT_PX;
  };
  const sizePx = currentFontSize();

  const alignIcon = editor.isActive({ textAlign: "center" }) ? (
    <AlignCenter size={ICON_SIZE} aria-hidden />
  ) : editor.isActive({ textAlign: "right" }) ? (
    <AlignRight size={ICON_SIZE} aria-hidden />
  ) : (
    <AlignLeft size={ICON_SIZE} aria-hidden />
  );

  // ----- handlers -------------------------------------------------------

  const applyParagraphStyle = (value: ParagraphStyle): void => {
    const inQuote = editor.isActive("blockquote");
    runWithSelection((chain) => {
      let next = chain;
      if (inQuote && value !== "quote") next = next.lift("blockquote");
      switch (value) {
        case "normal":
          return next.setParagraph();
        case "h2":
          return next.setHeading({ level: 2 });
        case "h3":
          return next.setHeading({ level: 3 });
        case "h4":
          return next.setHeading({ level: 4 });
        case "quote":
          return inQuote ? next : next.setParagraph().wrapIn("blockquote");
      }
    });
  };

  const stepFontSize = (delta: number): void => {
    const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, sizePx + delta));
    run((chain) => chain.setFontSize(`${next}px`));
  };

  const applyColor = (kind: "color" | "highlight", value: string | null): void => {
    runWithSelection((chain) => {
      if (kind === "color") {
        return value === null ? chain.unsetColor() : chain.setColor(value);
      }
      return value === null ? chain.unsetHighlight() : chain.setHighlight({ color: value });
    });
    setPanel(null);
  };

  const openLinkPanel = (): void => {
    const existing = editor.getAttributes("link").href as string | undefined;
    setLinkDraft(typeof existing === "string" ? existing : "");
    setLinkInvalid(false);
    setPanel("link");
  };

  const applyLink = (): void => {
    const href = normalizeLinkHref(linkDraft);
    if (!isAllowedLinkHref(href)) {
      setLinkInvalid(true);
      return;
    }
    runWithSelection((chain) => chain.extendMarkRange("link").setLink({ href }));
    setPanel(null);
  };

  const removeLink = (): void => {
    runWithSelection((chain) => chain.extendMarkRange("link").unsetLink());
    setPanel(null);
  };

  const clearFormatting = (): void => {
    run((chain) =>
      chain.unsetAllMarks().unsetTextAlign().unsetLineHeight().unsetFontSize(),
    );
  };

  // ----- render helpers -------------------------------------------------

  const markToggle = (
    key: string,
    label: string,
    icon: ReactElement,
    isActive: boolean,
    apply: (chain: ChainedCommands) => ChainedCommands,
    disabled = false,
  ): ReactElement => (
    <IconButton
      key={key}
      size="sm"
      label={label}
      icon={icon}
      aria-pressed={isActive}
      disabled={disabled}
      onMouseDown={preventFocusSteal}
      onClick={() => run(apply)}
    />
  );

  const swatchPanel = (kind: "color" | "highlight"): ReactElement => {
    const active =
      kind === "color"
        ? (editor.getAttributes("textStyle").color as string | undefined)
        : (editor.getAttributes("highlight").color as string | undefined);
    const swatches: { name: string; value: string }[] = [];
    if (theme) {
      swatches.push({ name: "Theme primary", value: theme.primaryColor });
      swatches.push({ name: "Theme accent", value: theme.accentColor });
    }
    swatches.push(...STANDARD_COLORS);
    return (
      <div className="fe-seltoolbar-panel">
        <div className="fe-seltoolbar-swatches">
          <button
            type="button"
            className="fe-seltoolbar-swatch fe-seltoolbar-swatch-none"
            title="None"
            aria-label={kind === "color" ? "Remove text color" : "Remove highlight"}
            onMouseDown={preventFocusSteal}
            onClick={() => applyColor(kind, null)}
          />
          {swatches.map((swatch) => (
            <button
              key={`${swatch.name}-${swatch.value}`}
              type="button"
              className="fe-seltoolbar-swatch"
              style={{ background: swatch.value }}
              title={swatch.name}
              aria-label={swatch.name}
              aria-pressed={active?.toLowerCase() === swatch.value.toLowerCase()}
              onMouseDown={preventFocusSteal}
              onClick={() => applyColor(kind, swatch.value)}
            />
          ))}
        </div>
        <label className="fe-seltoolbar-custom">
          <span>Custom</span>
          <input
            type="color"
            value={active ?? "#1f2328"}
            aria-label="Custom color"
            onMouseDown={storeSelection}
            onFocus={storeSelection}
            onChange={(event) => applyColor(kind, event.target.value)}
          />
        </label>
      </div>
    );
  };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="feSelectionToolbar"
      updateDelay={100}
      shouldShow={shouldShow}
      tippyOptions={{
        // Must stay inside the React root so event delegation keeps working
        // (see header comment). #root spans the viewport without overflow
        // clipping, so positioning is equivalent to a body-level popper.
        appendTo: () => document.getElementById("root") ?? document.body,
        placement: "top",
        maxWidth: "none",
      }}
    >
      <div
        className="anvil fe-seltoolbar"
        data-theme={uiTheme === "dark" ? "dark" : undefined}
        role="toolbar"
        aria-label="Text formatting"
      >
        <div className="fe-seltoolbar-row">
          <Select
            size="sm"
            className="fe-seltoolbar-font"
            aria-label="Font"
            value={fontName}
            onMouseDown={storeSelection}
            onFocus={storeSelection}
            onBlur={() => {
              if (openPanelRef.current === null) interactingRef.current = false;
            }}
            onChange={(event) => {
              const name = event.target.value;
              runWithSelection((chain) =>
                name === ""
                  ? chain.unsetFontFamily()
                  : chain.setFontFamily(toolbarFontStack(name)),
              );
            }}
          >
            <option value="">Theme font</option>
            {FONT_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            size="sm"
            className="fe-seltoolbar-parastyle"
            aria-label="Paragraph style"
            value={paragraphStyle}
            onMouseDown={storeSelection}
            onFocus={storeSelection}
            onBlur={() => {
              if (openPanelRef.current === null) interactingRef.current = false;
            }}
            onChange={(event) => applyParagraphStyle(event.target.value as ParagraphStyle)}
          >
            <option value="normal">Normal</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="quote">Quote</option>
          </Select>

          <span className="fe-seltoolbar-sep" aria-hidden />

          <IconButton
            size="sm"
            label="Decrease font size"
            icon={<Minus size={ICON_SIZE} aria-hidden />}
            disabled={sizePx <= FONT_SIZE_MIN}
            onMouseDown={preventFocusSteal}
            onClick={() => stepFontSize(-1)}
          />
          <span className="fe-seltoolbar-size" aria-label="Font size">
            {sizePx}
          </span>
          <IconButton
            size="sm"
            label="Increase font size"
            icon={<Plus size={ICON_SIZE} aria-hidden />}
            disabled={sizePx >= FONT_SIZE_MAX}
            onMouseDown={preventFocusSteal}
            onClick={() => stepFontSize(1)}
          />

          <span className="fe-seltoolbar-sep" aria-hidden />

          <Popover
            open={openPanel === "color"}
            onClose={() => setPanel(null)}
            placement="bottom-start"
            label="Text color"
            anchor={
              <IconButton
                size="sm"
                label="Text color"
                icon={<Baseline size={ICON_SIZE} aria-hidden />}
                aria-expanded={openPanel === "color"}
                onMouseDown={preventFocusSteal}
                onClick={() => setPanel(openPanel === "color" ? null : "color")}
              />
            }
          >
            {swatchPanel("color")}
          </Popover>

          <Popover
            open={openPanel === "highlight"}
            onClose={() => setPanel(null)}
            placement="bottom-start"
            label="Highlight color"
            anchor={
              <IconButton
                size="sm"
                label="Highlight"
                icon={<Highlighter size={ICON_SIZE} aria-hidden />}
                aria-pressed={editor.isActive("highlight")}
                aria-expanded={openPanel === "highlight"}
                onMouseDown={preventFocusSteal}
                onClick={() => setPanel(openPanel === "highlight" ? null : "highlight")}
              />
            }
          >
            {swatchPanel("highlight")}
          </Popover>

          <span className="fe-seltoolbar-sep" aria-hidden />

          {markToggle(
            "bold",
            "Bold",
            <Bold size={ICON_SIZE} aria-hidden />,
            editor.isActive("bold"),
            (chain) => chain.toggleBold(),
          )}
          {markToggle(
            "italic",
            "Italic",
            <Italic size={ICON_SIZE} aria-hidden />,
            editor.isActive("italic"),
            (chain) => chain.toggleItalic(),
          )}
          {markToggle(
            "underline",
            "Underline",
            <UnderlineIcon size={ICON_SIZE} aria-hidden />,
            editor.isActive("underline"),
            (chain) => chain.toggleUnderline(),
          )}
          {markToggle(
            "strike",
            "Strikethrough",
            <Strikethrough size={ICON_SIZE} aria-hidden />,
            editor.isActive("strike"),
            (chain) => chain.toggleStrike(),
          )}
        </div>

        <div className="fe-seltoolbar-row">
          {markToggle(
            "subscript",
            "Subscript",
            <SubscriptIcon size={ICON_SIZE} aria-hidden />,
            editor.isActive("subscript"),
            (chain) => chain.toggleSubscript(),
          )}
          {markToggle(
            "superscript",
            "Superscript",
            <SuperscriptIcon size={ICON_SIZE} aria-hidden />,
            editor.isActive("superscript"),
            (chain) => chain.toggleSuperscript(),
          )}

          <Popover
            open={openPanel === "link"}
            onClose={() => setPanel(null)}
            placement="bottom-start"
            label="Link"
            anchor={
              <IconButton
                size="sm"
                label="Link"
                icon={<LinkIcon size={ICON_SIZE} aria-hidden />}
                aria-pressed={editor.isActive("link")}
                aria-expanded={openPanel === "link"}
                onMouseDown={preventFocusSteal}
                onClick={() => (openPanel === "link" ? setPanel(null) : openLinkPanel())}
              />
            }
          >
            <div className="fe-seltoolbar-panel fe-seltoolbar-link">
              <Input
                size="sm"
                type="text"
                placeholder="https://example.com"
                aria-label="Link URL"
                value={linkDraft}
                invalid={linkInvalid}
                onFocus={() => {
                  interactingRef.current = true;
                }}
                onChange={(event) => {
                  setLinkDraft(event.target.value);
                  setLinkInvalid(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  }
                }}
              />
              <Button size="sm" variant="primary" onClick={applyLink}>
                Apply
              </Button>
              <Button size="sm" onClick={removeLink} disabled={!editor.isActive("link")}>
                Remove
              </Button>
              {linkInvalid ? (
                <span className="fe-seltoolbar-link-error" role="alert">
                  Only http, https and mailto links are allowed.
                </span>
              ) : null}
            </div>
          </Popover>

          <Popover
            open={openPanel === "align"}
            onClose={() => setPanel(null)}
            placement="bottom-start"
            label="Alignment"
            anchor={
              <IconButton
                size="sm"
                label="Alignment"
                icon={alignIcon}
                aria-expanded={openPanel === "align"}
                onMouseDown={preventFocusSteal}
                onClick={() => setPanel(openPanel === "align" ? null : "align")}
              />
            }
          >
            <div className="fe-seltoolbar-panel fe-seltoolbar-rowpanel">
              {(["left", "center", "right"] as const).map((alignment) => (
                <IconButton
                  key={alignment}
                  size="sm"
                  label={`Align ${alignment}`}
                  icon={
                    alignment === "left" ? (
                      <AlignLeft size={ICON_SIZE} aria-hidden />
                    ) : alignment === "center" ? (
                      <AlignCenter size={ICON_SIZE} aria-hidden />
                    ) : (
                      <AlignRight size={ICON_SIZE} aria-hidden />
                    )
                  }
                  aria-pressed={editor.isActive({ textAlign: alignment })}
                  onMouseDown={preventFocusSteal}
                  onClick={() => {
                    runWithSelection((chain) => chain.setTextAlign(alignment));
                    setPanel(null);
                  }}
                />
              ))}
            </div>
          </Popover>

          {markToggle(
            "orderedList",
            "Numbered list",
            <ListOrdered size={ICON_SIZE} aria-hidden />,
            editor.isActive("orderedList"),
            (chain) => chain.toggleOrderedList(),
          )}
          {markToggle(
            "bulletList",
            "Bulleted list",
            <List size={ICON_SIZE} aria-hidden />,
            editor.isActive("bulletList"),
            (chain) => chain.toggleBulletList(),
          )}
          {markToggle(
            "indent",
            "Indent",
            <IndentIncrease size={ICON_SIZE} aria-hidden />,
            false,
            (chain) => chain.sinkListItem("listItem"),
            !editor.can().sinkListItem("listItem"),
          )}
          {markToggle(
            "outdent",
            "Outdent",
            <IndentDecrease size={ICON_SIZE} aria-hidden />,
            false,
            (chain) => chain.liftListItem("listItem"),
            !editor.can().liftListItem("listItem"),
          )}

          <Popover
            open={openPanel === "spacing"}
            onClose={() => setPanel(null)}
            placement="bottom-start"
            label="Line spacing"
            anchor={
              <IconButton
                size="sm"
                label="Line spacing"
                icon={<AlignVerticalSpaceAround size={ICON_SIZE} aria-hidden />}
                aria-expanded={openPanel === "spacing"}
                onMouseDown={preventFocusSteal}
                onClick={() => setPanel(openPanel === "spacing" ? null : "spacing")}
              />
            }
          >
            <div className="fe-seltoolbar-panel fe-seltoolbar-menu">
              <button
                type="button"
                className="fe-seltoolbar-menuitem"
                onMouseDown={preventFocusSteal}
                onClick={() => {
                  runWithSelection((chain) => chain.unsetLineHeight());
                  setPanel(null);
                }}
              >
                Default
              </button>
              {LINE_HEIGHTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="fe-seltoolbar-menuitem"
                  aria-pressed={
                    editor.getAttributes("paragraph").lineHeight === value ||
                    editor.getAttributes("heading").lineHeight === value
                  }
                  onMouseDown={preventFocusSteal}
                  onClick={() => {
                    runWithSelection((chain) => chain.setLineHeight(value));
                    setPanel(null);
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </Popover>

          <span className="fe-seltoolbar-sep" aria-hidden />

          {markToggle(
            "code",
            "Inline code",
            <Code size={ICON_SIZE} aria-hidden />,
            editor.isActive("code"),
            (chain) => chain.toggleCode(),
          )}
          <IconButton
            size="sm"
            label="Clear formatting"
            icon={<RemoveFormatting size={ICON_SIZE} aria-hidden />}
            onMouseDown={preventFocusSteal}
            onClick={clearFormatting}
          />
        </div>
      </div>
    </BubbleMenu>
  );
}
