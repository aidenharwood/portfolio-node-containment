# Land Plan Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an overworld be drawn as one land plan that 64 × 64 squares are cut from, placed by grid, split between wards, and checked so that wards are sealed except at their gates.

**Architecture:** A land plan is zod-checked data (`world/landSchema.ts`) drawn once by `drawLand` into a `LandMap` (tiles, heights, wards, gates, with cliffs worked out across the whole plan). A district layout that names a `square` is built by `buildDistrict(layout, land)`: `cutSquare` hands `drawBlueprint` a base of that window, and the layout's own steps draw on top. `placeLandSquares` places those districts at `column × size, row × size`, and `LevelDefinition.land` carries the map so the checks and the server can read it. The engine is proved on a small fixture level, `fx-wilds`; no shipped content uses it yet.

**Tech Stack:** TypeScript (erasable only) on Node 24, zod 3, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-19-hinterland-atlas-design.md` (sections "The land plan" and "Checks", build order step 1). Handoff: `docs/handoffs/2026-11-19-hinterland-atlas-plan.md`.

## Global Constraints

- No code comments. Erasable TypeScript only: no `enum`, `namespace` or parameter properties. Imports use `.ts` extensions.
- `npm run typecheck` and `npm test` pass at the end of every task.
- Land plan coordinates are overworld tile coordinates: square `(column, row)` covers tiles `column × squareSize … +squareSize−1`, `row × squareSize … +squareSize−1`. The shipped plan (a later plan) uses `squareSize: 64` and puts Terminus Square's origin at (128, 320).
- Heights are whole steps from 0 to `MAX_TERRAIN_HEIGHT` (15). Ground two or more steps (`CLIFF_DROP`) above a walkable neighbour, diagonals included, becomes `cliff`.
- A ward is a region: ward ids are `RegionId`s.
- Ids are forever. Do not rename any district, area or instance id.
- Other sessions are working in this folder. Never stage the modified HUD files under `packages/client/src/hud`, `screens` or `styles`, the deleted `scripts/_ids.ts`, `.claude/launch.json`, `docs/handoffs/2026-11-18-ui-audit.md` or `scripts/_ascii.ts`. Stage files by name only.
- Commit messages are plain sentences in the project's style and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **A split square whose sibling is not placed.** The missing ward's land is void in the placed half. Expected: `findLandIssues` reports the walkable land that lies in no district, rather than the land quietly vanishing. Test in Task 6.
- **Shapes that reach past the plan's edge.** The sea is easiest to draw as a shape larger than the plan. Expected: the shape is clipped to the plan, not rejected. Test in Task 2.
- **A cliff on a square edge.** Expected: the two squares agree on which tiles are cliff, because cliffs are worked out on the whole plan before cutting, and `findTerrainSeamIssues` stays quiet. Tests in Tasks 2 and 3.
- **A layout in a split square that draws or places across the border.** Expected: placing something on the sibling's tiles fails at load with its JSON path, and painting over them is reported as an overlap by `findLevelIssues`. Tests in Tasks 3 and 6.
- **A tile in a split square.** Expected: it gets only its own district's areas and safety on the server, never the sibling's, though both districts' `ground` areas have the same rectangle. Test in Task 7.

---

### Task 1: Blueprints drawn on a base

Extract the shape, ramp and cliff rules from `drawBlueprint` so the land can share them, and let `drawBlueprint` start from given tiles instead of void.

**Files:**
- Modify: `packages/shared/src/world/blueprint.ts`
- Test: `packages/shared/test/blueprint.test.ts`

**Interfaces:**
- Produces, all exported from `blueprint.ts`:
  - `isInsideShape(shape: RoomShape, rect: TileRect, point: TilePoint): boolean`: the existing private function, now exported.
  - `rampHeightAt(ramp: Omit<RampStep, 'kind'>, point: TilePoint): number`: the height `drawRamp` gives `point`. It throws the existing `is too steep` error when the rect is too short for the climb.
  - `findCliffs(width: number, height: number, walkableAt: (point: TilePoint) => boolean, heightAt: (point: TilePoint) => number): TilePoint[]`: every walkable tile with a walkable neighbour (8-way) at least `CLIFF_DROP` lower.
  - `interface BlueprintBase { readonly tiles: readonly TileKindId[]; readonly heights: readonly number[]; readonly rooms: Readonly<Record<string, TileRect>> }`. `tiles` and `heights` are row-major, `width × height` long.
  - `drawBlueprint(size, steps, painted = [], paintedHeights = [], base?: BlueprintBase): Blueprint`.

- [ ] **Step 1: Write the failing tests** in `blueprint.test.ts`, in a new `describe('blueprints on a base', …)`:

```ts
const base = (width: number, height: number, voidColumn = -1): BlueprintBase => ({
  tiles: Array.from({ length: width * height }, (_, index) => (index % width === voidColumn ? 'void' : 'grass')),
  heights: new Array(width * height).fill(1),
  rooms: { ground: { x: 0, y: 0, width, height } },
});

