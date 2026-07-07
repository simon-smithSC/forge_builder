# Player UX Plan (Learner-Facing)

Authoring parity is done; this plan makes the published package feel like Rise.
Sources: `docs/reference/rise-teardown.md` (cited by line), the real Rise runtime
unzipped from `docs/reference/example-course-xapi.zip` (cited as `rise:lib/rise/...`),
our shipped example package (`example/`), and player sources under
`packages/player/src/`. No code changes accompany this document.

## 1. Current learner experience, honestly

Today's published package (`example/index.html` boots `lib/player.js` from
`window.__FORGE_LAUNCH__`, data in `content/course-data.json`) opens on a plain
centered text cover (title, author, description, lesson count, one button,
`packages/player/src/Cover.tsx`), then a utilitarian shell: a one-line topbar, a
280px flat sidebar list, and a lesson column (`packages/player/src/styles.css`
lines 112-217). It is correct and accessible, but it reads as an internal tool,
not a course. Rise's preview shows a themed sidebar with `0% COMPLETE`, section
labels, `Lesson 1 of 2`, and author attribution (teardown lines 227-240).

Motion is the biggest tell. Rise blocks slide up and fade in individually as
they scroll into view; our player plays one 350ms fade on the whole lesson
article (`Player.tsx` line 362, `styles.css` lines 250-269) and every block is
instantly present. Continue dividers render a button but hide nothing:
`packages/blocks/src/families/divider.tsx` lines 38-48 only fire
`events.onCompleted`, while Rise refuses to even mount blocks below an
unclicked continue (evidence in section 3). So the learner scrolls straight
past our CONTINUE into "later" content, which kills the pacing Rise is known
for (teardown lines 952-976: "Continue button gates progress").

Theme encapsulation is shallow. The theme drives CSS variables
(`chrome.tsx` `themeStyleOf`), but typefaces are bare names with a system
fallback (`styles.css` line 13), `theme.logoMediaId`, lesson `headerImage`,
`searchEnabled`, and `videoPlaybackSpeedControl` are all schema-only
(`packages/schema/src/schemas.ts` lines 1045, 1143, 1083, 1086; zero player
references), and the cover hardcodes the English string "Pick up where you
left off" instead of `labelSet.resumeCourse` (`Cover.tsx` line 36).

## 2. Focus area A: entrance animation

### What Rise actually does (measured)

From `rise:lib/rise/e6486c58.css` (`.scroll-animation` rules) and the runtime
component in `rise:lib/rise/27633c2d.js` (the `QY` component and `KY` map):

- Container class `scroll-animation`; every child starts
  `opacity: 0; transform: var(--scroll-animation-from, translateY(0))`.
- Reveal is a CSS transition, not a keyframe:
  `transition: opacity var(--scroll-animation-duration, 1s) ease-out,
  transform var(--scroll-animation-duration, 1s) ease-out`. Default duration 1s.
- Base delay `--scroll-animation-base-delay: 0.12s`, per-child stagger
  `transition-delay: calc(0.12s + var(--idx) * 0.15s)`; the JS writes `--idx`
  onto each child in DOM order.
- Adding `scroll-animation--in` flips children to `opacity: 1; transform: none`.
- Offset map (`KY` in `27633c2d.js`): `fadeInUp: translateY(25px)`,
  `fadeInGrow: scale(0.95)`, `fadeInLeft: translateX(-50px)`,
  `fadeInLeftSmall: translateX(-25px)`, `fadeInRight: translateX(50px)`.
- Trigger: `IntersectionObserver` with `rootMargin: "2% 0px 2% 0px"`,
  `threshold: 0`, unobserved after first intersection, plus a 1000ms fallback
  timer (`WY = 1e3`) that force-reveals if the element is within 10% of the
  scroll root. `matchMedia("(prefers-reduced-motion: reduce)")` is consulted
  (`ZY`/`Bs` in the same bundle), and an `initiallyVisible` prop suppresses
  animation for content restored on relaunch.

### What we already model vs what the player does

- Schema: `courseSettings.blockEntranceAnimation: none|fade|slide|zoom`
  (`schemas.ts` line 1085, default `fade` line 1345) and per-block
  `settings.entranceAnimation: inherit|none|fade|slide|zoom` (line 803).
- Player today: `blockEntranceAnimation` is reduced to a boolean
  (`Player.tsx` lines 314-315); `fade`, `slide`, `zoom` all render the same
  whole-article `fp-anim-fade` (line 362); the per-block override is ignored
  everywhere (no references outside schema).

### Design

