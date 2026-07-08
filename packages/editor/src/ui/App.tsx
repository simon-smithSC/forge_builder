// Authoring shell over @forge/schema + @forge/blocks + @forge/player.
// Three screens: course list -> course overview -> three-region lesson
// editor. Opening a course lands on the overview; "Edit Content" enters the
// lesson editor; the editor's back button returns to the overview.
import type { ReactElement } from "react";
import { useEffect } from "react";
import { loadCourseList } from "../state/actions.js";
import { useStore } from "../state/store.js";
import { CourseList } from "./CourseList.js";
import { EditorScreen } from "./EditorScreen.js";
import { CourseOverview } from "./overview/CourseOverview.js";

export function App(): ReactElement {
  const hasCourse = useStore((state) => state.course !== null);
  const screen = useStore((state) => state.screen);

  useEffect(() => {
    if (!hasCourse) void loadCourseList();
    // Load once on mount; closeCourse refreshes the list itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasCourse) return <CourseList />;
  return screen === "overview" ? <CourseOverview /> : <EditorScreen />;
}
