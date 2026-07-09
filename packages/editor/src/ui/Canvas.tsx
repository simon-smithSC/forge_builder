// Center canvas: the selected blocks lesson rendered EXACTLY as the player
// renders it, via the shared BlockView from @forge/blocks. Editor affordances
// (BlockEditFrame, insert-between, dnd-kit drag reorder) only wrap the shared
// renderer.
import type { CSSProperties, ReactElement } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Plus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button, EmptyState, Icon, Input, Presence } from "@forge/ui";
import { BlockRenderContext, getRegistryEntry } from "@forge/blocks";
import type { InlineEditingPort, RenderContext } from "@forge/blocks";
import { fontStackOf, readableTextOn } from "@forge/player";
import type { BlocksLesson, CourseDoc, Lesson } from "@forge/schema";
import {
  renameLesson,
  selectBlock,
  setLessonHeader,
  setSectionDescription,
} from "../state/actions.js";
import { reorderBlock } from "../state/dndActions.js";
import { useStore } from "../state/store.js";
import { BlockEditFrame } from "./BlockEditFrame.js";
import { Dialog } from "./dialogs/Dialog.js";
import { MediaPicker } from "./dialogs/MediaPicker.js";
import { InlineHtmlEditor } from "./inline/InlineHtmlEditor.js";
import { BlockLibrary } from "./library/BlockLibrary.js";
import { QuickAddStrip } from "./library/QuickAddStrip.js";
import { QuizLessonEditor } from "./quiz/QuizLessonEditor.js";
import "./dnd.css";

const EMPTY_CONSUMED: ReadonlySet<string> = new Set<string>();

function themeVars(course: CourseDoc): CSSProperties {
  const theme = course.theme;
  return {
    "--forge-primary": theme.primaryColor,
    "--forge-bg": theme.backgroundColor,
    "--forge-surface": theme.surfaceColor,
    "--forge-text": theme.textColor,
    "--forge-accent": theme.accentColor,
    // Luminance-derived foreground for accent-filled markers (mirrors the
    // player's themeStyleOf so canvas and published output match).
    "--forge-accent-contrast": readableTextOn(theme.accentColor),
    // Map bare typeface names through the same curated stacks the player
    // uses, so canvas and published output resolve identical fonts.
    "--forge-heading-font": fontStackOf(theme.headingTypeface),
    "--forge-body-font": fontStackOf(theme.bodyTypeface),
    "--forge-ui-font": fontStackOf(theme.uiTypeface),
  } as CSSProperties;
}

/** Evergreen insert indicator (V1.2): hairline + small disc always visible
 * at rest; the terminal instance is a permanently-strong "Add block" pill. */
function InsertAffordance({
  onInsert,
  terminal = false,
}: {
  onInsert: () => void;
  terminal?: boolean;
}): ReactElement {
  return (
    <div className={terminal ? "fe-insert fe-insert-end" : "fe-insert"}>
      <span className="fe-insert-line" aria-hidden="true" />
      <button
        type="button"
        className="fe-insert-btn"
        onClick={onInsert}
        title={terminal ? "Add block" : "Insert block"}
        aria-label={terminal ? "Add block at end of lesson" : "Insert block here"}
      >
        <Plus size={14} aria-hidden />
        {terminal ? <span className="fe-insert-btn-label">Add block</span> : null}
      </button>
      <span className="fe-insert-line" aria-hidden="true" />
    </div>
  );
}