New player-owned wrapper, not BlockView. `BlockView` is the shared band
renderer mounted identically by the editor canvas and the player
(`packages/blocks/src/blockView.tsx` lines 8-17), and the module-identity
contract requires editor and player to import the same renderer objects
(`docs/RISE-PARITY-PLAN.md` line 187, `packages/editor/src/moduleIdentity.test.ts`).
Putting an IntersectionObserver and mode branches inside BlockView would push
player-only behavior into shared code and risk the canvas animating. Instead
`Player.tsx` wraps each `<BlockView>` in a `<PlayerBlock>` div
(`packages/player/src/PlayerBlock.tsx`, new):

- Classes: `fp-enter fp-enter-{fade|slide|zoom}` initially, `fp-enter-in` once
  intersecting. CSS mirrors Rise: start `opacity: 0` with offsets
  `none` (fade), `translateY(25px)` (slide), `scale(0.95)` (zoom);
  `transition: opacity 1s ease-out, transform 1s ease-out;
  transition-delay: calc(0.12s + var(--fp-idx, 0) * 0.15s)`.
- Trigger parity: one IntersectionObserver (`rootMargin: "2% 0px"`,
  `threshold: 0`, unobserve on fire) plus the 1s fallback reveal, so SSR or
  observer-less environments never strand invisible content.
- Effective animation is a pure function, `resolveEntrance(courseSetting,
  blockSetting, prefersReducedMotion)`: block `inherit`/absent falls back to
  the course setting; `none` anywhere or reduced motion yields `none`, which
  renders children visible with no observer. Player already samples the media
  query (`Player.tsx` lines 91-96).
