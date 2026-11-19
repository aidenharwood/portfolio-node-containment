# Client Scenery and Editor Land Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw the land that lies in no district (sea, bay, mountains, fells) and the land past each edge of the plan. Show the whole land on the minimap and the world map without labels doubling up in split squares. Give the editor a land layer that draws the land plan across squares, re-cuts every square an edit touches, and saves the plan file.

**Architecture:** A level with land gets a second, drawing-only layout: `ResolvedLevel.scene` (`world/landScene.ts`). Inside the plan it shows a district's tile where one is placed and the land's tile everywhere else. Past the plan's edges it repeats the nearest edge tile for `LAND_MARGIN` tiles. The client draws, maps and picks from `scene`. Walkability still comes only from `layout` through the walkability grid, so the server and pathfinding stay as they are. Wherever the code mapped a tile to a district by rectangle, it now goes by the tiles the district owns (`world/districtFootprint.ts`). Land plans become content (`content/land/*.json`, `GameContent.lands`, `LevelContext.landOf`), so the editor can swap in an edited plan the same way it swaps in an edited district. The editor gets a `land:<id>` scope, land tools, step editing, undo shared with district edits, and `POST /__editor/land/:id`.

**Tech Stack:** TypeScript (erasable only) on Node 24, zod 3, Three.js, Vite, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-19-hinterland-atlas-design.md` (sections "Squares", "Land with no district" and "Editor", build order steps 2 and 3). Handoff: `docs/handoffs/2026-11-19-land-plan-engine.md`. Previous plan: `docs/superpowers/plans/2026-11-19-land-plan-engine.md`.

## Global Constraints

- No code comments. Erasable TypeScript only: no `enum`, `namespace` or parameter properties. Imports use `.ts` extensions.
- `npm run typecheck` and `npm test` pass at the end of every task.
- **The shipped game does not change in this plan.** No shipped level gets `land`, so the overworld, the server and `bench:tick` behave exactly as before. The Hinterland plan file is added as open sea and is used by no level until build order step 4.
- `scene` is for drawing, maps and picking only. Nothing that decides where a character may stand, what is safe, or which district or area a tile is in may read it. Those keep reading `layout` and `layout.districtAt`.
- Land plan coordinates are level tile coordinates, with no offset. `placeLandSquares` puts square `(column, row)` at `column × squareSize, row × squareSize`, and `findLandIssues` already reads the land at level coordinates. Step 4 pins the joined Low Ward so that Terminus Square's origin is (128, 320) on the land, not the other way round.
- Ids are forever. Do not rename any district, area or instance id.
- Other sessions are working in this folder. Stage files by name only. Never stage the HUD files under `packages/client/src/hud`, `screens` or `styles` unless this plan changed them (Task 7 changes `hud/minimap.ts` and `hud/worldMap.ts`: before staging them, check with `git diff` that every hunk is yours). Never stage `scripts/_ids.ts`, `scripts/_ascii.ts`, `.claude/launch.json`, `.claude/settings.json` or `docs/handoffs/2026-11-18-ui-audit.md`.
- Commit messages are plain sentences in the project's style and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions this plan makes

- **One drawing layout, not a second render pass.** Drawing land as the scene's fallback tile means the voxel builder, liquid surface, sky mask, floor scatter, minimap and world map need no land code of their own. They get a layout with more tiles in it.
- **Past the edge, the nearest edge tile repeats** (tile and height) for `LAND_MARGIN = CHUNK_SIZE` tiles. The spec closes every edge with land that matches what lies beyond it (sea past the west and south, fells past the north, mountains past the north-east, ash fells past the east), so repeating the edge draws the right thing without new data. Walkable land never meets the edge (`findLandPlanIssues`), so a player is always at least one chunk from the margin's outer edge, and `BUILD_RADIUS` (1 chunk) never builds past it. Distant views are the far view's job (build order step 6).
- **Maps paint the plan only, not the margin.**
- **Footprints, not rectangles.** A district's footprint is the bounding box of the tiles it owns, plus a label point: the walkable tile it owns nearest that box's centre. World map labels, region labels, objective outlines, the editor's room outlines, `enterArea` goals and wall-light mounts use footprints or ownership. `PlacedDistrict.rect` stays as the placement rectangle for origin arithmetic.
- **A land plan is content.** Each `content/land/<id>.json` is drawn once into `GAME_CONTENT.lands`. Recipes ask `context.landOf(id)`, as they ask `context.districtOf(id)`. The fixture switches to this too.
- **Land edits apply on release.** `drawLand` takes 25 to 40 ms on a full 768 × 640 plan. Dragging a vertex or shape shows a ghost outline and redraws the land once, on pointer up.
- **An edit re-cuts only the squares whose window changed** (`changedSquares`), comparing tiles, heights and wards per square.
- **Saving land is refused while any square cut from it fails to build.** The game builds every district at load, so a plan that breaks a square would stop the game starting.
- **Undo is one stack across districts and land**, so undo after a land edit and then a district edit takes the district edit back first.

## Review Focus

- **A district wall beside land.** Wall and kerb seams in `levelVoxels.ts` treat a `void` neighbour as the outside. Next to land the neighbour is now water, grass or rock. Expected: a district's outer fence looks the same beside sea as it did beside void, and a building wall is not given a kerb because there is grass beyond it. Check the fixture's 3D preview and the starter plan in the editor (Task 13).
- **Split-square land in neither half.** Land whose ward matches neither district in a split square is void in both. Expected: the scene shows it as land, and `findLandIssues` already reports it if it is walkable. Test in Task 1.
- **A player at the margin.** Expected: the chunks built around a player standing on the plan's outermost walkable tile all lie inside the margin, so nothing past it is ever black. Test in Task 5.
- **`enterArea` in a split square.** Both districts' `ground` areas have the same rectangle. Expected: the goal is a walkable tile the area's own district owns, never one on the sibling's side. Test in Task 2.
- **A land edit that breaks a square** (a cliff under a placement, a ward border moved across an anchor). Expected: the editor shows that district's build error and the plan's issues, keeps working, and refuses to save the land until it is fixed. Tests in Tasks 9 and 12.
- **Undo across land and districts.** Expected: interleaved edits undo in reverse order, and undoing a land edit re-cuts the squares it touched. Test in Task 9.
- **The foreign-anchor cache.** Expected: after a land edit, an anchor resolved from another land square is worked out again from the new land, not served from the cache. Test in Task 4.

---

### Task 1: The scene layout

Give a level with land a drawing layout that shows the land wherever no district is placed, and the edge tiles repeated past the plan.

**Files:**
- Create: `packages/shared/src/world/landScene.ts`
- Modify: `packages/shared/src/world/levelLayout.ts` (`ResolvedLevel.scene`), `packages/shared/src/index.ts`
- Test: `packages/shared/test/landScene.test.ts`

**Interfaces:**
- `export const LAND_MARGIN = CHUNK_SIZE`.
- `export interface SceneLayout extends TileLayout { readonly bounds: TileRect }`. `width` and `height` cover the layout and the land together. `bounds` is where the scene may be drawn: `{ x: 0, y: 0, width, height }` without land, grown by `LAND_MARGIN` on every side with land.
- `export function sceneOf(layout: TileLayout, land?: LandMap): SceneLayout`. Without land it returns `layout` with `bounds` added and nothing else changed. With land, `tileAt` and `heightAt` give the layout's tile and height wherever the layout's tile is not `void`. Elsewhere inside the plan they give the land's tile and height. Past the plan they give the land's at that point clamped to the plan. Outside `bounds`, `tileAt` is `void` and `heightAt` is 0.
- `ResolvedLevel.scene: SceneLayout`, made in `resolveLevel` from `layout` and `definition.land`.

- [ ] **Step 1: Write the failing tests.** On `FIXTURE_WILDS` (resolved from `FIXTURE_CONTENT.levels`) and on small hand-drawn plans:
  - A level without land: `scene.tileAt` and `scene.heightAt` equal `layout`'s at every tile, and `bounds` is the layout's size.
  - A tile a district owns shows the district's tile, even where the land under it differs (paint the fixture's outpost floor over grass and check it).
  - A plan whose west half is water, with one square placed on the east half: tiles in the west half show `water` and the land's height.
  - Split square: a plan where a third ward's land crosses square 1, but only `fx-home` and `fx-far` halves are placed. Those tiles are `void` in `layout` and show the land's tile in `scene`.
  - Past the edge: `(−1, 5)` shows the land's `(0, 5)`, `(−LAND_MARGIN, −LAND_MARGIN)` shows `(0, 0)`, and `(width + LAND_MARGIN − 1, 3)` shows `(width − 1, 3)`, tile and height. `(−LAND_MARGIN − 1, 0)` is `void`.
  - A land wider than its placed squares: `width` and `height` are the land's.
  - `bounds` with land is `{ x: −32, y: −32, width: width + 64, height: height + 64 }`.
- [ ] **Step 2: Run** `node --test packages/shared/test/landScene.test.ts`. Expected: FAIL, the module does not exist.
- [ ] **Step 3: Implement** `landScene.ts`, add `scene`, and export `LAND_MARGIN`, `SceneLayout` and `sceneOf` from `index.ts`. Read no tile into a new array: `sceneOf` composes `tileAt` and `heightAt`, so it costs nothing on the server, which never calls it.
- [ ] **Step 4: Run** the new test, then `npm run typecheck` and `npm test`. Expected: PASS. Fix every place that builds a `ResolvedLevel` by hand (search the tests and `packages/client/src/editor` for `ambienceAt:`).
- [ ] **Step 5: Commit** "Give a level with land a scene layout that draws the land around its districts".

### Task 2: District footprints and area goals

Stop mapping tiles to districts by rectangle where split squares make the rectangles overlap.

**Files:**
- Create: `packages/shared/src/world/districtFootprint.ts`
- Modify: `packages/shared/src/quests/questRoute.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/test/districtFootprint.test.ts`, `packages/shared/test/questHandholding.test.ts` (where `routeGoals` is tested today)

**Interfaces:**
- `export interface DistrictFootprint { readonly districtId: DistrictId; readonly bounds: TileRect; readonly label: TilePoint; readonly tiles: number }`. `bounds` is the bounding box of the tiles `layout.districtAt` gives the district. `label` is the walkable tile it owns nearest the centre of `bounds`, ties broken by smaller `y`, then smaller `x`. If it owns no walkable tile, `label` is the owned tile nearest the centre. `tiles` is how many it owns.
- `export function footprintsOf(level: Pick<ResolvedLevel, 'layout' | 'districts'>): ReadonlyMap<DistrictId, DistrictFootprint>`. It is memoised per `layout` object in a `WeakMap` and scans each placement's rectangle once.
- `export function areaGoal(level: Pick<ResolvedLevel, 'layout'>, area: ResolvedArea): TilePoint`: the walkable tile in `area.rect` that `area.districtId` owns, nearest the rectangle's centre, ties broken as above. If there is none, the rectangle's centre as today.
- `RouteScene.level` becomes `Pick<ResolvedLevel, 'areas' | 'npcs' | 'objects' | 'creatures' | 'layout'>`. The `enterArea` case returns `areaGoal` for each matching area.

- [ ] **Step 1: Write the failing tests.**
  - `footprintsOf(FIXTURE_WILDS)`: `fx-wild-gate-west` and `fx-wild-gate-east` have the same placement rectangle but bounds that do not overlap. Each one's `label` is a walkable tile it owns. `fx-wild-west`'s bounds are its whole square.
  - A district placed alone, owning every tile in its rectangle: `bounds` equals the rectangle, `label` is its centre.
  - `footprintsOf` returns the same map object when called twice on the same level.
  - `areaGoal` for `fx-wild-gate-east`'s `ground` area is a tile the east half owns, though the rectangle's centre is on the west half's side. Do the same for the west half.
  - `routeGoals` for an `enterArea` objective on `fx-wild-gate-east`'s `ground` area gives that point.
  - An existing `enterArea` goal on the shipped overworld (`novice`'s `home-gale`) is unchanged, because that area's centre is already walkable and owned.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** both functions and the `RouteScene` change. Fix every `RouteScene` built in the client (`packages/client/src/state/guidanceRoute.ts` and its tests) to pass `layout`.
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Find a district's footprint and an area's goal by the tiles the district owns".

### Task 3: Land plans as content

Load land plans from JSON files so the editor can swap one out, and let recipes ask for them by id.

**Files:**
- Create: `packages/shared/src/content/land/index.ts`, `packages/shared/src/content/land/hinterland.json`, `packages/shared/src/world/printLandPlan.ts`, `packages/shared/test/landFiles.test.ts`
- Modify: `packages/shared/src/world/level.ts` (`LevelContext.landOf`), `packages/shared/src/content/levels/shippedContext.ts`, `packages/shared/src/content/gameContent.ts` (`lands`), `packages/shared/src/content/landIntegrity.ts`, `packages/shared/test/fixtures/world/index.ts`, `packages/shared/test/fixtures/world/wilds.ts`, `packages/client/src/editor/contentWith.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/test/landFiles.test.ts`, `packages/shared/test/landSquares.test.ts`, `packages/client/test/contentWith.test.ts`

**Interfaces:**
- `content/land/index.ts` exports `LAND_SOURCES: Readonly<Record<string, unknown>>`, imported `with { type: 'json' }` as `layouts/index.ts` does.
- `hinterland.json`: `{ id: 'hinterland', squareSize: 64, columns: 12, rows: 10, steps: [one fill of the whole plan with water] }`. It is the Hinterland's starting sea. Build order step 4 draws the land on it.
- `printLandPlan(plan: LandPlan): string`: canonical JSON in the style of `printLayout`: top-level keys in schema order, one step per line under `steps`, and a trailing newline. `parseLandPlan(JSON.parse(printLandPlan(plan)))` equals `plan`.
- `LevelContext.landOf(id: string): LandMap`. It throws `There is no land plan "<id>".` for an unknown id.
- `GameContent.lands: ReadonlyMap<string, LandMap>`, drawn from `LAND_SOURCES`.
- `findLandIssues` also runs `findLandPlanIssues` on every plan in `content.lands` that no level uses, prefixed `land <id>: `, so a plan is checked before step 4 puts it in a level. While in that file, move `isWalkableTile` out of `furnishingIntegrity.ts` into `world/tiles.ts` as an export, and make `isWalkableLand` call it (the handoff's small item).
- The fixture: `FIXTURE_LAND_PLAN` stays the source. `FIXTURE_CONTEXT.landOf('fx-land')` returns `FIXTURE_LAND`, `FIXTURE_CONTENT.lands` holds it, and `wildsRecipe` reads `context.landOf('fx-land')`.
- `contentWith(base, edited, recipes, shippedHollowOf, editedLands: ReadonlyMap<string, LandMap> = new Map())`. Its context's `landOf` serves the edited land first, then `base.lands`. It returns `lands` merged the same way. With no edited districts and no edited lands it still returns `base`.

- [ ] **Step 1: Write the failing tests.**
  - `landFiles.test.ts`: every file in `LAND_SOURCES` parses, its `id` matches its file name, `printLandPlan` of it equals the file's text byte for byte, and it draws.
  - `printLandPlan` round-trips the fixture plan, and it fails on an even line width with the schema's message.
  - `findContentIssues(GAME_CONTENT)` is empty with `hinterland` in it. A plan in `lands` with walkable land on its edge, used by no level, is reported as `land <id>: walkable land at …`.
  - `FIXTURE_CONTEXT.landOf('nowhere')` throws the message above.
  - `contentWith` with one edited land whose west square is now water: `fx-wilds`'s level shows water there in `scene`, and `lands.get('fx-land')` is the edited map.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Write `hinterland.json` with `printLandPlan`, not by hand.
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS, and the test count grows by the new tests only.
- [ ] **Step 5: Commit** "Load land plans as content and let level recipes ask for them by id".

### Task 4: Changed squares and a fresh anchor cache

Tell which squares an edit touched, and stop serving anchors worked out on old land.

**Files:**
- Modify: `packages/shared/src/world/landPlan.ts`, `packages/shared/src/world/layout.ts`
- Test: `packages/shared/test/landPlan.test.ts`, `packages/shared/test/landSquares.test.ts`

**Interfaces:**
- `export function changedSquares(before: LandMap, after: LandMap): LandSquare[]`: every square, west to east, then north to south, where any tile, height or ward differs. If the two plans differ in `squareSize`, `columns` or `rows`, every square of `after`.
- The cache behind `foreignAnchor` becomes a `WeakMap<LandMap, Map<string, TilePoint>>` plus one map for districts without land, keyed by `districtId:name`. A new `LandMap` starts with an empty cache.

- [ ] **Step 1: Write the failing tests.**
  - `changedSquares` of the fixture land against itself is empty.
  - A rise drawn inside square 2 only: `[{ column: 2, row: 0 }]`.
  - A water line crossing squares 0 and 1: both, in order.
  - A ward shape moved but tiles unchanged: the squares whose wards changed.
  - A plan with one more column: every square of the new plan.
  - The anchor cache: build `fx-wild-gate-west` with a `recovery` naming `fx-wild-west`'s `start`, against the fixture land. Redraw the land with a rock across `start` and an anchor that moves with it. Build again with the new land. The recovery point follows the new land.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** both.
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Find the squares a land edit changed and key foreign anchors by the land they were found on".

### Task 5: The client draws the scene

Let the 3D view build chunks from the scene, including chunks past the plan's edges.

**Files:**
- Modify: `packages/client/src/state/worldState.ts` (`ActiveZone`), `packages/client/src/render/world/chunkView.ts` (`chunkRegion`, `hasStructure`), `packages/client/src/render/world/levelScene.ts`, `packages/client/src/render/world/chunkSignature.ts`, `packages/client/src/editor/previewLevel.ts`
- Test: `packages/client/test/chunkSignature.test.ts`, a new `packages/client/test/chunkRegion.test.ts`

**Interfaces:**
- `ActiveZone.layout` becomes `SceneLayout` and is set to `definition.scene`. `grid` is still built from `definition.layout`, so walking, clicking a tile to walk and door handling do not change.
- `chunkRegion(chunk, zone)` returns the part of the chunk inside `zone.layout.bounds`, or `null` when there is none. Chunk coordinates may be negative.
- Anything in `render/` that reads `zone.layout` now reads the scene. Do not change any `render/` code that decides walkability. Search for `walkable` under `render/` and `input/`, and make each one read `zone.grid` or `zone.definition.layout` if it reads `zone.layout` today.

- [ ] **Step 1: Write the failing tests.**
  - `chunkRegion` on a zone made from `FIXTURE_WILDS` (use `zoneOfLevel` with `FIXTURE_CONTENT`): `{ cx: −1, cy: −1 }` is `{ x: −32, y: −32, width: 32, height: 32 }`. `{ cx: −2, cy: 0 }` is `null`. `{ cx: 4, cy: 0 }` (the margin east of a 128-tile plan) is a full chunk.
  - On a level without land, `{ cx: −1, cy: 0 }` is still `null`, as today.
  - The fixture's outermost walkable tile: every chunk within `BUILD_RADIUS` of it has a region. Export `BUILD_RADIUS` from `levelScene.ts` for the test.
  - `chunkSignature` of a chunk wholly in the margin is the same before and after a district edit that is elsewhere.
- [ ] **Step 2: Run** `node --test packages/client/test/chunkRegion.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Keep `hasStructure` as it is: it now sees land, so chunks of open sea are built.
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Build chunks from the scene so the land around and past a level's districts is drawn".