/** Matches ThemeEditor's accepted hex forms (#rgb/#rgba/#rrggbb/#rrggbbaa). */
const HEX_PATTERN =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Native color inputs only accept #rrggbb; expand short/alpha hex forms. */
function hexForColorInput(hex: string): string {
  if (!HEX_PATTERN.test(hex)) return "#000000";
  let body = hex.slice(1);
  if (body.length === 3 || body.length === 4) {
    body = body
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  return `#${body.slice(0, 6)}`;
}

/** Compact "Header" button next to the lesson title; opens a small dialog
 * with the lesson header background controls (V3.3): image via MediaPicker,
 * hex color row (ThemeEditor pattern), scrim opacity, remove all. */
function LessonHeaderControl({ lesson }: { lesson: BlocksLesson }): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        className="fe-lesson-header-btn"
        iconStart={<ImageIcon size={14} aria-hidden />}
        onClick={() => setOpen(true)}
        title="Lesson header background"
      >
        Header
      </Button>
      {open ? (
        <LessonHeaderDialog lesson={lesson} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function LessonHeaderDialog({
  lesson,
  onClose,
}: {
  lesson: BlocksLesson;
  onClose: () => void;
}): ReactElement {
  const media = useStore((state) => state.course?.media);
  const mediaUrls = useStore((state) => state.mediaUrls);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Draft-on-type hex field: valid values commit immediately, the draft
  // clears on blur so the field resyncs with the store (undo, remove all).
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  const header = lesson.header;
  const imageRef =
    header?.imageMediaId !== undefined ? media?.[header.imageMediaId] : undefined;
  const imageUrl =
    header?.imageMediaId !== undefined ? mediaUrls[header.imageMediaId] : undefined;
  const storeHex = header?.backgroundColor ?? "";
  const hexValue = hexDraft ?? storeHex;
  const hexInvalid =
    hexValue.trim().length > 0 && !HEX_PATTERN.test(hexValue.trim());

  const commitColor = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setLessonHeader(lesson.id, { ...header, backgroundColor: undefined });
    } else if (HEX_PATTERN.test(trimmed)) {
      setLessonHeader(lesson.id, { ...header, backgroundColor: trimmed });
    }
  };

  return (
    <Dialog title="Lesson header" onClose={onClose}>
      <h3 className="fe-dlg-section-title">Background image</h3>
      <div className="fe-field-row">
        <span className="fe-media-current">
          {header?.imageMediaId !== undefined
            ? (imageRef?.filename ?? "Header image")
            : "No image selected."}
        </span>
        <Button size="sm" onClick={() => setPickerOpen(true)}>
          {header?.imageMediaId !== undefined ? "Replace" : "Choose image"}
        </Button>
        {header?.imageMediaId !== undefined ? (
          <Button
            size="sm"
            onClick={() =>
              setLessonHeader(lesson.id, { ...header, imageMediaId: undefined })
            }
          >
            Remove
          </Button>
        ) : null}
      </div>
      {imageUrl !== undefined ? (
        <img className="fe-lesson-header-preview" src={imageUrl} alt="" />
      ) : null}
      {header?.imageMediaId !== undefined ? (
        <label className="fe-field">
          <span className="fe-field-label">
            Overlay opacity ({header.overlayOpacity ?? 55}%)
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={header.overlayOpacity ?? 55}
            onChange={(event) =>
              setLessonHeader(lesson.id, {
                ...header,
                overlayOpacity: Number(event.target.value),
              })
            }
            aria-label="Header overlay opacity"
          />
        </label>
      ) : null}

      <h3 className="fe-dlg-section-title">Background color</h3>
      <div className="fe-field">
        <span className="fe-color-row">
          <input
            type="color"
            value={hexForColorInput(storeHex)}
            onChange={(event) => {
              setHexDraft(event.target.value);
              commitColor(event.target.value);
            }}
            aria-label="Header background color swatch"
          />
          <Input
            type="text"
            value={hexValue}
            placeholder="#1f2328"
            spellCheck={false}
            aria-label="Header background color hex value"
            onChange={(event) => {
              setHexDraft(event.target.value);
              commitColor(event.target.value);
            }}
            onBlur={() => setHexDraft(null)}
          />
        </span>
        {hexInvalid ? (
          <span className="fe-field-error">Enter a hex color like #1f2328.</span>
        ) : null}
      </div>

      <div className="fe-dlg-footer">
        <span className="fe-dlg-footer-start">
          <Button
            onClick={() => {
              setHexDraft(null);
              setLessonHeader(lesson.id, undefined);
            }}
            disabled={header === undefined}
          >
            Remove all
          </Button>
        </span>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>

      <MediaPicker
        open={pickerOpen}
        kind="image"
        onClose={() => setPickerOpen(false)}
        onSelect={(mediaId) =>
          setLessonHeader(lesson.id, { ...header, imageMediaId: mediaId })
        }
      />
    </Dialog>
  );
}

function LessonTitleField({ lesson }: { lesson: Lesson }): ReactElement {
  return (
    <label className="fe-field">
      <span className="fe-field-label">Lesson title</span>
      <input
        value={lesson.title}
        onChange={(event) => renameLesson(lesson.id, event.target.value)}
        aria-label="Lesson title"
      />
    </label>
  );
}

function BlockDragCard({ lesson, blockId }: {
  lesson: BlocksLesson;
  blockId: string;
}): ReactElement | null {
  const block = lesson.blocks.find((item) => item.id === blockId);
  if (!block) return null;
  const entry = getRegistryEntry(block.family);
  return (
    <div className="fe-dnd-overlay-card">
      <span className="fe-dnd-overlay-badge">{block.family}</span>
      <span className="fe-dnd-overlay-title">{entry.palette.label}</span>
    </div>
  );
}

function BlocksCanvas({
  lesson,
  course,
}: {
  lesson: BlocksLesson;
  course: CourseDoc;
}): ReactElement {
  const mediaUrls = useStore((state) => state.mediaUrls);
  const selectedBlockId = useStore((state) => state.selectedBlockId);
  // Two-tier insertion (P4): plus opens the quick-add strip anchored at the
  // insertion point; its "All blocks" chip escalates to the full library.
  const [insertAt, setInsertAt] = useState<{
    index: number;
    tier: "strip" | "library";
  } | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  // Motion M5: the library stays mounted (via Presence) while its exit plays,
  // after insertAt has already gone null - so the last open index is kept for
  // the closing render. Updated during render; writing the same value twice
  // is harmless.
  const lastLibraryIndexRef = useRef(0);
  if (insertAt?.tier === "library") lastLibraryIndexRef.current = insertAt.index;

  // Activation distance 6px keeps plain clicks (select block, toolbar
  // buttons) from starting a drag; the keyboard sensor makes the grip
  // operable with Enter/Space + arrow keys.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const blockIds = useMemo(
    () => lesson.blocks.map((block) => block.id),
    [lesson.blocks],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveBlockId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveBlockId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = lesson.blocks.findIndex((block) => block.id === active.id);
      const to = lesson.blocks.findIndex((block) => block.id === over.id);
      if (from < 0 || to < 0 || from === to) return;
      reorderBlock(lesson.id, from, to);
    },
    [lesson],
  );

  const resolveMediaUrl = useCallback(
    (mediaId: string) => mediaUrls[mediaId],
    [mediaUrls],
  );

  // In-place editing port (P1): the ONLY surface that provides it is the
  // edit-mode canvas; the player never sets it, so EditableHtml renders
  // plain Html everywhere else.
  const inlineEditing = useMemo<InlineEditingPort>(
    () => ({
      renderHtmlEditor: (args) => (
        <InlineHtmlEditor
          key={`${args.blockId}:${args.path}`}
          lessonId={lesson.id}
          blockId={args.blockId}
          path={args.path}
          html={args.html}
          className={args.className}
        />
      ),
    }),
    [lesson.id],
  );

  const context = useMemo<RenderContext>(
    () => ({
      mode: "edit",
      inlineEditing,
      theme: course.theme,
      labels: course.labelSet,
      media: course.media,
      resolveMediaUrl,
      events: {},
      consumedBlockIds: EMPTY_CONSUMED,
      // Authors always get the full native video controls on the canvas.
      videoPlaybackSpeedControl: true,
    }),
    [course.theme, course.labelSet, course.media, resolveMediaUrl, inlineEditing],
  );

  return (
    // Clicking the lesson surface itself (not a block or affordance)
    // deselects, which also dismisses the settings tray (V1.1).
    <div
      className="fe-canvas-lesson"
      style={themeVars(course)}
      onClick={(event) => {
        if (event.target === event.currentTarget) selectBlock(null);
      }}
    >
      <div className="fe-canvas-lesson-titlerow">
        <input
          className="fe-canvas-lesson-title"
          value={lesson.title}
          onChange={(event) => renameLesson(lesson.id, event.target.value)}
          placeholder="Lesson title"
          aria-label="Lesson title"
        />
        <LessonHeaderControl lesson={lesson} />
      </div>
      <BlockRenderContext.Provider value={context}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveBlockId(null)}
        >
          <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
            {lesson.blocks.map((block, index) => (
              <div key={block.id} className="fe-block-slot">
                <div className="fe-lib-anchor">
                  <InsertAffordance
                    // Toggle: a second click on the plus while its popover is
                    // open (either tier) closes it. QuickAddStrip's click-away
                    // deliberately ignores this button so the mousedown does
                    // not null insertAt before this click handler reads it.
                    onInsert={() =>
                      setInsertAt((prev) =>
                        prev?.index === index ? null : { index, tier: "strip" },
                      )
                    }
                  />
                  <Presence
                    open={insertAt?.index === index && insertAt.tier === "strip"}
                  >
                    {(presence) => (
                      <QuickAddStrip
                        lessonId={lesson.id}
                        index={index}
                        onOpenLibrary={() =>
                          setInsertAt({ index, tier: "library" })
                        }
                        onClose={() => setInsertAt(null)}
                        presence={presence}
                      />
                    )}
                  </Presence>
                </div>
                <BlockEditFrame
                  block={block}
                  lessonId={lesson.id}
                  index={index}
                  count={lesson.blocks.length}
                  selected={block.id === selectedBlockId}
                />
              </div>
            ))}
          </SortableContext>
          <DragOverlay>
            {activeBlockId ? (
              <BlockDragCard lesson={lesson} blockId={activeBlockId} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </BlockRenderContext.Provider>
      <div className="fe-lib-anchor">
        <InsertAffordance
          terminal
          onInsert={() =>
            setInsertAt((prev) =>
              prev?.index === lesson.blocks.length
                ? null
                : { index: lesson.blocks.length, tier: "strip" },
            )
          }
        />
        <Presence
          open={
            insertAt?.index === lesson.blocks.length && insertAt.tier === "strip"
          }
        >
          {(presence) => (
            <QuickAddStrip
              lessonId={lesson.id}
              index={lesson.blocks.length}
              onOpenLibrary={() =>
                setInsertAt({ index: lesson.blocks.length, tier: "library" })
              }
              onClose={() => setInsertAt(null)}
              presence={presence}
            />
          )}
        </Presence>
      </div>
      {lesson.blocks.length === 0 ? (
        <EmptyState
          className="fe-canvas-empty"
          icon={<Icon name="layout-grid" size={24} />}
          title="This lesson is empty"
          description="Pick a block to start building: text, media, interactions, quizzes."
          action={
            <Button
              variant="primary"
              iconStart={<Icon name="plus" size={16} />}
              onClick={() => setInsertAt({ index: 0, tier: "library" })}
            >
              Add a block
            </Button>
          }
        />
      ) : null}
      <Presence open={insertAt !== null && insertAt.tier === "library"}>
        {(presence) => (
          <BlockLibrary
            lessonId={lesson.id}
            index={lastLibraryIndexRef.current}
            onClose={() => setInsertAt(null)}
            presence={presence}
          />
        )}
      </Presence>
    </div>
  );
}

