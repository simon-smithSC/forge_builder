import * as Y from "yjs";
import { courseDocSchema, type CourseDoc } from "./schemas.js";

type YjsCompatibleValue =
  | string
  | number
  | boolean
  | null
  | Y.Map<YjsCompatibleValue>
  | Y.Array<YjsCompatibleValue>
  | Y.XmlFragment;

interface BuiltYjsValue {
  value: YjsCompatibleValue;
  afterAttach(): void;
}

interface BuildContext {
  richTextFragments: Map<string, Y.XmlFragment>;
  richTextPaths: string[];
}

export interface YjsCourseMaterialization {
  courseDoc: Y.Doc;
  lessonDocs: Map<string, Y.Doc>;
  richTextFragments: Map<string, Y.XmlFragment>;
  richTextPaths: string[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const incompatible = (path: readonly string[], reason: string): never => {
  throw new Error(
    `Course document is not Yjs-compatible at ${path.join(".") || "root"}: ${reason}.`,
  );
};

const isArrayIndex = (value: string | undefined): boolean =>
  value !== undefined && /^\d+$/u.test(value);

const isBlockPayloadRichTextPath = (path: readonly string[]): boolean => {
  const lastKey = path.at(-1);
  if (!lastKey) {
    return false;
  }

  if (
    [
      "correctFeedback",
      "heading",
      "html",
      "incorrectFeedback",
      "intro",
      "rationale",
      "subheading",
      "summary",
      "transcript",
    ].includes(lastKey)
  ) {
    return true;
  }

  if (lastKey === "text") {
    return path.length === 1;
  }

  if (lastKey === "prompt") {
    return (
      path.length === 1 ||
      (path[0] === "scenes" && isArrayIndex(path[1]) && path[2] === "prompt")
    );
  }

  if (lastKey === "feedback") {
    return (
      (path[0] === "answers" &&
        isArrayIndex(path[1]) &&
        path.length === 3) ||
      (path[0] === "scenes" &&
        isArrayIndex(path[1]) &&
        path[2] === "choices" &&
        isArrayIndex(path[3]) &&
        path.length === 5)
    );
  }

  return false;
};

const isQuestionRichTextPath = (path: readonly string[]): boolean => {
  const lastKey = path.at(-1);
  if (!lastKey) {
    return false;
  }

  if (["prompt", "rationale"].includes(lastKey)) {
    return path.length === 1;
  }

  if (["correct", "incorrect"].includes(lastKey)) {
    return path[0] === "feedback" && path.length === 2;
  }

  if (lastKey === "html") {
    return (
      (path[0] === "answers" &&
        isArrayIndex(path[1]) &&
        path.length === 3) ||
      (path[0] === "items" && isArrayIndex(path[1]) && path.length === 3)
    );
  }

  if (lastKey === "feedback") {
    return path[0] === "answers" && isArrayIndex(path[1]) && path.length === 3;
  }

  return false;
};

const isRichTextPath = (path: readonly string[]): boolean => {
  if (path[0] !== "lessons" || !isArrayIndex(path[1])) {
    return false;
  }

  if (path[2] === "blocks" && isArrayIndex(path[3]) && path[4] === "payload") {
    return isBlockPayloadRichTextPath(path.slice(5));
  }

  if (path[2] === "questions" && isArrayIndex(path[3])) {
    return isQuestionRichTextPath(path.slice(4));
  }

  return false;
};

const emptyAfterAttach = (): void => undefined;

const buildXmlFragment = (
  value: string,
  path: readonly string[],
  context: BuildContext,
): BuiltYjsValue => {
  const fragment = new Y.XmlFragment();
  const pathKey = path.join(".");
  context.richTextFragments.set(pathKey, fragment);
  context.richTextPaths.push(pathKey);

  return {
    value: fragment,
    afterAttach() {
      const text = new Y.XmlText();
      fragment.push([text]);
      text.insert(0, value);
    },
  };
};

const buildYjsValue = (
  value: unknown,
  path: readonly string[],
  context: BuildContext,
): BuiltYjsValue => {
  if (value === null) {
    return { value: null, afterAttach: emptyAfterAttach };
  }

  if (typeof value === "string") {
    if (isRichTextPath(path)) {
      return buildXmlFragment(value, path, context);
    }
    return { value, afterAttach: emptyAfterAttach };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      incompatible(path, "numbers must be finite");
    }
    return { value, afterAttach: emptyAfterAttach };
  }

  if (typeof value === "boolean") {
    return { value, afterAttach: emptyAfterAttach };
  }

  if (Array.isArray(value)) {
    const array = new Y.Array<YjsCompatibleValue>();
    const children = value.map((item, index) =>
      buildYjsValue(item, [...path, String(index)], context),
    );
    array.push(children.map((child) => child.value));

    return {
      value: array,
      afterAttach() {
        for (const child of children) {
          child.afterAttach();
        }
      },
    };
  }

  if (isPlainObject(value)) {
    const map = new Y.Map<YjsCompatibleValue>();
    const children: BuiltYjsValue[] = [];
    for (const [key, childValue] of Object.entries(value)) {
      if (childValue === undefined) {
        incompatible([...path, key], "undefined properties are not representable");
      }
      const child = buildYjsValue(childValue, [...path, key], context);
      map.set(key, child.value);
      children.push(child);
    }

    return {
      value: map,
      afterAttach() {
        for (const child of children) {
          child.afterAttach();
        }
      },
    };
  }

  return incompatible(
    path,
    `${Object.prototype.toString.call(value)} is not representable`,
  );
};

const fromYjsValue = (value: unknown): unknown => {
  if (value instanceof Y.XmlFragment) {
    return value.toString();
  }

  if (value instanceof Y.Array) {
    return value.toArray().map((item) => fromYjsValue(item));
  }

  if (value instanceof Y.Map) {
    const result: Record<string, unknown> = {};
    for (const [key, childValue] of value.entries()) {
      result[key] = fromYjsValue(childValue);
    }
    return result;
  }

  return value;
};

const attachBuiltValue = (
  map: Y.Map<YjsCompatibleValue>,
  key: string,
  builtValue: BuiltYjsValue,
): void => {
  map.set(key, builtValue.value);
  builtValue.afterAttach();
};

export function materializeCourseDocForYjs(input: CourseDoc): YjsCourseMaterialization {
  if (!isPlainObject(input)) {
    incompatible([], "course document root must be an object");
  }

  const context: BuildContext = {
    richTextFragments: new Map<string, Y.XmlFragment>(),
    richTextPaths: [],
  };
  const courseDoc = new Y.Doc();
  const courseMap = courseDoc.getMap<YjsCompatibleValue>("course");
  const lessonOrder = new Y.Array<YjsCompatibleValue>();
  courseMap.set("lessonOrder", lessonOrder);
  lessonOrder.push(input.lessons.map((lesson) => lesson.id));

  for (const [key, value] of Object.entries(input)) {
    if (key === "lessons") {
      continue;
    }
    attachBuiltValue(courseMap, key, buildYjsValue(value, [key], context));
  }

  const lessonDocs = new Map<string, Y.Doc>();
  input.lessons.forEach((lesson, lessonIndex) => {
    const lessonDoc = new Y.Doc();
    const lessonMap = lessonDoc.getMap<YjsCompatibleValue>("lesson");
    for (const [key, value] of Object.entries(lesson)) {
      attachBuiltValue(
        lessonMap,
        key,
        buildYjsValue(value, ["lessons", String(lessonIndex), key], context),
      );
    }
    lessonDocs.set(lesson.id, lessonDoc);
  });

  return {
    courseDoc,
    lessonDocs,
    richTextFragments: context.richTextFragments,
    richTextPaths: context.richTextPaths,
  };
}

const cloneYDoc = (doc: Y.Doc): Y.Doc => {
  const clone = new Y.Doc();
  Y.applyUpdate(clone, Y.encodeStateAsUpdate(doc));
  return clone;
};

export function roundTripCourseDocThroughYjs(input: CourseDoc): CourseDoc {
  const materialized = materializeCourseDocForYjs(input);
  const clonedCourseDoc = cloneYDoc(materialized.courseDoc);
  const courseMap = clonedCourseDoc.getMap("course");
  const courseBase = fromYjsValue(courseMap) as Record<string, unknown>;
  const rawLessonOrder = courseBase.lessonOrder;
  delete courseBase.lessonOrder;

  if (
    !Array.isArray(rawLessonOrder) ||
    !rawLessonOrder.every((id) => typeof id === "string")
  ) {
    incompatible(["lessonOrder"], "lesson order must be a string array");
  }
  const lessonOrder = rawLessonOrder as string[];

  const lessons = lessonOrder.map((lessonId) => {
    const maybeLessonDoc = materialized.lessonDocs.get(lessonId);
    if (maybeLessonDoc === undefined) {
      throw new Error(
        `Course document is not Yjs-compatible at lessonOrder.${lessonId}: missing lesson Y.Doc.`,
      );
    }
    const lessonDoc: Y.Doc = maybeLessonDoc;
    const clonedLessonDoc = cloneYDoc(lessonDoc);
    return fromYjsValue(clonedLessonDoc.getMap("lesson"));
  });

  const roundTripped = {
    ...courseBase,
    lessons,
  };
  const parsed = courseDocSchema.safeParse(roundTripped);
  if (!parsed.success) {
    throw new Error(
      `Course document is not Yjs-compatible: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  return parsed.data as CourseDoc;
}
