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
import { Badge, Button, IconButton } from "@forge/ui";
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
        <Badge
          className="fe-ov-chip"
          tone={lesson.type === "quiz" ? "primary" : "neutral"}
        >
          {lesson.type === "quiz" ? "Quiz" : "Lesson"}
        </Badge>
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
        <IconButton
          size="sm"
          label={`Rename ${lesson.title}`}
          title="Rename"
          icon={<Pencil size={14} aria-hidden />}
          onClick={startRename}
        />
        {isSection ? (
          <IconButton
            size="sm"
            label={`Insert lesson below ${lesson.title}`}
            title="Insert lesson below"
            icon={<Plus size={14} aria-hidden />}
            onClick={() => createLessonAt("blocks", "", index + 1)}
          />
        ) : null}
        <IconButton
          size="sm"
          label={`Move ${lesson.title} up`}
          title="Move up"
          icon={<ChevronUp size={14} aria-hidden />}
          onClick={() => moveLesson(lesson.id, "up")}
          disabled={index === 0}
        />
        <IconButton
          size="sm"
          label={`Move ${lesson.title} down`}
          title="Move down"
          icon={<ChevronDown size={14} aria-hidden />}
          onClick={() => moveLesson(lesson.id, "down")}
          disabled={index === count - 1}
        />
        <IconButton
          size="sm"
          variant="danger"
          label={`Delete ${lesson.title}`}
          title={isSection ? "Remove section" : "Delete"}
          icon={<Trash2 size={14} aria-hidden />}
          onClick={confirmDelete}
        />
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
      <Button
        iconStart={<HelpCircle size={14} aria-hidden />}
        onClick={() => create("quiz")}
        title="Add a quiz lesson"
      >
        Add quiz
      </Button>
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