test('a based blueprint keeps the base tiles and heights under its steps', () => {
  const plan = drawBlueprint({ width: 8, height: 8 }, [patch(2, 2, 2, 2, 'asphalt')], [], [], base(8, 8));
  assert.equal(MAP_LEGEND[plan.map[3]![3]!], 'asphalt');
  assert.equal(MAP_LEGEND[plan.map[1]![1]!], 'grass');
  assert.equal(plan.heightAt({ x: 1, y: 1 }), 1);
});

test('base void never grows walls, but a building ring still does', () => {
  const plan = drawBlueprint({ width: 10, height: 10 }, [{ kind: 'building', id: 'shed', rect: { x: 4, y: 4, width: 3, height: 3 }, floor: 'boards', wall: 'brick', doors: [{ side: 'south', width: 1 }] }], [], [], base(10, 10, 0));
  for (let y = 0; y < 10; y++) assert.equal(MAP_LEGEND[plan.map[y]![0]!], 'void', `row ${y}`);
  assert.equal(MAP_LEGEND[plan.map[3]![5]!], 'brick');
});

test('base rooms are named rooms', () => {
  const plan = drawBlueprint({ width: 8, height: 8 }, [], [], [], base(8, 8));
  assert.deepEqual(plan.rooms.ground, { x: 0, y: 0, width: 8, height: 8 });
  assert.deepEqual(plan.at('ground', 2, 2), { x: 2, y: 2 });
});

