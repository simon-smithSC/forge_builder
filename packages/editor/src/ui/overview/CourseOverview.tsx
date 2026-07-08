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
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { CourseCover, Lesson } from "@forge/schema";
import { Badge, Button, IconButton, SegmentedControl } from "@forge/ui";
import {
  moveLesson,
  openLessonEditor,
  removeLesson,
  renameLesson,
  setCourseMeta,
} from "../../state/actions.js";
import { setCourseCover } from "../../state/courseToolsActions.js";
import { createLessonAt } from "../../state/overviewActions.js";
import { useStore } from "../../state/store.js";
import { MediaPicker } from "../dialogs/MediaPicker.js";
import { InlineRichText } from "../rich/InlineRichText.js";
import { plainTextOfHtml } from "../rich/plainText.js";
import { useScrolled } from "../useScrolled.js";
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function CourseMeta(): ReactElement {
  const title = useStore((state) => state.course?.title ?? "");
  const author = useStore((state) => state.course?.author ?? "");
  const description = useStore((state) => state.course?.description ?? "");
  const descriptionHtml = useStore((state) => state.course?.descriptionHtml);

  const titleField = useDraftField(title, (next) => setCourseMeta({ title: next }));
  // Schema 1.1.0: author is optional; the mutation drops the key when emptied.
  const authorField = useDraftField(author, (next) => setCourseMeta({ author: next }));

  // Rich description (V3.2): descriptionHtml is the authored source; legacy
  // plain descriptions are lifted into a <p> for editing. InlineRichText
  // sanitizes before onCommit, so `html` here is always schema-safe; the
  // plain `description` projection is derived on the same commit (it stays
  // canonical for tincan.xml).
  const richHtml =
    descriptionHtml ??
    (description.trim().length > 0 ? `<p>${escapeHtml(description)}</p>` : "");

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
      <div className="fe-ov-desc">
        <InlineRichText
          html={richHtml}
          onCommit={(html) => {
            setCourseMeta({
              descriptionHtml: html,
              description: plainTextOfHtml(html),
            });
            return true;
          }}
          className="fe-ov-desc-rich"
          ariaLabel="Course description"
        />
      </div>
      <CoverSection />
    </div>
  );
}

const COVER_LAYOUTS = [
  { value: "cover", label: "Cover" },
  { value: "hero", label: "Hero" },
];

/** Course cover background controls (V3.1): image via MediaPicker, layout
 * segmented control, and scrim opacity (cover layout only). Thumbnails
 * resolve through the store mediaUrls map, same as the media library. */
function CoverSection(): ReactElement {
  const cover = useStore((state) => state.course?.cover);
  const mediaRef = useStore((state) =>
    state.course?.cover !== undefined
      ? state.course.media[state.course.cover.mediaId]
      : undefined,
  );
  const coverUrl = useStore((state) =>
    state.course?.cover !== undefined
      ? state.mediaUrls[state.course.cover.mediaId]
      : undefined,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (patch: Partial<CourseCover>): void => {
    if (cover === undefined) return;
    setCourseCover({ ...cover, ...patch });
  };

  return (
    <section className="fe-ov-cover" aria-label="Cover image">
      <h2 className="fe-ov-section-title">Cover</h2>
      <div className="fe-ov-cover-row">
        <span className="fe-ov-cover-thumb" aria-hidden="true">
          {coverUrl !== undefined ? (
            <img src={coverUrl} alt="" />
          ) : (
            <ImageIcon size={20} aria-hidden />
          )}
        </span>
        <span className="fe-ov-cover-name">
          {cover !== undefined
            ? (mediaRef?.filename ?? "Cover image")
            : "No cover image."}
        </span>
        <Button size="sm" onClick={() => setPickerOpen(true)}>
          {cover !== undefined ? "Replace" : "Choose image"}
        </Button>
        {cover !== undefined ? (
          <Button size="sm" onClick={() => setCourseCover(undefined)}>
            Remove
          </Button>
        ) : null}
      </div>
      <div className="fe-ov-cover-controls">
        <SegmentedControl
          label="Cover layout"
          size="sm"
          options={COVER_LAYOUTS.map((option) => ({
            ...option,
            disabled: cover === undefined,
          }))}
          value={cover?.layout ?? "cover"}
          onValueChange={(value) =>
            update({ layout: value === "hero" ? "hero" : "cover" })
          }
        />
        {cover !== undefined && cover.layout === "cover" ? (
          <label className="fe-ov-cover-opacity">
            <span>Overlay</span>
            <input
              type="range"
              min={0}
              max={100}
              value={cover.overlayOpacity ?? 55}
              onChange={(event) =>
                update({ overlayOpacity: Number(event.target.value) })
              }
              aria-label="Cover overlay opacity"
            />
            <span className="fe-ov-cover-opacity-value">
              {cover.overlayOpacity ?? 55}%
            </span>
          </label>
        ) : null}
      </div>
      <MediaPicker
        open={pickerOpen}
        kind="image"
        onClose={() => setPickerOpen(false)}
        onSelect={(mediaId) =>
          setCourseCover({
            mediaId,
            layout: cover?.layout ?? "cover",
            ...(cover?.overlayOpacity !== undefined
              ? { overlayOpacity: cover.overlayOpacity }
              : {}),
          })
        }
      />
    </section>
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
  // Scroll-aware header (5B.2): flat at rest, elevation while scrolled.
  const { scrollRef, scrolled } = useScrolled<HTMLElement>();

  return (
    <div className="fe-ov-screen">
      <OverviewHeader scrolled={scrolled} />
      <main className="fe-ov-main" ref={scrollRef}>
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
