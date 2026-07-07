// Pure CourseDoc mutations. Every function returns a NEW CourseDoc with
// structural sharing (untouched lessons/blocks keep their references).
import type {
  Block,
  BlockFamily,
  BlockSettings,
  CourseDoc,
  Lesson,
  MediaRef,
} from "@forge/schema";
import { createUlid } from "@forge/schema";
import { getRegistryEntry } from "@forge/blocks";

const DEFAULT_BLOCK_SETTINGS: BlockSettings = {
  paddingTop: 2,
  paddingBottom: 2,
  textColorMode: "auto",
};

function touch(course: CourseDoc): CourseDoc {
  return { ...course, updatedAt: new Date().toISOString() };
}

function mapLesson(
  course: CourseDoc,
  lessonId: string,
  fn: (lesson: Lesson) => Lesson,
): CourseDoc {
  let changed = false;
  const lessons = course.lessons.map((lesson) => {
    if (lesson.id !== lessonId) return lesson;
    const next = fn(lesson);
    if (next !== lesson) changed = true;
    return next;
  });
  if (!changed) return course;
  return touch({ ...course, lessons });
}

function mapBlocks(
  course: CourseDoc,
  lessonId: string,
  fn: (blocks: Block[]) => Block[],
): CourseDoc {
  return mapLesson(course, lessonId, (lesson) => {
    if (lesson.type !== "blocks") return lesson;
    const blocks = fn(lesson.blocks);
    if (blocks === lesson.blocks) return lesson;
    return { ...lesson, blocks };
  });
}

export function updateBlockPayload(
  course: CourseDoc,
  lessonId: string,
  blockId: string,
  payload: unknown,
): CourseDoc {
  return mapBlocks(course, lessonId, (blocks) =>
    blocks.map((block) =>
      block.id === blockId ? ({ ...block, payload } as Block) : block,
    ),
  );
}

export function updateBlockSettings(
  course: CourseDoc,
  lessonId: string,
  blockId: string,
  settings: Partial<BlockSettings>,
): CourseDoc {
  return mapBlocks(course, lessonId, (blocks) =>
    blocks.map((block) => {
      if (block.id !== blockId) return block;
      const next: BlockSettings = { ...block.settings, ...settings };
      // exactOptionalPropertyTypes: drop keys explicitly set to undefined.
      for (const key of Object.keys(next) as (keyof BlockSettings)[]) {
        if (next[key] === undefined) delete next[key];
      }
      return { ...block, settings: next } as Block;
    }),
  );
}

/**
 * Switch a block to another variant in its family. Starts from the variant's
 * default payload and carries over fields that trivially line up (same key,
 * same primitive/array shape), falling back to the pure default when the
 * merged payload does not validate.
 */
export function updateBlockVariant(
  course: CourseDoc,
  lessonId: string,
  blockId: string,
  newVariant: string,
): CourseDoc {
  return mapBlocks(course, lessonId, (blocks) =>
    blocks.map((block) => {
      if (block.id !== blockId || block.variant === newVariant) return block;
      const entry = getRegistryEntry(block.family);
      const base = entry.createDefaultPayload(newVariant) as Record<
        string,
        unknown
      >;
      const previous = block.payload as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...base };
      for (const key of Object.keys(base)) {
        const prevValue = previous[key];
        const baseValue = merged[key];
        if (prevValue === undefined) continue;
        if (typeof prevValue !== typeof baseValue) continue;
        if (Array.isArray(prevValue) !== Array.isArray(baseValue)) continue;
        merged[key] = prevValue;
      }
      let payload: unknown;
      try {
        payload = entry.validatePayload(merged, newVariant);
      } catch {
        payload = entry.validatePayload(base, newVariant);
      }
      return { ...block, variant: newVariant, payload } as Block;
    }),
  );
}

export function addBlock(
  course: CourseDoc,
  lessonId: string,
  family: BlockFamily,
  index: number,
): { course: CourseDoc; blockId: string } {
  const entry = getRegistryEntry(family);
  const variant = entry.variants[0];
  if (!variant) throw new Error(`Family "${family}" has no variants.`);
  const blockId = createUlid();
  const block = {
    id: blockId,
    family,
    variant,
    payload: entry.createDefaultPayload(variant),
    settings: { ...DEFAULT_BLOCK_SETTINGS },
  } as Block;
  const next = mapBlocks(course, lessonId, (blocks) => {
    const at = Math.max(0, Math.min(index, blocks.length));
    return [...blocks.slice(0, at), block, ...blocks.slice(at)];
  });
  return { course: next, blockId };
}

export function removeBlock(
  course: CourseDoc,
  lessonId: string,
  blockId: string,
): CourseDoc {
  return mapBlocks(course, lessonId, (blocks) => {
    const next = blocks.filter((block) => block.id !== blockId);
    return next.length === blocks.length ? blocks : next;
  });
}

