// Left sidebar: course outline. Lessons in order, sections as group headers,
// per-lesson rename/delete/move controls, dnd-kit drag reorder (sections are
// lessons in the same array, so they sort with the rest).
import type { CSSProperties, ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  HelpCircle,
  Pencil,
  Trash2,
} from "lucide-react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Lesson } from "@forge/schema";
import {
  addLesson,
  moveLesson,
  removeLesson,
  renameLesson,
  selectLesson,
} from "../state/actions.js";
import { reorderLesson } from "../state/dndActions.js";
import { useStore } from "../state/store.js";

function LessonRow({
  lesson,
  index,
  count,
  selected,
}: {
  lesson: Lesson;
  index: number;
  count: number;
  selected: boolean;
}): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lesson.title);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  // @dnd-kit/utilities is not directly importable in this workspace layout,
  // so the transform string is computed by hand (translation only).
  const style: CSSProperties = {};
  if (transform) {
    style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }
  if (transition) style.transition = transition;

  const commitRename = (): void => {
    setEditing(false);
    if (draft.trim().length > 0 && draft !== lesson.title) {
      renameLesson(lesson.id, draft.trim());
    } else {
      setDraft(lesson.title);
    }
  };

  const confirmDelete = (): void => {
    const kind = lesson.type === "section" ? "section" : "lesson";
    if (window.confirm(`Delete ${kind} "${lesson.title}"? This cannot be undone on other devices.`)) {
      removeLesson(lesson.id);
    }
  };

  const isSection = lesson.type === "section";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "fe-outline-item",
        isSection ? "fe-outline-section" : "",
        selected ? "fe-outline-item-selected" : "",
        isDragging ? "fe-dnd-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="fe-icon-btn fe-icon-btn-sm fe-drag-grip fe-outline-grip"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        aria-label={`Drag to reorder ${lesson.title}`}
      >
        <GripVertical size={13} aria-hidden />
      </button>
      {editing ? (
        <input
          className="fe-outline-rename"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") {
              setDraft(lesson.title);
              setEditing(false);
            }
          }}
          aria-label="Lesson title"
        />
      ) : (
        <button
          type="button"
          className="fe-outline-label"
          onClick={() => selectLesson(lesson.id)}
        >
          {lesson.type === "blocks" ? <FileText size={14} aria-hidden /> : null}
          {lesson.type === "quiz" ? <HelpCircle size={14} aria-hidden /> : null}
          <span>{lesson.title}</span>
        </button>
      )}

      <span className="fe-outline-controls">
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => setEditing(true)}
          title="Rename"
          aria-label={`Rename ${lesson.title}`}
        >
          <Pencil size={13} aria-hidden />
        </button>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => moveLesson(lesson.id, "up")}
          disabled={index === 0}
          title="Move up"
          aria-label={`Move ${lesson.title} up`}
        >
          <ChevronUp size={13} aria-hidden />
        </button>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => moveLesson(lesson.id, "down")}
          disabled={index === count - 1}
          title="Move down"
          aria-label={`Move ${lesson.title} down`}
        >
          <ChevronDown size={13} aria-hidden />
        </button>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm fe-icon-btn-danger"
          onClick={confirmDelete}
          title="Delete"
          aria-label={`Delete ${lesson.title}`}
        >
          <Trash2 size={13} aria-hidden />
        </button>
      </span>
    </li>
  );
}

function lessonKindLabel(lesson: Lesson): string {
  if (lesson.type === "section") return "section";
  if (lesson.type === "quiz") return "quiz";
  return "lesson";
}

export function Outline(): ReactElement {
  const lessons = useStore((state) => state.course?.lessons ?? []);
  const selectedLessonId = useStore((state) => state.selectedLessonId);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const lessonIds = useMemo(() => lessons.map((lesson) => lesson.id), [lessons]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveLessonId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveLessonId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = lessons.findIndex((lesson) => lesson.id === active.id);
      const to = lessons.findIndex((lesson) => lesson.id === over.id);
      if (from < 0 || to < 0 || from === to) return;
      reorderLesson(from, to);
    },
    [lessons],
  );

  const activeLesson = activeLessonId
    ? lessons.find((lesson) => lesson.id === activeLessonId)
    : undefined;

  return (
    <aside className="fe-outline">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLessonId(null)}
      >
        <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
          <ul className="fe-outline-list">
            {lessons.map((lesson, index) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={index}
                count={lessons.length}
                selected={lesson.id === selectedLessonId}
              />
            ))}
          </ul>
        </SortableContext>
        <DragOverlay>
          {activeLesson ? (
            <div className="fe-dnd-overlay-card">
              <span className="fe-dnd-overlay-badge">
                {lessonKindLabel(activeLesson)}
              </span>
              <span className="fe-dnd-overlay-title">{activeLesson.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <div className="fe-outline-actions">
        <button type="button" className="fe-btn" onClick={() => addLesson("blocks")}>
          + Lesson
        </button>
        <button type="button" className="fe-btn" onClick={() => addLesson("section")}>
          + Section
        </button>
        <button type="button" className="fe-btn" onClick={() => addLesson("quiz")}>
          + Quiz
        </button>
      </div>
    </aside>
  );
}
