// Rise-style course overview hub (P6): centered column with editable course
// title / author / description, the lesson outline with per-row actions, and
// inline creation inputs (Enter = lesson, Shift+Enter = section). Sits
// between CourseList and EditorScreen; "Edit Content" enters the editor.
import type { KeyboardEvent, ReactElement } from "react";
import { useId, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Lesson } from "@forge/schema";
import {
  moveLesson,
  openLessonEditor,
  removeLesson,
  renameLesson,
  setCourseMeta,
} from "../../state/actions.js";
import { createLessonAt } from "../../state/overviewActions.js";
import { useStore } from "../../state/store.js";
import { OverviewHeader } from "./OverviewHeader.js";
import "./overview.css";

/** Draft-on-focus field: shows the store value until focused, commits the
 * draft on blur (Enter blurs single-line inputs). Undo/redo stays visible
 * because unfocused fields always render the store value. */
function useDraftField(value: string, commit: (next: string) => void) {
  const [draft, setDraft] = useState<string | null>(null);
  return {
    value: draft ?? value,
    onFocus: () => setDraft(value),
    onChange: (next: string) => setDraft(next),
    onBlur: () => {
      if (draft !== null && draft !== value) commit(draft);
      setDraft(null);
    },
  };
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

function CourseMeta(): ReactElement {
  const title = useStore((state) => state.course?.title ?? "");
  const author = useStore((state) => state.course?.author ?? "");
  const description = useStore((state) => state.course?.description ?? "");

  const titleField = useDraftField(title, (next) => setCourseMeta({ title: next }));
  // Schema 1.1.0: author is optional; the mutation drops the key when emptied.
  const authorField = useDraftField(author, (next) => setCourseMeta({ author: next }));
  const descField = useDraftField(description, (next) =>
    setCourseMeta({ description: next }),
  );

  return (
    <div>
      <input
        className="fe-ov-title-input"
        aria-label="Course title"
        placeholder="Course title"
        value={titleField.value}
        onFocus={titleField.onFocus}
        onChange={(event) => titleField.onChange(event.target.value)}
        onBlur={titleField.onBlur}
        onKeyDown={blurOnEnter}
      />
      <input
        className="fe-ov-author-input"
        aria-label="Author name"
        placeholder="Author name"
        value={authorField.value}
        onFocus={authorField.onFocus}
        onChange={(event) => authorField.onChange(event.target.value)}
        onBlur={authorField.onBlur}
        onKeyDown={blurOnEnter}
      />
      <textarea
        className="fe-ov-desc-input"
        aria-label="Course description"
        placeholder="Add a course description..."
        rows={2}
        value={descField.value}
        onFocus={descField.onFocus}
        onChange={(event) => descField.onChange(event.target.value)}
        onBlur={descField.onBlur}
      />
    </div>
  );
}

function OutlineRow({
  lesson,
  index,
  count,
}: {
  lesson: Lesson;
  index: number;
  count: number;
}): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lesson.title);
  const isSection = lesson.type === "section";

  const startRename = (): void => {
    setDraft(lesson.title);
    setEditing(true);
  };

  const commitRename = (): void => {
    setEditing(false);
    const next = draft.trim();
    if (next.length > 0 && next !== lesson.title) renameLesson(lesson.id, next);
  };

  const confirmDelete = (): void => {
    const kind = isSection ? "section" : lesson.type === "quiz" ? "quiz" : "lesson";
    if (window.confirm(`Delete ${kind} "${lesson.title}"?`)) {
      removeLesson(lesson.id);
    }
  };

  return (
    <li className={`fe-ov-row${isSection ? " fe-ov-row-section" : ""}`}>
      {!isSection ? (
        <span
          className={`fe-ov-chip${lesson.type === "quiz" ? " fe-ov-chip-quiz" : ""}`}
        >
          {lesson.type === "quiz" ? "Quiz" : "Lesson"}
        </span>
      ) : null}

      {editing ? (
        <input
          className="fe-ov-rename"
          value={draft}
          autoFocus
          aria-label={isSection ? "Section title" : "Lesson title"}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="fe-ov-row-title"
          onClick={startRename}
          title={`Rename ${lesson.title}`}
        >
          {lesson.title}
        </button>
      )}

      {!isSection && !editing ? (
        <button
          type="button"
          className="fe-ov-edit-link"
          onClick={() => openLessonEditor(lesson.id)}
        >
          Edit Content
        </button>
      ) : null}

      <span className="fe-ov-row-actions">
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={startRename}
          title="Rename"
          aria-label={`Rename ${lesson.title}`}
        >
          <Pencil size={14} aria-hidden />
        </button>
        {isSection ? (
          <button
            type="button"
            className="fe-icon-btn fe-icon-btn-sm"
            onClick={() => createLessonAt("blocks", "", index + 1)}
            title="Insert lesson below"
            aria-label={`Insert lesson below ${lesson.title}`}
          >
            <Plus size={14} aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => moveLesson(lesson.id, "up")}
          disabled={index === 0}
          title="Move up"
          aria-label={`Move ${lesson.title} up`}
        >
          <ChevronUp size={14} aria-hidden />
        </button>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm"
          onClick={() => moveLesson(lesson.id, "down")}
          disabled={index === count - 1}
          title="Move down"
          aria-label={`Move ${lesson.title} down`}
        >
          <ChevronDown size={14} aria-hidden />
        </button>
        <button
          type="button"
          className="fe-icon-btn fe-icon-btn-sm fe-icon-btn-danger"
          onClick={confirmDelete}
          title={isSection ? "Remove section" : "Delete"}
          aria-label={`Delete ${lesson.title}`}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </span>
    </li>
  );
}

