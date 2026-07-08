// Publish dialog per SPEC 7 / RECOVERY-PLAN R3: PublishSettings form,
// validation via publishSettingsSchema, zip build + download, and a result
// panel with grouped warnings. Uses the shared Dialog wrapper.

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Download, TriangleAlert, UploadCloud } from "lucide-react";
import {
  Button,
  Checkbox,
  Input,
  ProgressBar,
  Radio,
  Select,
  toast,
} from "@forge/ui";
import type { PublishWarning } from "@forge/exporter";
import type { PublishSettings } from "@forge/schema";
import { publishSettingsSchema } from "@forge/schema";
import { useStore } from "../../state/store.js";
import { Dialog } from "../dialogs/Dialog.js";
import { downloadZip, runPublish } from "./publishAction.js";
import type { PublishResult } from "./publishAction.js";
import "./publish.css";

const REPORTING_MODES: {
  value: PublishSettings["reportingMode"];
  label: string;
}[] = [
  { value: "passed-incomplete", label: "Passed (never report failure)" },
  { value: "passed-failed", label: "Passed / Failed" },
  { value: "completed-incomplete", label: "Completed (never report failure)" },
  { value: "completed-failed", label: "Completed / Failed" },
];

export interface PublishDialogProps {
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function PublishDialog({ open, onClose }: PublishDialogProps): ReactElement | null {
  const course = useStore((state) => state.course);
  const mediaUrls = useStore((state) => state.mediaUrls);

  const [trackingMode, setTrackingMode] = useState<"courseCompletion" | "quizResult">(
    "courseCompletion",
  );
  const [requiredLessonPercent, setRequiredLessonPercent] = useState(100);
  const [quizLessonId, setQuizLessonId] = useState("");
  const [reportingMode, setReportingMode] =
    useState<PublishSettings["reportingMode"]>("passed-incomplete");
  const [exitCourseLink, setExitCourseLink] = useState(false);
  const [hideCoverPage, setHideCoverPage] = useState(false);
  const [strictLaunch, setStrictLaunch] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);

  const quizLessons = useMemo(
    () =>
      (course?.lessons ?? []).flatMap((lesson) =>
        lesson.type === "quiz" ? [{ id: lesson.id, title: lesson.title }] : [],
      ),
    [course],
  );

  const lessonTitles = useMemo(() => {
    const titles = new Map<string, string>();
    for (const lesson of course?.lessons ?? []) titles.set(lesson.id, lesson.title);
    return titles;
  }, [course]);

  const groupedWarnings = useMemo(() => {
    const groups = new Map<string, PublishWarning[]>();
    for (const warning of result?.warnings ?? []) {
      const list = groups.get(warning.code) ?? [];
      list.push(warning);
      groups.set(warning.code, list);
    }
    return [...groups.entries()];
  }, [result]);

  if (!open || !course) return null;

  const selectQuizMode = (): void => {
    setTrackingMode("quizResult");
    if (quizLessonId === "" || !quizLessons.some((q) => q.id === quizLessonId)) {
      setQuizLessonId(quizLessons[0]?.id ?? "");
    }
  };

