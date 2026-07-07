// Rise-spec entrance animation resolution + timing (docs/PLAYER-UX-PLAN.md,
// U1). Mechanics measured from the real Rise runtime
// (rise:lib/rise/e6486c58.css `.scroll-animation`, 27633c2d.js `QY`/`KY`):
// reveal is a CSS transition `opacity 1s ease-out, transform 1s ease-out`
// with `transition-delay: 0.12s + idx * 0.15s`, triggered by an
// IntersectionObserver (rootMargin "2% 0px", threshold 0, unobserve on first
// fire) plus a 1000ms fallback timer.
//
// Kind -> initial offset (applied in styles.css, mirroring Rise's offset map):
//   fade  -> opacity 0 + translateY(25px)   (Rise `fadeInUp`)
//   slide -> opacity 0 + translateX(-50px)  (Rise `fadeInLeft`)
//   zoom  -> opacity 0 + scale(0.95)        (Rise `fadeInGrow`)
//   none  -> no animation; content renders visible immediately.

/** Effective animation applied by the player's PlayerBlock wrapper. */
export type EntranceKind = "none" | "fade" | "slide" | "zoom";

/** courseSettings.blockEntranceAnimation (schema). */
export type CourseEntranceSetting = EntranceKind;

/** Per-block settings.entranceAnimation (schema; absent means inherit). */
export type BlockEntranceOverride = "inherit" | EntranceKind;

/** Transition duration, Rise `--scroll-animation-duration` default. */
export const ENTRANCE_DURATION_S = 1;

/** Transition easing for both opacity and transform. */
export const ENTRANCE_EASING = "ease-out";

/** Base transition delay, Rise `--scroll-animation-base-delay`. */
export const ENTRANCE_BASE_DELAY_S = 0.12;

/** Per-child stagger increment, Rise `calc(0.12s + var(--idx) * 0.15s)`. */
export const ENTRANCE_STAGGER_S = 0.15;

/** Force-reveal timer, Rise `WY = 1e3`. */
export const ENTRANCE_FALLBACK_MS = 1000;

/** IntersectionObserver rootMargin, Rise `"2% 0px 2% 0px"`. */
export const ENTRANCE_ROOT_MARGIN = "2% 0px";

/**
 * Pure resolution of the effective entrance for one block: an absent or
 * `inherit` block override falls back to the course setting; any explicit
 * override (including `none`) wins. Reduced motion is the caller's concern
 * (the Player passes kind "none" when the media query matches).
 */
export function resolveEntranceKind(
  courseSetting: CourseEntranceSetting,
  blockOverride?: BlockEntranceOverride,
): EntranceKind {
  if (blockOverride === undefined || blockOverride === "inherit") {
    return courseSetting;
  }
  return blockOverride;
}

/**
 * transition-delay in seconds for the idx-th block of a revealing batch
 * (Rise writes `--idx` per child in DOM order; batches reset the index).
 */
export function entranceDelaySeconds(indexWithinBatch: number): number {
  const idx = Math.max(0, Math.floor(indexWithinBatch));
  return (
    Math.round((ENTRANCE_BASE_DELAY_S + idx * ENTRANCE_STAGGER_S) * 100) / 100
  );
}
