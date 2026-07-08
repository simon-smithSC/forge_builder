// Authoring shell over @forge/schema + @forge/blocks + @forge/player.
// Three screens: course list -> course overview -> three-region lesson
// editor. Opening a course lands on the overview; "Edit Content" enters the
// lesson editor; the editor's back button returns to the overview.
import type { ReactElement } from "react";
import { useEffect } from "react";
import { ToastHost } from "@forge/ui";
import { loadCourseList, setUiTheme } from "../state/actions.js";
import { useStore } from "../state/store.js";
import { CourseList } from "./CourseList.js";
import { EditorScreen } from "./EditorScreen.js";
import { CourseOverview } from "./overview/CourseOverview.js";
import { storedTheme } from "./uiPrefs.js";

export function App(): ReactElement {
  const hasCourse = useStore((state) => state.course !== null);
  const screen = useStore((state) => state.screen);
  const uiTheme = useStore((state) => state.uiTheme);

  useEffect(() => {
    if (!hasCourse) void loadCourseList();
    // Load once on mount; closeCourse refreshes the list itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the OS color scheme live, but ONLY while the user has not made
  // an explicit choice (stored pref wins; toggleUiTheme persists it).
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent): void => {
      if (storedTheme() !== null) return;
      setUiTheme(event.matches ? "dark" : "light");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // The "anvil" scope class turns on the design-system tokens for the tool
  // chrome; data-theme="dark" remaps the semantic tier (D6). Course content
  // inside the canvas stays author-themed: block and player styles read
  // --forge-*/--fb-* which Anvil never defines.
  return (
    <div
      className="anvil fe-app"
      data-theme={uiTheme === "dark" ? "dark" : undefined}
    >
      {!hasCourse ? (
        <CourseList />
      ) : screen === "overview" ? (
        <CourseOverview />
      ) : (
        <EditorScreen />
      )}
      {/* Transient feedback (5A.6): publish success, create/open failures,
          conflict-recovery outcomes. Persistent states stay banners. */}
      <ToastHost />
    </div>
  );
}