  const handlePublish = async (): Promise<void> => {
    const raw = {
      tracking:
        trackingMode === "courseCompletion"
          ? { mode: "courseCompletion" as const, requiredLessonPercent }
          : { mode: "quizResult" as const, quizLessonId },
      reportingMode,
      exitCourseLink,
      hideCoverPage,
      strictLaunch,
      statementProfile: "forge-v1" as const,
    };
    const parsed = publishSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(
        issue
          ? `Invalid publish settings: ${issue.path.join(".")} ${issue.message}`
          : "Invalid publish settings.",
      );
      return;
    }
    setPublishing(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await runPublish(course, parsed.data, mediaUrls);
      setResult(outcome);
      downloadZip(outcome);
      // Transient success (5A.6); the result panel below keeps the details.
      toast("Package downloaded", { tone: "success" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog title="Publish course" onClose={onClose} panelClassName="fe-publish-panel">
      <div className="fe-publish">
        <fieldset className="fe-publish-group" disabled={publishing}>
          <legend>Completion tracking</legend>
          <Radio
            className="fe-publish-radio"
            name="fe-publish-tracking"
            checked={trackingMode === "courseCompletion"}
            onChange={() => setTrackingMode("courseCompletion")}
            label="Course completion"
          />
          {trackingMode === "courseCompletion" ? (
            <label className="fe-publish-inline">
              <span>Required lesson percent</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={requiredLessonPercent}
                onChange={(event) =>
                  setRequiredLessonPercent(Number(event.target.value))
                }
              />
            </label>
          ) : null}
          <Radio
            className="fe-publish-radio"
            name="fe-publish-tracking"
            checked={trackingMode === "quizResult"}
            disabled={quizLessons.length === 0}
            onChange={selectQuizMode}
            label={
              <>
                Quiz result
                {quizLessons.length === 0
                  ? " (this course has no quiz lessons)"
                  : ""}
              </>
            }
          />
          {trackingMode === "quizResult" ? (
            <label className="fe-publish-inline">
              <span>Tracked quiz</span>
              <Select
                value={quizLessonId}
                onChange={(event) => setQuizLessonId(event.target.value)}
              >
                {quizLessons.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </fieldset>

        <fieldset className="fe-publish-group" disabled={publishing}>
          <legend>Reporting</legend>
          <label className="fe-publish-inline">
            <span>LMS reporting</span>
            <Select
              value={reportingMode}
              onChange={(event) =>
                setReportingMode(event.target.value as PublishSettings["reportingMode"])
              }
            >
              {REPORTING_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </Select>
          </label>
          <Checkbox
            className="fe-publish-check"
            checked={exitCourseLink}
            onChange={(event) => setExitCourseLink(event.target.checked)}
            label="Show an exit course link"
          />
          <Checkbox
            className="fe-publish-check"
            checked={hideCoverPage}
            onChange={(event) => setHideCoverPage(event.target.checked)}
            label="Hide the cover page"
          />
          <Checkbox
            className="fe-publish-check"
            checked={strictLaunch}
            onChange={(event) => setStrictLaunch(event.target.checked)}
            label="Strict launch (fail instead of untracked preview)"
          />
          <p className="fe-publish-profile">
            Statement profile: <code>forge-v1</code> (rise-compat cut per ADR 0003)
          </p>
        </fieldset>

        {error !== null ? (
          <p className="fe-publish-error" role="alert">
            <TriangleAlert size={14} aria-hidden /> {error}
          </p>
        ) : null}

        {/* Ember accent (5C.1): progress is ember's job, and publishing is
            the editor's one brand-energy moment. */}
        {publishing ? <ProgressBar accent label="Publishing" /> : null}

        <div className="fe-publish-actions">
          <Button onClick={onClose} disabled={publishing}>
            Close
          </Button>
          <Button
            variant="primary"
            loading={publishing}
            iconStart={<UploadCloud size={14} aria-hidden />}
            onClick={() => void handlePublish()}
          >
            Publish
          </Button>
        </div>

        {result !== null ? (
          <section className="fe-publish-result" aria-live="polite">
            <h3>Package built</h3>
            {result.playerRuntimeMissing ? (
              <p className="fe-publish-runtime-missing" role="alert">
                <TriangleAlert size={16} aria-hidden />
                <span>
                  Player runtime bundle missing - run{" "}
                  <code>pnpm --filter @forge/player build:runtime</code>. The zip
                  was built without <code>lib/player.js</code> and will not play.
                </span>
              </p>
            ) : null}
            <p className="fe-publish-summary">
              <code>{result.fileName}</code> - {formatBytes(result.zipBytes)} -{" "}
              {result.entryCount} entries
            </p>
            {groupedWarnings.length > 0 ? (
              <div className="fe-publish-warnings">
                <h4>{result.warnings.length} warnings</h4>
                {groupedWarnings.map(([code, warnings]) => (
                  <details key={code} className="fe-publish-warning-group" open>
                    <summary>
                      <code>{code}</code> ({warnings.length})
                    </summary>
                    <ul>
                      {warnings.map((warning, index) => (
                        <li key={`${code}-${index}`}>
                          {warning.message}
                          {warning.lessonId !== undefined ? (
                            <span className="fe-publish-warning-context">
                              {" "}
                              in lesson &quot;
                              {lessonTitles.get(warning.lessonId) ?? warning.lessonId}
                              &quot;
                              {warning.blockId !== undefined
                                ? ` (block ${warning.blockId})`
                                : ""}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            ) : (
              <p className="fe-publish-no-warnings">No warnings.</p>
            )}
            <Button
              iconStart={<Download size={14} aria-hidden />}
              onClick={() => downloadZip(result)}
            >
              Download again
            </Button>
          </section>
        ) : null}
      </div>
    </Dialog>
  );
}