/** Inline creation input per the teardown: Enter adds a lesson with the
 * typed title, Shift+Enter adds a section; input clears and keeps focus for
 * rapid entry. The quiz affordance sits next to it (Rise buries it). */
function CreationInput({ position }: { position: "top" | "bottom" }): ReactElement {
  const [title, setTitle] = useState("");
  const hintId = useId();
  const index = position === "top" ? 0 : null;

  const create = (type: Lesson["type"]): void => {
    if (type !== "quiz" && title.trim().length === 0) return;
    createLessonAt(type, title, index);
    setTitle("");
  };

  return (
    <div className={`fe-ov-create fe-ov-create-${position}`}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <input
          className="fe-ov-create-input"
          value={title}
          placeholder="Add a lesson title..."
          aria-label="Add a lesson title"
          aria-describedby={hintId}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            create(event.shiftKey ? "section" : "blocks");
          }}
        />
        <span id={hintId} className="fe-ov-hint">
          Shift + Enter to add as a section
        </span>
      </span>
      <button
        type="button"
        className="fe-btn"
        onClick={() => create("quiz")}
        title="Add a quiz lesson"
      >
        <HelpCircle size={14} aria-hidden />
        Add quiz
      </button>
    </div>
  );
}

export function CourseOverview(): ReactElement {
  const lessons = useStore((state) => state.course?.lessons ?? []);

  return (
    <div className="fe-ov-screen">
      <OverviewHeader />
      <main className="fe-ov-main">
        <div className="fe-ov-column">
          <CourseMeta />
          <CreationInput position="top" />
          {lessons.length === 0 ? (
            <p className="fe-ov-empty">
              No lessons yet. Type a title above to add one.
            </p>
          ) : (
            <ul className="fe-ov-outline">
              {lessons.map((lesson, idx) => (
                <OutlineRow
                  key={lesson.id}
                  lesson={lesson}
                  index={idx}
                  count={lessons.length}
                />
              ))}
            </ul>
          )}
          <CreationInput position="bottom" />
        </div>
      </main>
    </div>
  );
}
