// Center canvas: the selected blocks lesson rendered EXACTLY as the player
// renders it, via the shared BlockView from @forge/blocks. Editor affordances
// (BlockEditFrame, insert-between, dnd-kit drag reorder) only wrap the shared
// renderer.
import type { CSSProperties, ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
import { BlockRenderContext, getRegistryEntry } from "@forge/blocks";
import type { InlineEditingPort, RenderContext } from "@forge/blocks";
import { fontStackOf } from "@forge/player";
import type { BlocksLesson, CourseDoc, Lesson } from "@forge/schema";
import {
  renameLesson,
  selectBlock,
  setSectionDescription,
} from "../state/actions.js";
import { reorderBlock } from "../state/dndActions.js";
import { useStore } from "../state/store.js";
import { BlockEditFrame } from "./BlockEditFrame.js";
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
    // Map bare typeface names through the same curated stacks the player
    // uses, so canvas and published output resolve identical fonts.
    "--forge-heading-font": fontStackOf(theme.headingTypeface),
    "--forge-body-font": fontStackOf(theme.bodyTypeface),
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
      <input
        className="fe-canvas-lesson-title"
        value={lesson.title}
        onChange={(event) => renameLesson(lesson.id, event.target.value)}
        placeholder="Lesson title"
        aria-label="Lesson title"
      />
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
                    onInsert={() => setInsertAt({ index, tier: "strip" })}
                  />
                  {insertAt?.index === index && insertAt.tier === "strip" ? (
                    <QuickAddStrip
                      lessonId={lesson.id}
                      index={index}
                      onOpenLibrary={() => setInsertAt({ index, tier: "library" })}
                      onClose={() => setInsertAt(null)}
                    />
                  ) : null}
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
            setInsertAt({ index: lesson.blocks.length, tier: "strip" })
          }
        />
        {insertAt?.index === lesson.blocks.length && insertAt.tier === "strip" ? (
          <QuickAddStrip
            lessonId={lesson.id}
            index={lesson.blocks.length}
            onOpenLibrary={() =>
              setInsertAt({ index: lesson.blocks.length, tier: "library" })
            }
            onClose={() => setInsertAt(null)}
          />
        ) : null}
      </div>
      {lesson.blocks.length === 0 ? (
        <p className="fe-muted fe-canvas-empty">
          This lesson is empty. Use the plus button to add your first block.
        </p>
      ) : null}
      {insertAt !== null && insertAt.tier === "library" ? (
        <BlockLibrary
          lessonId={lesson.id}
          index={insertAt.index}
          onClose={() => setInsertAt(null)}
        />
      ) : null}
    </div>
  );
}

export function Canvas(): ReactElement {
  const course = useStore((state) => state.course);
  const selectedLessonId = useStore((state) => state.selectedLessonId);

  const lesson = course?.lessons.find((item) => item.id === selectedLessonId);

  if (!course || !lesson) {
    return (
      <main className="fe-canvas">
        <p className="fe-muted fe-canvas-empty">
          Select a lesson in the outline to start editing.
        </p>
      </main>
    );
  }

  if (lesson.type === "blocks") {
    // fe-canvas-blocks removes the scroll container's padding so block bands
    // span the full center area edge to edge (layout contract).
    return (
      <main className="fe-canvas fe-canvas-blocks">
        <BlocksCanvas lesson={lesson} course={course} />
      </main>
    );
  }

  if (lesson.type === "quiz") {
    return (
      <main className="fe-canvas">
        <QuizLessonEditor lesson={lesson} />
      </main>
    );
  }

  return (
    <main className="fe-canvas">
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