test('a base of the wrong size is refused', () => {
  assert.throws(() => drawBlueprint({ width: 8, height: 8 }, [], [], [], base(4, 4)), /base is 4x4|base/);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/blueprint.test.ts`
Expected: FAIL. `BlueprintBase` is not exported, and `drawBlueprint` ignores a fifth argument.

- [ ] **Step 3: Implement**
  - Export `isInsideShape`.
  - Move the body of `drawRamp`'s height formula into `rampHeightAt`, and have `drawRamp` call it.
  - Move the cliff scan into `findCliffs`. `drawBlueprint` calls it and then raises the existing doorway error for any cliff that is an exit, link or door tile, with the same message as today.
  - With a `base`:
    - throw `Blueprint base is <w>x<h> tiles; the blueprint is <width>x<height>.` when either array is not `width × height` long;
    - start `tiles` and `elevation` from copies of the base;
    - register each base room in `rooms` and `shapes` (`'rect'`) without painting it;
    - remember which tiles the base left `void`. `needsWall` returns false for them, as it does inside a hollow.

- [ ] **Step 4: Run the tests and see them pass**

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/blueprint.test.ts packages/shared/test/terrain.test.ts packages/shared/test/blueprintPainted.test.ts`
Expected: PASS. The existing terrain and blueprint tests pass unchanged.

- [ ] **Step 5: Typecheck, run everything, commit**

Run: `npm run typecheck` and `npm test`. Both pass.

```bash
git add packages/shared/src/world/blueprint.ts packages/shared/test/blueprint.test.ts
git commit -m "Let a blueprint draw on a base of tiles, heights and rooms"
```

---

### Task 2: The land plan and drawing it

**Files:**
- Create: `packages/shared/src/world/landPlan.ts` (types, `drawLand`, `cutSquare`, `LAND_GROUND_ROOM`)
- Create: `packages/shared/src/world/landSchema.ts` (`LAND_PLAN_SCHEMA`, `parseLandPlan`)
- Modify: `packages/shared/src/index.ts` (export both after `./world/blueprint.ts`)
- Test: `packages/shared/test/landPlan.test.ts`

**Interfaces:**
- Consumes: `isInsideShape`, `rampHeightAt`, `findCliffs`, `BlueprintBase` (Task 1). `TileLayout` (`world/district.ts`, imported with `import type`, because `district.ts` imports `LandSquare` back in Task 3). `RegionId` (`ids.ts`).
- Produces (`landPlan.ts`):

```ts
export const LAND_GROUND_ROOM = 'ground';

export type LandShape =
  | { readonly kind: RoomShape; readonly rect: TileRect }
  | { readonly kind: 'polygon'; readonly points: readonly TilePoint[] };

export type LandStep =
  | { readonly kind: 'fill'; readonly shape: LandShape; readonly tile: TileKindId }
  | { readonly kind: 'line'; readonly points: readonly TilePoint[]; readonly width: number; readonly tile: TileKindId }
  | { readonly kind: 'rise'; readonly shape: LandShape; readonly height: number }
  | { readonly kind: 'ramp'; readonly rect: TileRect; readonly side: ExitSide; readonly from: number; readonly to: number }
  | { readonly kind: 'ward'; readonly shape: LandShape; readonly ward: RegionId }
  | { readonly kind: 'gate'; readonly id: string; readonly rect: TileRect; readonly tile: TileKindId };

export interface LandPlan {
  readonly id: string;
  readonly squareSize: number;
  readonly columns: number;
  readonly rows: number;
  readonly steps: readonly LandStep[];
}

export interface LandSquare {
  readonly column: number;
  readonly row: number;
  readonly split?: boolean;
}

export interface LandMap extends TileLayout {
  readonly plan: LandPlan;
  wardAt(point: TilePoint): RegionId | undefined;
  readonly gates: Readonly<Record<string, readonly TilePoint[]>>;
}

export function drawLand(plan: LandPlan): LandMap;
export function cutSquare(land: LandMap, square: LandSquare, ward?: RegionId): BlueprintBase;
```

- Produces (`landSchema.ts`): `LAND_PLAN_SCHEMA`, and `parseLandPlan(source: unknown): LandPlan`. It throws `<id>: <path>: <message>` in the same form as `parseLayout` (reuse that function's `pathOf` and `describeIssue` by moving them into a small shared helper, or by exporting them from `layout.ts`). A `Same<…>` assertion, as in `layoutSchema.ts`, ties the schema to `LandStep`.

**Rules the tests pin:**
- `LandMap.width` is `columns × squareSize` and `height` is `rows × squareSize`. Off the plan, `tileAt` is `'void'`, `heightAt` is 0 and `wardAt` is `undefined`. Every tile starts `'void'`, at height 0, with no ward.
- Steps paint in order, and later ones win on the layer they touch: `fill`, `line` and `gate` paint tiles, `rise` and `ramp` paint heights, and `ward` paints wards.
- **Polygons follow tile corners.** Vertex (x, y) is the north-west corner of tile (x, y). A tile is inside when its centre (x + 0.5, y + 0.5) is inside by the even-odd rule. `rect`, `round` and `octagon` use `isInsideShape`.
- **Lines run through tile centres.** Point (x, y) is the centre of tile (x, y). A tile is painted when its centre lies within `width / 2` of the polyline, plus 1e-9.
- Every shape is clipped to the plan, but a `gate` rect must lie wholly inside it. Gate ids are unique. `gates[id]` lists the rect's tiles, row by row.
- Once all steps are painted, `findCliffs` runs over the whole plan, and its tiles become `'cliff'` (heights kept).
- Schema: `squareSize`, `columns` and `rows` are positive integers. `height`, `from` and `to` run 0–15. `width` is a positive integer. A polygon has at least 3 points and a line at least 2.
- `drawLand` errors read `land <id>: steps[<i>]: <reason>`.
- `cutSquare`:
    - throws `land <id>: square <column>,<row> is outside the <columns>x<rows> plan` for a square off the plan;
    - otherwise returns the window's tiles and heights, with `rooms: { ground: { x: 0, y: 0, width: squareSize, height: squareSize } }`;
    - with `ward`, turns every tile whose `wardAt` is not that ward into `'void'` at height 0.

- [ ] **Step 1: Write the failing tests** in `landPlan.test.ts`. Use a helper that builds a small plan of 8-tile squares, 2 columns by 1 row, that opens with `fill` of the whole plan in `grass`:

```ts
const land = (...steps: LandStep[]) => drawLand({ id: 'test', squareSize: 8, columns: 2, rows: 1, steps: [{ kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 8 } }, tile: 'grass' }, ...steps] });
```

Tests and their key assertions:
- `'a polygon covers the tiles inside its corners'`: a polygon of (1,1), (5,1), (5,4), (1,4) in `water`. Tiles (1,1) and (4,3) are water; (5,1), (0,1) and (1,4) are grass.
- `'a line paints the tiles its centre line passes within half its width'`: a line from (2,1) to (2,6) of width 1 paints (2,1) through (2,6), and leaves (1,3), (3,3) and (2,0) as grass. With width 3, (1,3) and (3,3) are painted too.
- `'later steps win'`: `water` over the whole plan, then a rect of `asphalt`. The rect is asphalt, and outside it is water.
- `'shapes past the edge of the plan are clipped'`: a `fill` rect (−4, −4, 40, 40) of `water` does not throw, and every tile is water.
- `'rises and ramps set heights'`: a `rise` round (2,1,4,4) at height 1 gives `heightAt` (3,2) = 1 and (0,0) = 0. A `ramp` (8,0,8,8) east from 0 to 3 gives `heightAt` at x = 8, 10, 12, 14 of 0, 1, 2, 3 (y = 4).
- `'ward shapes paint wards'`: a ward rect (0,0,8,8) `a`, then (8,0,8,8) `b`. `wardAt` (3,3) is `'a'`, (12,3) is `'b'`, and (−1,0) is `undefined`.
- `'gates are painted and named'`: a gate `g` with rect (7,3,2,1) in `door`. `gates.g` equals `[{x:7,y:3},{x:8,y:3}]`, and `tileAt` (8,3) is `'door'`. A second gate `g` throws `/gate "g" is named twice/`. A gate rect (15,0,2,1) throws `/outside/`.
- `'cliffs are worked out across the whole plan'`: a rise rect (8,0,8,8) at height 2. `tileAt` (8, y) is `'cliff'` for y 0–7, and (7, 3) is `'grass'`.
- `'a cut square is its window of the land'`: on the cliff plan above, `cutSquare(map, { column: 1, row: 0 })`:
    - `tiles[0]` (local 0,0) is `'cliff'`;
    - `tiles[1]` is `'grass'` at height 2;
    - `rooms` is `{ ground: { x: 0, y: 0, width: 8, height: 8 } }`.
- `'a split cut keeps only its own ward'`: with wards `a` (0,0,12,8) and `b` (12,0,4,8), `cutSquare(map, { column: 1, row: 0, split: true }, 'b')` makes local x 0–3 `'void'` at height 0, and x 4–7 `'grass'`. `{ column: 2, row: 0 }` throws `/square 2,0 is outside the 2x1 plan/`.
- `'parseLandPlan names the bad path'`: a line with one point throws `/steps\[0\]\.points/`, and a polygon with two points throws `/steps\[0\]\.shape/`.

- [ ] **Step 2: Run them and see them fail**

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/landPlan.test.ts`
Expected: FAIL. The module does not exist.

- [ ] **Step 3: Implement `landSchema.ts`, then `landPlan.ts`** to the rules above. Keep each shape's tile test in its own small function, and loop only over each shape's bounding box clipped to the plan. Store the layers in typed arrays: a `Uint8Array` for heights, and an index into a ward-name list for wards.

- [ ] **Step 4: Run the tests and see them pass**

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/landPlan.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, run everything, commit**

```bash
git add packages/shared/src/world/landPlan.ts packages/shared/src/world/landSchema.ts packages/shared/src/index.ts packages/shared/test/landPlan.test.ts
git commit -m "Add the land plan: typed steps drawn into a land map that squares are cut from"
```

(Add `layout.ts` to the `git add` line too if you exported its path helpers from there.)

---

### Task 3: Land squares in district layouts

**Files:**
- Modify: `packages/shared/src/world/layoutSchema.ts` (add `square` after `size`)
- Modify: `packages/shared/src/world/layout.ts` (`checkGeometry`, `drawLayout`, `foreignAnchor`, `buildDistrict`)
- Modify: `packages/shared/src/world/district.ts` (`DistrictDefinition.square?: LandSquare`)
- Test: `packages/shared/test/landSquares.test.ts` (new)

**Interfaces:**
- Consumes: `LandMap`, `LandSquare`, `cutSquare`, `LAND_GROUND_ROOM` (Task 2). `drawBlueprint(…, base)` (Task 1).
- Produces:
  - Layout field `square?: { column: int ≥ 0, row: int ≥ 0, split?: boolean }`, strict, placed straight after `size` in the schema so `printLayout` writes it there.
  - `buildDistrict(source: unknown, land?: LandMap): DistrictDefinition`. The result carries `square` when the layout has one.
  - Load errors, each prefixed with `<id>: `:
    - `square: a land square needs the land plan` when there is no `land`;
    - `size: a land square is <S>x<S>` when `size` is not `squareSize` square;
    - `steps[<i>]: a land square takes its edges from the land; it has no exits` for an `exit` step;
    - `steps[<i>].id: room "ground" is the land square's own ground` for a `room` or `building` step with that id.
  - `checkGeometry` treats `ground` as already drawn in a land square, so `link` and `pillars` steps may name it.
  - A split square cuts with `ward = layout.region`. An unsplit square cuts with no ward and owns the whole window.
  - `foreignAnchor(districtId, name, path, land)` draws a land square's layout on the same `land`. Nothing in the fixture reaches this, so the shipped Hinterland plan proves it.

- [ ] **Step 1: Write the failing tests.** In `landSquares.test.ts`, build a 16-tile, 2 × 1 land with the `ward`, `rise` and `fill` steps needed, and a helper `landLayout(overrides)` that returns a minimal valid layout:
  - `size` 16 × 16 and `square: { column: 1, row: 0 }`;
  - `steps: []` and `areas: [{ room: 'ground', name: 'Test Ground' }]`;
  - `dressing: { ground: { theme: 'camp', people: 0 } }`;
  - the empty lists and `furnish: {}`, as in the fixture's `empty`.

Tests:
- `'a land square starts from its window of the land'`: `buildDistrict(landLayout(), map)`:
    - `district.map[r]` equals the land's row `r`, x 16–31, written in map symbols;
    - `district.square` deep-equals `{ column: 1, row: 0 }`;
    - `district.rooms.ground` is the 16 × 16 rect;
    - a tile under a land rise has that height in `district.heights`.
- `'layout steps draw on top of the land'`: a `patch` (2,2,3,3) of `asphalt` shows `^` at `map[3][3]`.
- `'a split square owns only its own ward'`: with `split: true` and `region` set to the east ward, the west ward's tiles are `' '`. No wall symbol (`#`, `B`) appears next to them unless the land drew one.
- `'a placement on the sibling side fails with its path'`: in the split square, an object at `{ room: 'ground', dx: 1, dy: 1 }` on the sibling's side throws `/objects\[0\]\.at/` and `/void, not floor/`.
- `'a land square needs the land'`, `'a land square is one square in size'`, `'a land square has no exits'` and `'ground is the square's own room'` each throw the messages above.
- `'printLayout writes the square after the size'`: `printLayout(parseLayout(landLayout()))` matches `/"size": .*\n  "square": \{ "column": 1, "row": 0 \}/`.

- [ ] **Step 2: Run them and see them fail**

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/landSquares.test.ts`
Expected: FAIL. `square` is not in the schema.

- [ ] **Step 3: Implement** the schema field, the `DistrictDefinition` field and the `layout.ts` changes above. `drawLayout(layout, land?)` computes the base once and passes it to both `drawBlueprint` calls.

- [ ] **Step 4: Run the tests and see them pass**, along with `layout.test.ts` and `layoutFiles.test.ts`, which show the shipped layouts still load and print canonically.

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/landSquares.test.ts packages/shared/test/layout.test.ts packages/shared/test/layoutFiles.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, run everything, commit**

```bash
git add packages/shared/src/world/layoutSchema.ts packages/shared/src/world/layout.ts packages/shared/src/world/district.ts packages/shared/test/landSquares.test.ts
git commit -m "Build a district layout that names a square from its window of the land"
```

---

### Task 4: Placing land squares on a level

**Files:**
- Modify: `packages/shared/src/world/levelPlan.ts`
- Modify: `packages/shared/src/world/level.ts` (`LevelDefinition.land?: LandMap`)
- Test: `packages/shared/test/landSquares.test.ts`

**Interfaces:**
- Consumes: `DistrictDefinition.square` (Task 3), and `LandMap` (Task 2).
- Produces:
  - `placeLandSquares(land: LandMap, districts: readonly DistrictDefinition[]): DistrictPlacement[]`:
    - the origin is `{ x: column × squareSize, y: row × squareSize }`, in input order;
    - throws `District "<id>" names no square.`;
    - throws `District "<id>" names square <c>,<r>, outside the <columns>x<rows> land plan.`;
    - throws `Square <c>,<r> holds "<a>" and "<b>"; districts that share a square are split.` unless every district in that square is `split`.
  - `pinPlacements(placements: readonly DistrictPlacement[], districtId: DistrictId, origin: TilePoint): DistrictPlacement[]`:
    - shifts every placement so `districtId` lands on `origin`, which is how the Low Ward's joined squares meet land coordinates;
    - throws `pinPlacements was not given district "<id>".` when that district is missing.
  - `LevelDefinition.land?: LandMap`. `resolveLevel` passes it through unchanged on `definition`. Checks read `level.definition.land`.

- [ ] **Step 1: Write the failing tests** in `landSquares.test.ts`:
  - `'land squares are placed by their square'`: three districts built on the Task 3 land (squares (0,0), and (1,0) twice with `split`) get origins (0,0), (16,0) and (16,0).
  - `'placing refuses a district with no square, a square off the plan, and an unsplit pair'`: one `assert.throws` for each message above.
  - `'pinning moves a joined set onto land coordinates'`: `pinPlacements([{ districtId: 'a', origin: { x: 0, y: 0 } }, { districtId: 'b', origin: { x: 64, y: 0 } }], 'a', { x: 128, y: 320 })` deep-equals `a` at (128,320) and `b` at (192,320). An unknown id throws.

- [ ] **Step 2: Run them and see them fail**

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/landSquares.test.ts`
Expected: FAIL. `placeLandSquares` is not exported.

- [ ] **Step 3: Implement both functions and the `land` field.**

- [ ] **Step 4: Run the tests and see them pass.**

- [ ] **Step 5: Typecheck, run everything, commit**

```bash
git add packages/shared/src/world/levelPlan.ts packages/shared/src/world/level.ts packages/shared/test/landSquares.test.ts
git commit -m "Place land squares by grid and pin joined districts to land coordinates"
```

---

### Task 5: The fixture wilds, and checks that know land squares

Add a small land level to the fixture world. The checks that assume declared exits, and rooms that own every tile in their rectangle, learn about land squares.

**Files:**
- Create: `packages/shared/test/fixtures/world/wilds.ts` (land plan, map, the four layouts, anchors)
- Modify: `packages/shared/test/fixtures/world/index.ts` (districts, `fx-wilds` level and recipe, exports)
- Modify: `packages/shared/src/content/worldDesignIntegrity.ts` (`findExitIssues`, `findSeamIssues`)
- Modify: `packages/shared/src/content/furnishingIntegrity.ts` (`unreachedIn`, `findReachabilityIssues`)
- Test: `packages/shared/test/landSquares.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces, exported from `@containment/shared/fixtures`:
  - `FIXTURE_LAND: LandMap`;
  - `FIXTURE_WILDS_LAYOUTS: ReadonlyMap<string, DistrictLayout>`;
  - `FIXTURE_WILDS: LevelDefinition`.

  - `FIXTURE_WILDS_IDS: readonly string[]`, the four district ids in square order;
  - `wildsRecipe(ids: readonly string[]): LevelRecipe`, which builds the `fx-wilds` level from those districts.

  `FIXTURE_LEVEL_RECIPES` gains `'fx-wilds'` as `wildsRecipe(FIXTURE_WILDS_IDS)`, and `FIXTURE_CONTEXT.districtOf` knows the four new districts. The wilds layouts stay out of `FIXTURE_LAYOUTS` and `FIXTURE_LAYOUT_SOURCES`: the editor builds those without a land plan until the editor plan teaches it to.

**The fixture land (`fx-land`):** `squareSize: 32`, `columns: 4`, `rows: 1`. Steps in order:
1. `fill`: rect (0,0,128,32), `water`.
2. `fill`: polygon (2,3), (40,2), (96,2), (96,30), (50,29), (2,30), `grass`. Column 3 stays sea, and the land's east edge is tile x 95.
3. `rise`: round (24,10,16,12), height 1. It crosses the edge between columns 0 and 1.
4. `line`: (48,1) to (48,30), width 1, `brick`. This is the wall between the wards.
5. `gate` `fx-wall-gate`: rect (48,15,1,2), `door`.
6. `ward`: rect (0,0,48,32), `fx-home`.
7. `ward`: rect (48,0,80,32), `fx-far`.

**The four districts:** all tier 1 and `condition: 'worn'`, with the fixture `AMBIENCE` and `steps: []`. Each has one area, `{ room: 'ground', name }`, and `dressing: { ground: { theme: 'camp', people: 0 } }`.

| id | square | region | objects (room `ground`, dx, dy) | extra |
| - | - | - | - | - |
| `fx-wild-west` | 0,0 | `fx-home` | `crate` 12,8 · `packing-crate` 14,20 · `trash-bin` 20,12 | anchor `start` at 8,16; recovery `{ districtId: 'fx-wild-west', anchor: 'start' }` |
| `fx-wild-gate-west` | 1,0 split | `fx-home` | `crate` 4,8 · `packing-crate` 6,24 · `trash-bin` 10,12 | area `safe: true` (Task 7 uses it) |
| `fx-wild-gate-east` | 1,0 split | `fx-far` | `vault-door` 16,15 and 16,16 (ids `wall-gate-a`, `wall-gate-b`) · `crate` 22,8 · `packing-crate` 24,24 · `trash-bin` 28,12 | |
| `fx-wild-east` | 2,0 | `fx-far` | `crate` 8,8 · `packing-crate` 12,24 · `trash-bin` 20,12 | |

Object ids are `<district-short>-<object>`, for example `wild-west-crate`. The `fx-wilds` level is `kind: 'floor'`, `depth: 0`, `capacity: 50`, with spawn `{ districtId: 'fx-wild-west', position: start }`, `land: FIXTURE_LAND` and `districts: placeLandSquares(FIXTURE_LAND, ids.map(context.districtOf))`. Add it to `buildLevelIndex` beside `fx-floor` and `fx-depths`.

- [ ] **Step 1: Write the failing tests** in `landSquares.test.ts`:
  - `'the wilds are placed by grid'`: origins in `FIXTURE_WILDS.districts` are (0,0), (32,0), (32,0) and (64,0).
  - `'the wilds raise no content issues'`: `findContentIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('fx-wild') || issue.includes('fx-wilds'))` deep-equals `[]`. This also proves that walkable land beside a district-less square of sea (x 95 against x 96) is not a seam.
  - `'the wilds seam by construction'`: `findTerrainSeamIssues(FIXTURE_CONTENT.levels.get('fx-wilds')!)` is `[]`.

- [ ] **Step 2: Add the fixture and run the tests.**

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/landSquares.test.ts`
Expected: FAIL, with `has 0 exit(s); a district needs two ways in` for each `fx-wild-*` district. A furnishing reachability issue on a split square's `ground` room may appear too.

- [ ] **Step 3: Adapt the checks**
  - `findExitIssues`: return before the two-ways-in rule when `district.square` is set.
  - `findSeamIssues`: a cardinal neighbour that is `'void'` on the level is not a seam when `level.definition.land` covers that point and the land there is not walkable.
  - `unreachedIn(rect, grid, anchors, owns: (point: TilePoint) => boolean)`. The room's tiles are the rect's tiles that `owns`. An entrance is an owned walkable tile with a walkable cardinal neighbour that is outside the rect or not owned. The flood stays on owned tiles. `findReachabilityIssues` passes `(point) => level.layout.districtAt(point) === placement.districtId`.

- [ ] **Step 4: Run all shared tests, then everything**

Run: `node --test --no-warnings=ExperimentalWarning "packages/shared/test/**/*.test.ts"`, then `npm test` (the client's `contentWith` test re-stitches `fx-wilds`).
Expected: PASS. The fixture-wide `findContentIssues(FIXTURE_CONTENT)` test (grep for it) stays empty.

- [ ] **Step 5: Typecheck, commit**

```bash
git add packages/shared/test/fixtures/world/wilds.ts packages/shared/test/fixtures/world/index.ts packages/shared/src/content/worldDesignIntegrity.ts packages/shared/src/content/furnishingIntegrity.ts packages/shared/test/landSquares.test.ts
git commit -m "Add a fixture land level and teach the seam, exit and reachability checks about land squares"
```

---

### Task 6: Sealed wards and the land checks

**Files:**
- Create: `packages/shared/src/content/landIntegrity.ts`
- Create: `packages/shared/src/content/wardIntegrity.ts`
- Modify: `packages/shared/src/content/worldDesignIntegrity.ts` (call both from `findWorldDesignIssues`)
- Modify: `packages/shared/src/index.ts` (export both)
- Test: `packages/shared/test/landSquares.test.ts`

**Interfaces:**
- Consumes: `LandMap`, `LevelDefinition.land`, `DistrictDefinition.square`, the fixture wilds (Task 5), `createObjectWalkabilityGrid`, `doorTilesOf`.
- Produces:
  - `findLandPlanIssues(land: LandMap): string[]`, a pure check on the plan:
    - `land <id>: walkable land at <x>,<y> meets the edge of the plan`, for the first such tile only;
    - `land <id>: gate "<gate>" does not join two wards`, when the walkable non-gate tiles cardinally beside the gate's tiles carry fewer than two distinct wards.
  - `findLandIssues(content: GameContent): string[]`. For each level with `definition.land`:
    - the plan issues, prefixed `level <levelId>: `;
    - `level <levelId>: walkable land at <x>,<y> lies in no district`, for the first such tile per square, where `layout.districtAt` is `undefined` on a walkable land tile;
    - `district <id>: its land at <x>,<y> belongs to <ward ?? 'no ward'>, not its region <region>`, the first per district, for a walkable level tile owned by a land-square district whose land ward is not that district's region;
    - `level <levelId>: land gate "<gate>" has no door on its tiles`, when no door object (`doorTilesOf`) stands on any of the gate's tiles.
  - `findSealedWardIssues(content: GameContent): string[]`, run over **every** level, not just land levels:
    - flood-fill the level's walkable tiles cardinally on `createObjectWalkabilityGrid(layout, objects, …)`, which keeps doors shut;
    - map each tile to `content.districts.get(layout.districtAt(tile))?.region`;
    - report `level <levelId>: wards <a> and <b> meet at <x>,<y> without a gate` once per sorted pair, at the first tile where the second ward is reached.

  Cardinal flooding matches movement, because `findPath` takes a diagonal step only when both cardinal steps are open.

- [ ] **Step 1: Write the failing tests.** Add a helper `wildsWith(change: (layout: DistrictLayout) => DistrictLayout, drop: readonly string[] = []): GameContent`:
  - it rebuilds every `FIXTURE_WILDS_LAYOUTS` entry not in `drop` with `buildDistrict(change(layout), FIXTURE_LAND)`;
  - it runs `wildsRecipe(FIXTURE_WILDS_IDS.filter((id) => !drop.includes(id)))` over a context of those districts that falls back to `FIXTURE_CONTEXT.districtOf`;
  - it returns `{ ...FIXTURE_CONTENT, districts, levels, levelOfDistrict }` from `buildLevelIndex([level], districts, FIXTURE_CONTENT.assemblies)`.

  Tests and their key assertions:
  - `'the wilds are sealed and their land is whole'`: `findSealedWardIssues(FIXTURE_CONTENT)` and `findLandIssues(FIXTURE_CONTENT)` are both `[]`.
  - `'a gate without its doors lets one ward into the other'`: with the two `vault-door` objects removed from `fx-wild-gate-east`, the issues include `level fx-wilds: wards fx-far and fx-home meet at` and `land gate "fx-wall-gate" has no door on its tiles`.
  - `'land a split sibling leaves behind lies in no district'`: dropping `fx-wild-gate-east` gives an issue matching `/level fx-wilds: walkable land at \d+,\d+ lies in no district/`.
  - `'a district on another ward's land is reported'`: setting `region: 'fx-home'` on `fx-wild-east` gives `district fx-wild-east: its land at` … `belongs to fx-far, not its region fx-home`.
  - `'painting into the sibling's half overlaps it'`: a `patch` (14,4,4,2) of `asphalt` in `fx-wild-gate-west` makes `findLevelIssues` report `/placements "fx-wild-gate-\w+" and "fx-wild-gate-\w+" overlap/`.
  - `'tier is walked across land squares'`: `fx-wild-gate-east` at tier 3 and `fx-wild-east` at tier 2 make `findWorldDesignIssues` report `district fx-wild-east: tier 2 lies beyond tier 3`.
  - `'walkable land at the plan edge, and a gate inside one ward, are reported'`: for `findLandPlanIssues(drawLand(...))` on two small plans, the first message and then the second.

- [ ] **Step 2: Run them and see them fail**

Run: `node --test --no-warnings=ExperimentalWarning packages/shared/test/landSquares.test.ts`
Expected: FAIL. The functions do not exist. The tier and overlap tests may already pass, since they pin behaviour that comes from tile-based checks.

- [ ] **Step 3: Implement both modules**, and call them at the end of `findWorldDesignIssues`: `issues.push(...findLandIssues(content), ...findSealedWardIssues(content))`.

- [ ] **Step 4: Run everything**

Run: `npm test`
Expected: PASS, including `shippedContent.test.ts`, because the sealed-ward check now runs on the shipped overworld and on Site Meridian's levels. If it reports a shipped leak, **stop**. It means two block-out wards touch without a gate, which breaks the "only way between wards is a gate" rule. Report the issue text to the owner rather than exempting a level or a ward.

- [ ] **Step 5: Typecheck, commit, push**

```bash
git add packages/shared/src/content/landIntegrity.ts packages/shared/src/content/wardIntegrity.ts packages/shared/src/content/worldDesignIntegrity.ts packages/shared/src/index.ts packages/shared/test/landSquares.test.ts
git commit -m "Check that wards are sealed except at gates, and that land squares cover their land"
git push
```

---

### Task 7: Areas and safety by the tile's district on the server

**Files:**
- Modify: `packages/server/src/world/levelInstance.ts:278-284`
- Test: `packages/server/test/levels.test.ts`

**Interfaces:**
- Consumes: the `fx-wilds` level (Task 5). `fx-wild-gate-west`'s `ground` area is safe, and `fx-wild-gate-east`'s has the same rect and is not.
- Produces:
  - `areasAt(point)` returns only areas whose `districtId` is `this.layout.districtAt(point)` and whose rect contains the point;
  - `isSafe(point)` is `isSafeIn(this.areasAt(point), point)`.

  `World` area entry, multi-combat and the creature grid already go through these two methods, so they follow.

- [ ] **Step 1: Write the failing test** in `levels.test.ts`:

```ts
test('a split square gives each tile only its own district\'s areas', () => {
  const level = new LevelInstance(FIXTURE_CONTENT.levels.get('fx-wilds')!, FIXTURE_CONTENT, 0);
  assert.deepEqual(level.areasAt({ x: 52, y: 10 }).map((area) => area.districtId), ['fx-wild-gate-east']);
  assert.equal(level.isSafe({ x: 40, y: 10 }), true);
  assert.equal(level.isSafe({ x: 52, y: 10 }), false);
  assert.ok(level.creatureGrid.isWalkable({ x: 52, y: 10 }));
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test --no-warnings=ExperimentalWarning packages/server/test/levels.test.ts`
Expected: FAIL. `areasAt` returns both districts' `ground` areas, and `isSafe` at (52,10) is `true`.

- [ ] **Step 3: Implement the two methods.**

- [ ] **Step 4: Run the server tests, then everything**

Run: `node --test --no-warnings=ExperimentalWarning "packages/server/test/**/*.test.ts"`, then `npm test`.
Expected: PASS. `safety.test.ts` and `combat.test.ts` are unchanged.

- [ ] **Step 5: Typecheck, commit**

```bash
git add packages/server/src/world/levelInstance.ts packages/server/test/levels.test.ts
git commit -m "Look up a tile's areas and safety by the district that owns it"
```

---

### Task 8: Docs, final check and handoff

**Files:**
- Modify: `ARCHITECTURE.md` ("Levels and districts")
- Modify: `WORLD_DESIGN.md` ("Joining districts")
- Create: `docs/handoffs/2026-11-19-land-plan-engine.md`

Keep the doc changes to what the engine does now. The full Hinterland rewrite of these docs is build order step 5.

- [ ] **Step 1: ARCHITECTURE.md.** Add a **Land squares** bullet after **Joining**. It covers:
  - the land plan (`world/landPlan.ts`, `landSchema.ts`) and how `drawLand` turns it into a land map, with cliffs worked out across the whole plan;
  - how `buildDistrict(layout, land)` cuts a layout's `square` and draws its own steps on top;
  - `placeLandSquares` and `pinPlacements`;
  - how split squares own their ward's tiles;
  - `LevelDefinition.land`;
  - the server's areas-by-owning-district rule.

  Also add `findLandIssues` and `findSealedWardIssues` to the `findWorldDesignIssues` sentence.

- [ ] **Step 2: WORLD_DESIGN.md.** Under rule 8, add a short paragraph on **land squares**:
  - their edges come from the land, with no exit steps and no two-ways-in rule;
  - a square crossed by a ward border is split, one district per ward;
  - where land meets a square with no district, the sea or rock is scenery, not a seam.

  Add a rule after rule 12: **Wards are sealed.** Flooding a ward's walkable ground with every door shut never reaches another ward. **Checked** (`findSealedWardIssues`). Also add that every walkable tile of a land plan lies in a district of its ward, and every land gate holds a door. **Checked** (`findLandIssues`).

- [ ] **Step 3: Verify**

Run: `npm run typecheck` and `npm test`.
Expected: both pass. Quote the final test summary line in the handoff.

- [ ] **Step 4: Write the handoff.** In the shape of `2026-11-19-hinterland-atlas-plan.md`, record:
  - what landed, with commits;
  - the decisions this plan made: polygon corners and line centres, `split` on the square, the `ground` room, the land on `LevelDefinition`, and the wilds being kept out of `FIXTURE_LAYOUT_SOURCES`;
  - what the next plan (client scenery and the editor's land layer) starts from:
    - `LevelDefinition.land` for drawing land with no district;
    - `ResolvedLevel.districts` rects overlapping in split squares (world map and minimap labels);
    - `questRoute`'s `enterArea` goal at the area-rect centre, which can fall on the sibling's side of a split square;
    - the editor building land squares without the land.
  - the same note about other sessions' files.

- [ ] **Step 5: Commit and push**

```bash
git add ARCHITECTURE.md WORLD_DESIGN.md docs/handoffs/2026-11-19-land-plan-engine.md
git commit -m "Document land squares and sealed wards, and hand off to the scenery plan"
git push
```