### Task 6: Seams and lights beside land

Keep district edges looking as they did when their neighbour was void, and keep wall lights on their own district's side.

**Files:**
- Modify: `packages/client/src/render/world/levelVoxels.ts`, `packages/client/src/render/world/wallLights.ts`
- Test: `packages/client/test/terrain.test.ts` (or a new `levelVoxels.test.ts` if the seam helpers are easier to test alone), a new `packages/client/test/wallLights.test.ts`

**Interfaces:**
- `levelVoxels.ts` takes an `ownerAt(point): string | undefined` alongside the layout (from `definition.layout.districtAt`, or `connectorAt`), or reads it through the zone. Wherever it treats a `void` neighbour as the outside (the checks near `neighbor === 'void'` around lines 188, 412 and 523 today), it also treats a neighbour that no district or connector owns as the outside. Earth under a raised tile still drops to the neighbour's real height (`paintEarth`), so a cliff into the sea is drawn down to the water.
- `mountsIn` in `wallLights.ts` skips a floor tile that the area's district does not own.

- [ ] **Step 1: Write the failing tests.**
  - The seam helper for a fence tile whose east neighbour is land water with no owner gives the same seams as when that neighbour was `void`.
  - A raised land-square tile beside lower land water: `paintEarth` fills down to the water's height, not 0.
  - `planWallLighting` on `FIXTURE_WILDS` with a building in each half of the split square: every sconce for an area stands on a tile that area's district owns.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Treat land no district owns as the outside at district edges, and mount wall lights on their own district's side".

