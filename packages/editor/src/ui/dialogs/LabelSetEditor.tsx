// Label set editor dialog: every labelSet string key grouped by area, with
// JSON export/import validated against labelSetSchema. Commits through the
// course-meta update path; the translations key is carried over untouched.
import type { ChangeEvent, ReactElement } from "react";
import { useState } from "react";
import { Download, Upload } from "lucide-react";
import type { LabelSet } from "@forge/schema";
import { defaultLabelSet, labelSetSchema } from "@forge/schema";
import { setLabelSet } from "../../state/courseToolsActions.js";
import { useStore } from "../../state/store.js";
import { Dialog } from "./Dialog.js";
import "./dialogs.css";

type LabelKey = Exclude<keyof LabelSet, "translations">;

const GROUPS: { title: string; keys: { key: LabelKey; label: string }[] }[] = [
  {
    title: "Navigation",
    keys: [
      { key: "startCourse", label: "Start course" },
      { key: "resumeCourse", label: "Resume course" },
      { key: "continue", label: "Continue" },
      { key: "nextLesson", label: "Next lesson" },
      { key: "previousLesson", label: "Previous lesson" },
      { key: "exitCourse", label: "Exit course" },
    ],
  },
  {
    title: "Quiz feedback",
    keys: [
      { key: "submit", label: "Submit" },
      { key: "correct", label: "Correct" },
      { key: "incorrect", label: "Incorrect" },
      { key: "retry", label: "Retry" },
      { key: "revealAnswer", label: "Reveal answer" },
      { key: "passed", label: "Passed" },
      { key: "failed", label: "Failed" },
    ],
  },
  {
    title: "Course chrome",
    keys: [
      { key: "complete", label: "Complete" },
      { key: "searchPlaceholder", label: "Search placeholder" },
    ],
  },
];

const ALL_KEYS: LabelKey[] = GROUPS.flatMap((group) =>
  group.keys.map((item) => item.key),
);

type LabelDraft = Record<LabelKey, string>;

function draftFromLabelSet(labels: LabelSet): LabelDraft {
  const draft = {} as LabelDraft;
  for (const key of ALL_KEYS) draft[key] = labels[key];
  return draft;
}

export function LabelSetEditor({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactElement | null {
  if (!open) return null;
  return <LabelSetEditorDialog onClose={onClose} />;
}

function LabelSetEditorDialog({ onClose }: { onClose: () => void }): ReactElement {
  const labelSet = useStore((state) => state.course?.labelSet);
  const current = labelSet ?? defaultLabelSet;
  const [draft, setDraft] = useState<LabelDraft>(() => draftFromLabelSet(current));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const assemble = (): LabelSet => ({
    ...draft,
    // Keep the translations key untouched if the course has one.
    ...(current.translations ? { translations: current.translations } : {}),
  });

  const save = (): void => {
    setError(null);
    const parsed = labelSetSchema.safeParse(assemble());
    if (!parsed.success) {
      const empties = ALL_KEYS.filter((key) => draft[key].trim().length === 0);
      setError(
        empties.length > 0
          ? `Labels cannot be empty: ${empties.join(", ")}`
          : "Label set failed validation.",
      );
      return;
    }
    setLabelSet(parsed.data);
    onClose();
  };

  const exportJson = (): void => {
    const blob = new Blob([JSON.stringify(assemble(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "labelset.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setNotice(null);
    void file.text().then((text) => {
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        setError("That file is not valid JSON.");
        return;
      }
      const record =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const missing = ALL_KEYS.filter((key) => {
        const value = record[key];
        return typeof value !== "string" || value.trim().length === 0;
      });
      const candidate: Record<string, unknown> = {};
      for (const key of ALL_KEYS) candidate[key] = record[key];
      if (record["translations"] !== undefined) {
        candidate["translations"] = record["translations"];
      }
      const parsed = labelSetSchema.safeParse(candidate);
      if (!parsed.success) {
        setError(
          missing.length > 0
            ? `Import rejected. Missing or invalid keys: ${missing.join(", ")}`
            : "Import rejected. The file does not match the label set schema.",
        );
        return;
      }
      setDraft(draftFromLabelSet(parsed.data));
      setNotice(`Imported ${file.name}. Review and press Save to apply.`);
    });
  };

  return (
    <Dialog title="Labels" onClose={onClose} panelClassName="fe-dlg-wide">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="fe-dlg-section-title">{group.title}</h3>
          <div className="fe-dlg-grid-2">
            {group.keys.map(({ key, label }) => (
              <label key={key} className="fe-field">
                <span className="fe-field-label">{label}</span>
                <input
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      {error ? (
        <p className="fe-field-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="fe-muted">{notice}</p> : null}

      <div className="fe-dlg-footer">
        <span className="fe-dlg-footer-start">
          <button type="button" className="fe-btn" onClick={exportJson}>
            <Download size={14} aria-hidden />
            Export JSON
          </button>
          <label className="fe-btn">
            <Upload size={14} aria-hidden />
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={importJson}
              style={{ display: "none" }}
            />
          </label>
        </span>
        <button type="button" className="fe-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="fe-btn fe-btn-primary" onClick={save}>
          Save
        </button>
      </div>
    </Dialog>
  );
}
