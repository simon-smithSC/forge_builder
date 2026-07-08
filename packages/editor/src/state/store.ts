// Zustand-backed store per ADR 0002. The exported surface (editorStore with
// getState/setState/subscribe, the useStore selector hook, createStore) is a
// contract other modules import; only the internals moved to zustand/vanilla.
import { useStore as useZustandStore } from "zustand";
import { createStore as createVanillaStore } from "zustand/vanilla";
import type { CourseDoc } from "@forge/schema";
import { resolveInitialTheme } from "../ui/uiPrefs.js";
import type { UiTheme } from "../ui/uiPrefs.js";

export interface CourseSummary {
  id: string;
  title: string;
  lessonCount: number;
  updatedAt: string;
  revision: number;
}

export type SaveStatus = "saved" | "saving" | "offline" | "conflict";

/** Which screen is shown while a course is open: the Rise-style course
 * overview hub or the three-region lesson editor. */
export type WorkspaceScreen = "overview" | "lesson";

/** Summary of unacknowledged journal entries offered for restore. */
export interface RestoreCandidate {
  lessonIds: string[];
  entryCount: number;
  newestAt: string;
}

export interface EditorState {
  course: CourseDoc | null;
  courseList: CourseSummary[];
  screen: WorkspaceScreen;
  selectedLessonId: string | null;
  selectedBlockId: string | null;
  /** Whether the block settings tray is open. The tray renders only while a
   * block is also selected; selection alone never opens it (V1.1). */
  settingsOpen: boolean;
  /** Tool-chrome theme (D6). Course content stays author-themed. */
  uiTheme: UiTheme;
  saveStatus: SaveStatus;
  revision: number;
  /** mediaId -> object URL (R1 local media bridge). // R2: signed-URL uploads */
  mediaUrls: Record<string, string>;
  canUndo: boolean;
  canRedo: boolean;
  restoreCandidate: RestoreCandidate | null;
  loadError: string | null;
  busy: boolean;
}

export interface Store<S> {
  getState: () => S;
  setState: (updater: (prev: S) => S) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Zustand vanilla store behind the legacy Store<S> facade. setState keeps
 * updater-function semantics; identical return values skip notification
 * (zustand's Object.is check matches the old reference check). */
export function createStore<S>(initial: S): Store<S> {
  const store = createVanillaStore<S>(() => initial);
  return {
    getState: store.getState,
    setState: (updater) => {
      store.setState(updater, true);
    },
    subscribe: (listener) => store.subscribe(listener),
  };
}

export const initialEditorState: EditorState = {
  course: null,
  courseList: [],
  screen: "overview",
  selectedLessonId: null,
  selectedBlockId: null,
  settingsOpen: false,
  uiTheme: resolveInitialTheme(),
  saveStatus: "saved",
  revision: 1,
  mediaUrls: {},
  canUndo: false,
  canRedo: false,
  restoreCandidate: null,
  loadError: null,
  busy: false,
};

/** Underlying zustand StoreApi; kept private so consumers stay on the
 * contract surface below. */
const editorStoreApi = createVanillaStore<EditorState>(() => initialEditorState);

export const editorStore: Store<EditorState> = {
  getState: editorStoreApi.getState,
  setState: (updater) => {
    editorStoreApi.setState(updater, true);
  },
  subscribe: (listener) => editorStoreApi.subscribe(listener),
};

/** Selector hook over the editor store. Zustand's useStore handles the
 * useSyncExternalStore wiring (React 19 compatible). */
export function useStore<T>(selector: (state: EditorState) => T): T {
  return useZustandStore(editorStoreApi, selector);
}
