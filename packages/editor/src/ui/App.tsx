// Authoring shell over @forge/schema + @forge/blocks + @forge/player.
// Two screens: the course list and the three-region editor.
import type { ReactElement } from "react";
import { useEffect } from "react";
import { loadCourseList } from "../state/actions.js";
import { useStore } from "../state/store.js";
import { CourseList } from "./CourseList.js";
import { EditorScreen } from "./EditorScreen.js";

export function App(): ReactElement {
  const hasCourse = useStore((state) => state.course !== null);

  useEffect(() => {
    if (!hasCourse) void loadCourseList();
    // Load once on mount; closeCourse refreshes the list itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return hasCourse ? <EditorScreen /> : <CourseList />;
}