### Task 7: The maps show the whole land

**Files:**
- Create: `packages/client/src/hud/mapLabels.ts`
- Modify: `packages/client/src/hud/minimap.ts`, `packages/client/src/hud/worldMap.ts`, `packages/client/src/editor/levelView.ts`
- Test: a new `packages/client/test/mapLabels.test.ts`, `packages/client/test/levelView.test.ts`

**Interfaces:**
- `mapLabels.ts`:
  - `regionLabels(level, content): { regionId: RegionId; x: number; y: number }[]`: for each region, the centre-top of the union of its districts' footprint bounds.
  - `districtLabels(level): { districtId: DistrictId; at: TilePoint; bounds: TileRect }[]`: each district's footprint label and bounds.
- `minimap.ts` and `worldMap.ts` paint `level.scene` (the zone's `layout` for the minimap) over `0 … width`, `0 … height`, not the margin. Land that no district owns is painted in its tile's colour, using the existing map colours for water, rock and the cover tiles, and is never tinted as an objective.
- The world map places district labels at `at`, decides whether a label fits by `bounds.width`, and outlines a tracked objective's `bounds`.
- In the editor, `levelPlan`'s `rooms` outline per district uses footprint bounds, and `tileImageOf` paints `level.scene`.

- [ ] **Step 1: Write the failing tests.**
  - `districtLabels(FIXTURE_WILDS)`: the two halves of the split square have different `at` points, each on a walkable tile the district owns.
  - `regionLabels` on `FIXTURE_WILDS`: `fx-home` and `fx-far` each get one label, and `fx-home`'s is west of `fx-far`'s.
  - On the shipped overworld, `districtLabels` gives every district `at` inside its placement rectangle and `bounds` equal to it wherever the district owns every edge tile. This guards against moving labels that look right today.
  - `tileImageOf` of a level with land paints land with no district (a water pixel west of the fixture's field).
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS. Before staging `minimap.ts` and `worldMap.ts`, check with `git diff` that every hunk in them is yours.
- [ ] **Step 5: Commit** "Paint the whole land on the maps and label districts by the tiles they own".

### Task 8: The land scope in the editor

Open a land plan on its own in the editor, before any square is cut from it.

**Files:**
- Modify: `packages/client/src/editor/viewState.ts`, `packages/client/src/editor/previewLevel.ts`, `packages/client/src/editor/viewer.ts`, `packages/client/src/editor/levelView.ts`, `packages/client/src/editor/planCanvas.ts`
- Test: `packages/client/test/viewState.test.ts`, `packages/client/test/levelView.test.ts`, `packages/client/test/previewView.test.ts`

**Interfaces:**
- `ViewState.land?: string`, read and written as `?land=<id>`, accepted only for ids in `content.lands`. `level` and `land` are exclusive. `level` wins if a URL gives both.
- `PLAN_LAYERS` gains `'land'` (the land's steps as outlines) and `'squares'` (the square grid, with each square labelled by the district cut from it, or by `column,row` where there is none).
- `landLevel(land: LandMap, id: string): ResolvedLevel` in `previewLevel.ts`: a level with no districts, objects or areas. Its `layout` is all `void`, `districtAt` is always `undefined`, its `scene` is `sceneOf(layout, land)`, and its spawn is the plan's centre. `ambienceAt` returns a fixed outdoor ambience.
- The scope picker gets a "Land" group listing `content.lands`. In land scope, the plan canvas shows the land image and the `land` and `squares` layers, the 3D view shows the land, and the district tools are hidden.
- A level scope whose `definition.land` is set shows the same two layers over its districts.

- [ ] **Step 1: Write the failing tests.**
  - `readViewState('?land=hinterland', …)` gives `land: 'hinterland'`. An unknown id is dropped. Both `level` and `land` given keeps `level`.
  - `writeViewState` round-trips `land`.
  - `landLevel(FIXTURE_LAND, 'fx-land')`: `scene.tileAt` matches the land everywhere inside the plan, `layout.tileAt` is `void` everywhere, and `zoneOfLevel` builds a grid with no walkable tile.
  - `levelPlan` with the `land` layer on `FIXTURE_WILDS` gives one outline per drawn step (a polygon's points, a line's points, a shape's rect, a gate's rect), and the `squares` layer gives one cell per square, labelled by its district.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** `PlanShape` may need `polygon` and `polyline` kinds. Add them to `planCanvas.ts`'s draw list and renderer.
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Open a land plan on its own in the editor and show its steps and squares on the plan".

### Task 9: The editor document holds land

**Files:**
- Modify: `packages/client/src/editor/document.ts`, `packages/client/src/editor/viewer.ts`
- Test: `packages/client/test/document.test.ts`

**Interfaces:**
- `EditorDocument` takes `landSources: Readonly<Record<string, unknown>>` (default `LAND_SOURCES`) beside the layout sources.
  - `landPlan(id): LandPlan` and `land(id): LandMap`, parsed and drawn on first use.
  - `applyLand(id, edit: (plan: LandPlan) => LandEditResult): LandEditResult`. On success it pushes `{ kind: 'land', id, plan: before }` onto the shared undo stack, draws the new land, and rebuilds every district whose square is in `changedSquares(old, new)`. It notifies listeners with `{ kind: 'land', id }` and then with each rebuilt district's id.
  - A district's land is `landOfDistrict(id)`: the land of the level `content.levelOfDistrict` puts it in, read through `land(id)` so edits apply. Districts with no level, and levels without land, build without land as today.
  - `isLandDirty(id)`, `dirtyLands()`, `markLandSaved(id, plan)`.
  - `undo`/`redo` handle both snapshot kinds. Undoing a land edit re-cuts the squares that edit changed.
  - `editedLands(): ReadonlyMap<string, LandMap>` for `contentWith`.
- `onChange` listeners receive `{ kind: 'district' | 'land'; id: string }`. Update the viewer's listener.

- [ ] **Step 1: Write the failing tests** (on the fixture content and sources):
  - `applyLand` that turns square 0's field to water rebuilds `fx-wild-west` and no other district, and its new map shows water.
  - `applyLand` that changes nothing in any square (a gate id renamed in a square with no gate placement) rebuilds no district.
  - A land edit that puts rock under `fx-wild-west`'s crate: `buildError('fx-wild-west')` names the crate's path. The land edit still applies, and undo clears the error.
  - Interleaved: land edit, district edit, land edit. Three undos restore all three in reverse order, and redo replays them.
  - `isLandDirty` is false after undoing back to the saved plan.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** In the viewer, pass `document.editedLands()` to `contentWith`.
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Hold land plans in the editor document and re-cut the squares a land edit changes".

### Task 10: Land edits

Pure functions over a `LandPlan`, each checked by parsing and drawing, as `edits.ts` does for layouts.

**Files:**
- Create: `packages/client/src/editor/landEdits.ts`
- Test: `packages/client/test/landEdits.test.ts`

**Interfaces:**
- `export type LandEditResult = { readonly ok: true; readonly plan: LandPlan } | { readonly ok: false; readonly error: string }`.
- `addStep(plan, step, at = plan.steps.length)`, `replaceStep(plan, index, step)`, `removeStep(plan, index)`, `moveStep(plan, from, to)`.
- `moveVertex(plan, index, vertex, to: TilePoint)`, `insertVertex(plan, index, after, point)` and `removeVertex(plan, index, vertex)` for a polygon shape (`fill`, `rise`, `ward`) or a `line`.
- `moveStepBy(plan, index, by: TilePoint)` for any step: shapes, lines, ramps and gates.
- `resizeStep(plan, index, rect: TileRect)` for rect, round and octagon shapes, ramps and gates.
- Each result is checked with `parseLandPlan` and `drawLand`. A failure returns the thrown message. A polygon may not drop below 3 points, nor a line below 2.

- [ ] **Step 1: Write the failing tests:** each function on the fixture plan, its refusals (out-of-range index, a polygon left with 2 points, an even line width through `replaceStep`, a gate named twice, a ramp too steep for its rect), and that the input plan is never mutated (freeze it deeply in the test).
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Add pure land plan edits checked by drawing the plan".

### Task 11: Land tools

Draw and reshape land on the 2D plan.

**Files:**
- Modify: `packages/client/src/editor/editController.ts`, `packages/client/src/editor/hitTest.ts`, `packages/client/src/editor/editOverlay.ts`, `packages/client/src/editor/propertiesPanel.ts`, `packages/client/src/editor/palette.ts`, `packages/client/src/editor/viewer.ts`
- Test: `packages/client/test/editController.test.ts`, `packages/client/test/hitTest.test.ts`

**Interfaces:**
- `Tool` gains `'land'`, available only when the scope has land (land scope, or a level with land). Key `L`.
- `EditController.landBrush: { readonly step: LandStep['kind']; readonly shape: 'polygon' | RoomShape; readonly tile: TileKindId; readonly height: number; readonly width: number; readonly ward: RegionId; readonly side: ExitSide; readonly gate: string }`, set from a land palette: step kind, shape, tile, height, line width (odd numbers only), ward (the regions in content) and ramp side.
- Drawing:
  - A polygon (`fill`, `rise`, `ward` with shape `polygon`) and a `line` are drawn by clicking points. Enter or a double click finishes, and Escape cancels. A polygon's points snap to tile corners and a line's to tile centres, as the engine reads them.
  - Rect, round and octagon shapes, `ramp` and `gate` are drawn by dragging a rectangle.
  - Each finished drawing is one `addStep` through `document.applyLand`.
- Selecting: in the `land` layer, a click selects the topmost step whose outline is under the pointer (`hitTest` gains `{ kind: 'landStep'; index }` and `{ kind: 'landVertex'; index; vertex }`). A selected step shows its vertices or rect handles.
  - Dragging a vertex, a handle or the step's body shows a ghost and applies `moveVertex`, `resizeStep` or `moveStepBy` on release.
  - Alt-click on an edge inserts a vertex, and Delete on a selected vertex removes it.
- The properties panel, for a selected step, edits its fields (`replaceStep`) and lists every step in order. Up and down buttons call `moveStep`, and a remove button calls `removeStep`. Selecting a row selects the step.
- A refused edit shows its error in the status line, as district edits do.

- [ ] **Step 1: Write the failing tests** in `editController.test.ts`, driving the controller with tile clicks as the existing tests do:
  - Three clicks and Enter add one polygon `fill` with those corners and the brush tile.
  - Two clicks and Enter with width 3 add a `line`.
  - A drag adds a `round` `rise` with the dragged rect and the brush height.
  - Escape after two clicks adds nothing.
  - Dragging a selected polygon's vertex moves only that vertex, in one undo step.
  - Selecting a step and changing its tile in the panel model calls `replaceStep`.
  - In a district scope, `L` does not select the land tool.
  - `hitTest` picks the later of two overlapping steps, and a vertex over a step body.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Draw, select and reshape land plan steps on the editor's plan".

### Task 12: Saving land

**Files:**
- Modify: `packages/client/editorSave.ts`, `packages/client/vite.config.ts` (if the land root must be passed in), `packages/client/src/editor/saveClient.ts`, `packages/client/src/editor/viewer.ts`
- Test: `packages/client/test/editorSave.test.ts`

**Interfaces:**
- `saveLand(landRoot: string, layoutRoot: string, landId: string, body: string): SaveResult`. It refuses: an id that is not kebab-case (400), a land with no file (404), invalid JSON, a plan that fails `parseLandPlan` or `drawLand`, a body whose `id` is not `landId` (422), and a plan under which any layout file in `layoutRoot` naming a `square` fails `buildDistrict(layout, land)` (422, with that district's error). Only layouts whose level uses this land count: in this plan, every layout with a `square` is in a level with this land, because there is one land per overworld. Note this in ARCHITECTURE (Task 13). Otherwise it writes `printLandPlan(plan)`.
- The plugin also routes `POST /__editor/land/:id` to `saveLand` and records the write so hot reload skips it.
- `saveLand(id, plan)` in `saveClient.ts`. The Save button saves dirty lands first, then dirty districts, and stops at the first failure with its message.

- [ ] **Step 1: Write the failing tests** in `editorSave.test.ts`, in a temporary directory as the layout tests do: a good save writes the printed plan; each refusal gives its status and leaves the file unchanged. One refusal is a plan that turns a square's crate tile to rock.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Save land plans from the editor, refusing a plan that breaks a square cut from it".

### Task 13: Docs, a look in the browser and the handoff

**Files:**
- Modify: `ARCHITECTURE.md` (Levels and districts, Regions and the overworld, Client rendering), `WORLD_DESIGN.md` (Authoring), `CONTRIBUTING.md` (Add a district: land squares and the land layer)
- Create: `docs/handoffs/2026-11-19-scenery-and-land-editor.md` (or the date it is written)

- [ ] **Step 1: Docs.**
  - ARCHITECTURE: the scene layout and what may and may not read it. Footprints instead of rectangles. Land plans as content and `LevelContext.landOf`. The editor's land scope, land edits, re-cutting and saving rules.
  - WORLD_DESIGN, Authoring: land is drawn in the editor's land layer and saved to `content/land/<id>.json`, never typed as tiles. Close each edge of the plan with land that matches what lies beyond it, because the margin repeats the edge.
  - CONTRIBUTING: how to cut a new land square.
- [ ] **Step 2: Look at it.** Run `npm run dev`, open the editor, pick Land → hinterland, and draw a coast polygon, a river line, a round rise with a ramp, a ward and a gate. Check that:
  - the 3D view shows sea, land, the cliff at the rise and the margin past the edge;
  - undo and redo work;
  - saving writes `hinterland.json`, and a reload shows the same land.

  Then revert `hinterland.json` to the starting sea (`git checkout` that one file, after checking that `git diff` shows only your drawing). The real drawing is build order step 4. Report anything that looked wrong, especially the Review Focus items for walls beside land.
- [ ] **Step 3: Run** `npm run typecheck` and `npm test`. Expected: PASS. Record the test count.
- [ ] **Step 4: Write the handoff:** what landed (commits), the decisions above, anything the browser check found, and next steps. Next is build order step 4, drawing the Hinterland. It starts with the open item from the last handoff: build a per-tile safe mask in `LevelInstance` before `bench:tick` on 768 × 640. It also includes the overworld recipe change: Low Ward joined and pinned with `pinPlacements` so Terminus Square's origin is (128, 320), land squares placed by `placeLandSquares`, and the 42 block-out squares replaced.
- [ ] **Step 5: Commit** "Document the scene layout and the editor's land layer, and hand off to drawing the Hinterland", then push.
