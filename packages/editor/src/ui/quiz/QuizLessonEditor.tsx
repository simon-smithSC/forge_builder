// R2 quiz lesson editor: lesson title header, settings form bound to
// quizLessonSettingsSchema, and the questions list with an add-question menu
// covering all seven question types.
import "./quiz.css";
import { useState } from "react";
import type { ReactElement } from "react";
import { Plus } from "lucide-react";
import { Input, Presence } from "@forge/ui";
import type { QuizLesson } from "@forge/schema";
import { renameLesson } from "../../state/actions.js";
import { addQuestion } from "../../state/quizActions.js";
import type { QuestionType } from "../../state/quizActions.js";
import { FieldError } from "./fields.js";
import { QuestionCard } from "./QuestionCard.js";
import { QUESTION_TYPE_LABELS, QUESTION_TYPES } from "./questionMeta.js";
import { QuizSettingsForm } from "./QuizSettingsForm.js";

export function QuizLessonEditor({
  lesson,
  readOnly = false,
}: {
  lesson: QuizLesson;
  readOnly?: boolean;
}): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = (type: QuestionType): void => {
    const { error, questionId } = addQuestion(lesson.id, type);
    setAddError(error);
    if (!error) setExpandedId(questionId);
    setMenuOpen(false);
  };

  const count = lesson.questions.length;

  return (
    <div className="fe-canvas-panel fq-editor">
      <header className="fq-header">
        <label className="fe-field">
          <span className="fe-field-label">Lesson title</span>
          <Input
            value={lesson.title}
            onChange={(event) => renameLesson(lesson.id, event.target.value)}
            readOnly={readOnly}
            aria-label="Lesson title"
          />
        </label>
        <p className="fe-muted">
          Quiz lesson with {count} {count === 1 ? "question" : "questions"}.
        </p>
      </header>

      <section className="fq-section" aria-label="Quiz settings">
        <h2 className="fq-section-title">Settings</h2>
        <QuizSettingsForm lesson={lesson} readOnly={readOnly} />
      </section>

      <section className="fq-section" aria-label="Questions">
        <h2 className="fq-section-title">Questions</h2>
        <div className="fq-questions">
          {lesson.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              lessonId={lesson.id}
              question={question}
              index={index}
              count={count}
              expanded={expandedId === question.id}
              onToggle={() =>
                setExpandedId(expandedId === question.id ? null : question.id)
              }
              readOnly={readOnly}
            />
          ))}
        </div>
        <div className="fq-add">
          <button
            type="button"
            className="fq-add-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={readOnly}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Plus size={14} aria-hidden /> Add question
          </button>
          {/* Presence (motion M5) holds the menu through its
              [data-state="closed"] fade; CSS drops pointer-events while
              closing so a fading menu cannot still add questions. */}
          <Presence open={menuOpen}>
            {(presence) => (
              <div
                ref={presence.ref}
                data-state={presence["data-state"]}
                className="fq-add-menu"
                role="menu"
                aria-label="Question types"
              >
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="menuitem"
                    onClick={() => handleAdd(type)}
                  >
                    {QUESTION_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </Presence>
          <FieldError message={addError} />
        </div>
      </section>
    </div>
  );
}