export function moveBlock(
  course: CourseDoc,
  lessonId: string,
  blockId: string,
  direction: "up" | "down",
): CourseDoc {
  return mapBlocks(course, lessonId, (blocks) => {
    const index = blocks.findIndex((block) => block.id === blockId);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= blocks.length) return blocks;
    const next = [...blocks];
    const moved = next[index];
    const other = next[target];
    if (!moved || !other) return blocks;
    next[target] = moved;
    next[index] = other;
    return next;
  });
}

/** Deep-clone a payload, remapping nested item ids consistently so internal
 * references (correctPileId, columnId, nextSceneId...) stay valid. Media ids
 * are never in the map, so they are preserved. */
function cloneWithFreshIds(payload: unknown): unknown {
  const idMap = new Map<string, string>();
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) collect(item);
    } else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record["id"] === "string") {
        idMap.set(record["id"], createUlid());
      }
      for (const item of Object.values(record)) collect(item);
    }
  };
  const replace = (value: unknown): unknown => {
    if (typeof value === "string") return idMap.get(value) ?? value;
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) out[key] = replace(item);
      return out;
    }
    return value;
  };
  collect(payload);
  return replace(payload);
}

export function duplicateBlock(
  course: CourseDoc,
  lessonId: string,
  blockId: string,
): { course: CourseDoc; blockId: string | null } {
  let newId: string | null = null;
  const next = mapBlocks(course, lessonId, (blocks) => {
    const index = blocks.findIndex((block) => block.id === blockId);
    const source = index >= 0 ? blocks[index] : undefined;
    if (!source) return blocks;
    newId = createUlid();
    const copy = {
      ...source,
      id: newId,
      payload: cloneWithFreshIds(source.payload),
      settings: { ...source.settings },
    } as Block;
    return [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)];
  });
  return { course: next, blockId: newId };
}

export function addLesson(
  course: CourseDoc,
  type: Lesson["type"],
): { course: CourseDoc; lessonId: string } {
  const lessonId = createUlid();
  let lesson: Lesson;
  if (type === "section") {
    lesson = { type: "section", id: lessonId, title: "New section" };
  } else if (type === "quiz") {
    lesson = {
      type: "quiz",
      id: lessonId,
      title: "New quiz",
      settings: {
        passingScore: 80,
        retryCount: -1,
        revealAnswers: "all",
        shuffleAnswerChoices: false,
        randomizeQuestionOrder: false,
      },
      questions: [
        {
          type: "MULTIPLE_CHOICE",
          id: createUlid(),
          prompt: "<p>New question</p>",
          answers: [
            { id: createUlid(), html: "<p>Correct answer</p>", correct: true },
            { id: createUlid(), html: "<p>Wrong answer</p>", correct: false },
          ],
        },
      ],
    };
  } else {
    lesson = { type: "blocks", id: lessonId, title: "New lesson", blocks: [] };
  }
  return {
    course: touch({ ...course, lessons: [...course.lessons, lesson] }),
    lessonId,
  };
}

export function renameLesson(
  course: CourseDoc,
  lessonId: string,
  title: string,
): CourseDoc {
  if (title.trim().length === 0) return course;
  return mapLesson(course, lessonId, (lesson) => ({ ...lesson, title }));
}

export function updateSectionDescription(
  course: CourseDoc,
  lessonId: string,
  description: string,
): CourseDoc {
  return mapLesson(course, lessonId, (lesson) => {
    if (lesson.type !== "section") return lesson;
    if (description.length === 0) {
      const { description: _dropped, ...rest } = lesson;
      return rest;
    }
    return { ...lesson, description };
  });
}

export function removeLesson(course: CourseDoc, lessonId: string): CourseDoc {
  const lessons = course.lessons.filter((lesson) => lesson.id !== lessonId);
  if (lessons.length === course.lessons.length) return course;
  return touch({ ...course, lessons });
}

export function moveLesson(
  course: CourseDoc,
  lessonId: string,
  direction: "up" | "down",
): CourseDoc {
  const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= course.lessons.length) return course;
  const lessons = [...course.lessons];
  const moved = lessons[index];
  const other = lessons[target];
  if (!moved || !other) return course;
  lessons[target] = moved;
  lessons[index] = other;
  return touch({ ...course, lessons });
}

export function updateCourseMeta(
  course: CourseDoc,
  meta: { title?: string; description?: string },
): CourseDoc {
  const next = { ...course };
  if (meta.title !== undefined && meta.title.trim().length > 0) {
    next.title = meta.title;
  }
  if (meta.description !== undefined) next.description = meta.description;
  return touch(next);
}

export function addMediaRef(course: CourseDoc, ref: MediaRef): CourseDoc {
  return touch({ ...course, media: { ...course.media, [ref.id]: ref } });
}