- Resume/relaunch: blocks already consumed at mount render with
  `fp-enter-in` pre-applied (Rise's `initiallyVisible` equivalent), so
  relaunches do not replay a minute of choreography.
- Editor canvas: unchanged; it mounts `BlockView` directly and never sees
  `PlayerBlock`, so authors get a static canvas by construction.

## 3. Focus area B: continue gating

### What Rise does

Rise does not render blocks below an unclicked continue. In
`rise:lib/rise/27633c2d.js`, `Gp(...)` builds the visible list recursively:
it appends blocks until the predicate `tre` hits a `family === "continue"`
block whose item is not complete, then stops; only when the last visible
continue is complete does recursion append the next slice. The continue
button itself can be gated (`nre`): type `completeAll` requires every prior
block complete, `completeBlock` requires the previous block complete;
otherwise a hint row with a `lock-keyhole-light` icon and the default text
"Complete the co[ntent above...]" renders instead (`continue-hint` in the same
bundle). On click the handler marks the step complete, announces "Continued"
via a visually hidden live region, and for a last-block continue moves focus
to the lesson header after 200ms. Newly mounted blocks arrive through the
entrance component (`animateBlockEntrance: !0` around `AJ`), so the reveal IS
the entrance transition from section 2 (1s ease-out, 0.12s + 0.15s stagger).
Teardown confirms behavior: lines 952-976 and 1207.

### What we do

Everything renders (`Player.tsx` lines 370-372 map over all blocks); the
continue divider only marks itself consumed (`divider.tsx` lines 38-48), and
progress math treats it as one gating id among many (`progress.ts`
`consumesByInteraction`, lines 31-34).

### Design: player-side progressive reveal

- Pure function in `progress.ts` (or a sibling `gating.ts`):
  `visibleBlocks(blocks, consumed)` returns the prefix of blocks up to and
  including the first `divider / continue button` whose id is not in the
  consumed set. Multiple continue dividers fall out naturally: consuming gate
  1 exposes content up to gate 2, and so on. Non-continue dividers never gate.
- `Player.tsx` renders `visibleBlocks(currentLesson.blocks, currentConsumed)`
  instead of `currentLesson.blocks`. No renderer changes: `divider.tsx`
  already calls `events.onCompleted(b.id)` in player mode, which flows into
  `markConsumed`, which recomputes the visible list.
- Reveal transition: newly mounted blocks are wrapped in `PlayerBlock`
  (section 2) with batch indexes `--fp-idx: 0..n`, giving the Rise stagger,
  then a `scrollIntoView({ behavior: "smooth", block: "start" })` on the first
  revealed block (behavior `auto` under reduced motion). Announce
  `Continued` via an `aria-live` status node, matching Rise.
- Consumption model interplay: no change to `computeLessonPercent` or
  snapshots (`progress.ts` lines 52-92); hidden blocks are simply unconsumed,
  so lesson percent, sequential `nextBlocked` (`Player.tsx` line 313), and
  xAPI reporting already behave. The scroll-consumption observer
  (`Player.tsx` lines 214-242) must re-attach when the visible set grows;
  add the visible id list to its dependency array so newly mounted
  `[data-block-id]` nodes get observed.
- Resume: `standalone.tsx` `buildResume` (lines 106-131) restores consumed
  ids from the state bitset, so a consumed continue means the content below
  is visible on relaunch, pre-revealed without animation (initiallyVisible
  path). Stale bitsets are already dropped on republish (line 115).
- Editor canvas: untouched; it never uses the Player, so authors see all
  blocks. The editor preview (which mounts the Player) gates like a learner,
  which is the correct preview semantics per teardown lines 262-268.
- Deliberate simplification vs Rise: we ship only Rise's default continue
  type (always clickable); `completeAll`/`completeBlock` button locking is a
  schema addition deferred to R-next (noted in ADR 0004 territory).

## 4. Focus area C: theme encapsulation

- Cover page. Rise ships 12 cover layouts (`.cover--layout-centered`,
  `-centered-image`, `-split-left`, ... in `rise:lib/rise/e6486c58.css`) plus a
  details area (`.cover__details-content-description`, `.cover__author-name`,
  categories, course length). Ours is an unthemed text stack (`Cover.tsx`).
  Target: a hero cover, one layout, using `theme.logoMediaId` (schema line
  1045, currently editor-only via `ThemeEditor.tsx`), accent START button,
  lesson count (`settings.showLessonCount`, already honored, `Cover.tsx` line
  28), and `labelSet.resumeCourse` replacing the hardcoded resume string
  (`Cover.tsx` line 36 vs `schemas.ts` line 1321).
- Typefaces. Rise bundles real fonts (`rise:lib/fonts/` holds Lato2-*.woff,
  Merriweather-*.woff); teardown lines 246-249 show theme-bound Merriweather
  body plus Lato headings. Our theme carries bare names into
  `--forge-body-font` (`chrome.tsx` lines 15-16, `styles.css` line 13). Now:
  curated mapping in `themeStyleOf` from known typeface names to full system
  stacks (for example "Inter" to `Inter, "Helvetica Neue", Arial, sans-serif`;
  "Merriweather" to `Merriweather, Georgia, serif`). R-next: exporter copies
  WOFF2 files into `lib/fonts/` and emits `@font-face` in the published
  `index.html`, matching Rise's approach.
- Accent propagation audit. Rise decorates chrome with the theme color
  (`--color-theme-decorative` on dividers, continue buttons, sidebar
  `.nav-sidebar--accent`). Our audit: focus rings use accent (`styles.css`
  lines 56-60) but sidebar current state, checkmarks, hover tints, quiz
  feedback rail all use `--forge-primary` (lines 183-202, 362). Decide one
  rule: primary for chrome actions, accent for progress and decoration, then
  apply consistently (nav status glyphs, progress text, continue pill).
- Lesson header. Schema `headerImage` (line 1143) has zero player references.
  Rise has a full lesson header band (`.lesson-header-wrap--image`,
  `--accent`, `--tint`, `--dark` variants; `.lesson-header__count` for
  "Lesson n of m", `.lesson-header__author`; teardown lines 236-239). Add an
  `fp-lesson-header` band: counter, title, optional headerImage background
  with overlay, author attribution from `course.author`.
- Contrast. Theme colors are free-form hex (`schemas.ts` theme block, lines
  1036-1047). Primary buttons hardcode white text (`styles.css` line 64);
  compute luminance-based foreground for primary/accent surfaces (same
  auto-contrast approach blocks use for `textColorMode: auto`).
- Page furniture. Rise renders content bands on white inside a page that owns
  background; our `.fp-lesson` caps at 860px (`styles.css` line 215) while the
  Rise divider column is 92rem with responsive padding
  (`.block-divider__wrap`, `rise:lib/rise/e6486c58.css`). Keep our band
  system but set `fp-main` background from `--forge-bg` and let bands paint
  `--forge-surface` where variants demand. Mobile: Rise collapses nav into an
  overlay (`.nav-overlay`, `classic-nav-compact-*` keyframes); our 230px
  squeezed inline sidebar (`styles.css` lines 404-407) should become an
  off-canvas overlay under 720px.

## 5. Additional gaps vs teardown preview section

- Sidebar `% COMPLETE` indicator: teardown line 229; Rise classes
  `.nav-sidebar-header__progress-text/-track/-runner`. We show nothing; we
  already compute `snapshot.percent` (`Player.tsx` line 167).
- Lesson checkmark states: Rise animates completion (`@keyframes
  draw-checkmark`, `.nav-sidebar__outline-item__link--complete`); ours is a
  text "✓" glyph (`SidebarNav.tsx` line 48). Locked uses an emoji padlock.
- "Lesson n of m" positioning: teardown line 237 puts it above the lesson
  title; we never render it (`Player.tsx` lines 364-366).
- Search: `settings.searchEnabled` unused by the player; Rise has
  `.nav-sidebar-header__search-btn/-area` and search result animation
  (`nav-sidebar-result__enter`). Minimum viable: client-side title filter.
- Video playback speed: `settings.videoPlaybackSpeedControl` unused; no
  `playbackRate` reference anywhere in `packages/`.
- Exit/fullscreen chrome: exit link works (`standalone.tsx` line 295); no
  fullscreen affordance; topbar is generic rather than lesson-contextual.
- Example package check: `example/content/course-data.json` sets
  `blockEntranceAnimation: "fade"`, `searchEnabled: true`,
  `videoPlaybackSpeedControl: true`; only the fade (whole-article) has any
  visible effect today.

## 6. Work packages

- U1 ENTRANCE (behavioral + CSS). Goal: Rise-mechanics per-block entrance.
  Files: `packages/player/src/PlayerBlock.tsx` (new), `Player.tsx`,
  `styles.css`, `progress.ts` or new `entrance.ts` for `resolveEntrance`.
  Accept: course setting honored, per-block override honored,
  reduced-motion and editor canvas never animate, 1s ease-out with
  0.12s/0.15s stagger, fallback reveal timer, resume renders pre-visible.
- U2 CONTINUE GATING (behavioral, depends on U1). Goal: progressive reveal.
  Files: `packages/player/src/progress.ts` (visibleBlocks), `Player.tsx`.
  Accept: blocks below unconsumed continue absent from DOM; click reveals
  with staggered entrance plus smooth scroll and live-region announce;
  multiple gates chain; relaunch with consumed gate shows content; scroll
  consumption attaches to revealed blocks; snapshots/xAPI unchanged for
  fully-consumed lessons; editor canvas unaffected.
- U3 THEME SHELL (mostly CSS, some behavioral). Goal: cover hero, lesson
  header band with counter/headerImage/author, accent audit, curated font
  stacks, contrast-safe buttons, resumeCourse label fix, logo on cover.
  Files: `Cover.tsx`, `chrome.tsx`, `Player.tsx`, `styles.css`.
  Accept: every theme field observably changes the shell; headerImage and
  logoMediaId render; no hardcoded learner-visible English.
- U4 SIDEBAR CHROME (behavioral + CSS). Goal: % COMPLETE header, checkmark
  and lock treatments, mobile off-canvas overlay, optional title search
  behind `searchEnabled`. Files: `SidebarNav.tsx`, `Player.tsx`, `styles.css`.
- U5 SETTINGS HONORING (small behavioral). Goal: video playback speed menu
  behind `videoPlaybackSpeedControl` (threaded through RenderContext),
  fullscreen/exit polish. Files: `packages/blocks/src/families/multimedia.tsx`,
  `context.ts`, `Player.tsx`.
- U6 FONT PIPELINE (R-next, exporter). Goal: bundled WOFF2 plus @font-face in
  published packages. Files: `packages/exporter/*`, editor theme picker.

Order: U1, U2, U3, U4, U5, U6. U1/U2/U3 are the owner's three focus areas;
they stay separate packages because U2 depends on U1's wrapper and U3 is
independent, but all three land before U4.

## 7. Verification strategy

SSR smoke cannot see motion. Split verification:

- Headless (unit, vitest): `resolveEntrance` truth table (inherit/none/
  override/reduced-motion); `visibleBlocks` with zero, one, and three
  continue gates, consumed and unconsumed, gate-last-block edge case;
  stagger index assignment for a reveal batch; SSR render asserts gated
  blocks are absent from HTML and that `fp-enter-in` is pre-applied for
  resumed content. jsdom with a mocked IntersectionObserver verifies class
  flip and observer teardown, and that BlockView props are byte-identical
  between editor and player mounts (module-identity stays green).
- Mac eyeball pass (cannot be automated here): actual easing feel, stagger
  rhythm, smooth-scroll on reveal, cover/lesson-header art direction, font
  rendering, mobile overlay. Add rows to `docs/visual-parity-checklist.md`
  in its existing table format:

| Family / variant | Teardown | Expected | Editor | Preview |
|---|---|---|---|---|
| player / block entrance | 240, Rise css scroll-animation | Blocks fade/slide in individually on scroll, 1s ease-out, staggered; canvas static | [ ] | [ ] |
| player / continue gating | 952-976, 1207 | Content below CONTINUE absent until click; reveal animates and scrolls; resume keeps it open | [ ] | [ ] |
| player / cover | 228-239 | Hero cover: logo, title, author, lesson count, accent START, resume label | [ ] | [ ] |
| player / lesson header | 236-239 | "Lesson n of m", title, author, optional headerImage band | [ ] | [ ] |
| player / sidebar progress | 229, 253-258 | % COMPLETE updates live; checkmarks on complete lessons | [ ] | [ ] |
| player / mobile nav | Rise nav-overlay css | Sidebar becomes off-canvas overlay under 720px | [ ] | [ ] |