export interface CanvasProps {
  /** Scroll-container ref from useScrolled (5B.2): EditorScreen watches the
      canvas scroll position to raise the topbar off its flat idle state. */
  scrollRef?: (node: HTMLElement | null) => void;
}

export function Canvas({ scrollRef }: CanvasProps): ReactElement {
  const course = useStore((state) => state.course);
  const selectedLessonId = useStore((state) => state.selectedLessonId);

  const lesson = course?.lessons.find((item) => item.id === selectedLessonId);

  if (!course || !lesson) {
    return (
      <main className="fe-canvas" ref={scrollRef}>
        <EmptyState
          className="fe-canvas-empty"
          icon={<Icon name="list" size={24} />}
          title="No lesson selected"
          description="Select a lesson in the outline to start editing."
        />
      </main>
    );
  }

  if (lesson.type === "blocks") {
    // fe-canvas-blocks removes the scroll container's padding so block bands
    // span the full center area edge to edge (layout contract).
    return (
      <main className="fe-canvas fe-canvas-blocks" ref={scrollRef}>
        <BlocksCanvas lesson={lesson} course={course} />
      </main>
    );
  }

  if (lesson.type === "quiz") {
    return (
      <main className="fe-canvas" ref={scrollRef}>
        <QuizLessonEditor lesson={lesson} />
      </main>
    );
  }

  return (
    <main className="fe-canvas" ref={scrollRef}>
      <div className="fe-canvas-panel">
        <LessonTitleField lesson={lesson} />
        <label className="fe-field">
          <span className="fe-field-label">Section description</span>
          <textarea
            value={lesson.description ?? ""}
            onChange={(event) => setSectionDescription(lesson.id, event.target.value)}
            rows={3}
            aria-label="Section description"
          />
        </label>
      </div>
    </main>
  );
}
