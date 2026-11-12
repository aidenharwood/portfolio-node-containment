# World Furnishing: Engine and Atrium Flagship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace grid dressing with set-pieces, zoned compositions, floor decals and a condition overlay, and dress the Meridian Atrium as the hand-composed flagship.

**Architecture:** Shared gains multi-tile object footprints, a role-tagged prefab library, a composer that fills zoned compositions around hand-placed set-pieces, floor decals carried from district to resolved level, and a seeded condition pass. The client paints decals into floor voxels and renders large objects as one model. A new `findFurnishingIssues` keeps it honest.

**Tech Stack:** TypeScript (erasable only, `.ts` imports, no comments), Node 24 `node --test`, Vite + Three.js voxel renderer.

**Spec:** `docs/superpowers/specs/2026-11-12-world-furnishing-design.md`

This plan covers waves 1 (engine) and 2 (Atrium). Waves 3 to 5 get their own plans after the user reviews the Atrium in-game.

## Global Constraints

- Write no code comments. Erasable TypeScript only (no enums, namespaces or parameter properties). Imports use `.ts` extensions.
- Shared is deterministic: no `Math.random()`; seed from district and room ids (reuse `seededRandom` in `furnish.ts`).
- Gameplay does not change: anchors, exits, link tiles, doors, track, safe areas and quest props stay where they are and stay reachable.
- Dressing objects are non-interactive and their instance ids are not stable; nothing may reference one. Set-pieces given an `instanceId` keep fixed ids `<instanceId>/<n>`.
- Every task ends with `npm run typecheck` and `npm test` passing.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `furnishing/world-dressing`.

## Review Focus

- A large object rotated `east`/`west` must swap width and height everywhere (blocking, fixtures, rendering, picking); Task 1 and Task 8 test a 3×2 object in all four facings.
- A set-piece or composition must never seal off part of a room or an NPC; Task 9's reachability check is tested with a deliberately sealing fixture.
- Re-running content load must give byte-identical dressing; Task 5 asserts determinism across two `furnish` calls.
- Rooms smaller than every prefab of a role must still dress without throwing; Task 5 tests a 5×5 room.
- A decal on a door, wall or track tile must be rejected rather than painted; Task 9 tests it.

## File Structure

| File | Responsibility |
| ---- | -------------- |
| `packages/shared/src/world/entities.ts` | `footprint` on `WorldObjectDefinition` |
| `packages/shared/src/world/footprint.ts` | `objectFootprintSize`, `objectFootprintTiles` |
| `packages/shared/src/world/district.ts` | footprint-aware walkability; `FloorDecal`, `decals` and `condition` on `DistrictDefinition` |
| `packages/shared/src/world/levelLayout.ts` | `decals` on `ResolvedLevel`, offset by district origin |
| `packages/shared/src/world/decals.ts` | `FloorDecalKind`, `FloorDecal`, `decalIndex` |
| `packages/shared/src/content/prefabs/*.ts` | role-tagged prefab libraries, `PREFABS`, `prefabsWithRole` |
| `packages/shared/src/content/compositions.ts` | `COMPOSITIONS`, `inferComposition` |
| `packages/shared/src/content/conditions.ts` | `Condition`, `CONDITION_RULES` |
| `packages/shared/src/content/districts/compose.ts` | composer: zones, variety, mirroring, jitter |
| `packages/shared/src/content/districts/condition.ts` | `applyCondition` |
| `packages/shared/src/content/districts/setPiece.ts` | `setPiece` |
| `packages/shared/src/content/districts/furnish.ts` | orchestration: set-pieces → composition → condition → people |
| `packages/shared/src/content/setPieceObjects.ts`, `ruinObjects.ts` | new object definitions |
| `packages/shared/src/content/furnishingIntegrity.ts` | `findFurnishingIssues` |
| `packages/client/src/render/models/setPieceModels.ts`, `ruinModels.ts` | voxel models for new objects |
| `packages/client/src/render/world/floorDecals.ts` | decal colour per voxel |
| `packages/client/src/render/world/levelVoxels.ts`, `floorScatter.ts`, `chunkView.ts` | decal painting, large-object placement |

---

## Wave 1: Engine

### Task 1: Multi-tile object footprints in shared

**Files:**
- Modify: `packages/shared/src/world/entities.ts:167-180`, `packages/shared/src/world/footprint.ts`, `packages/shared/src/world/district.ts:110-123`, `packages/shared/src/content/districts/populate.ts:14-20`, `packages/shared/src/world/mapScenery.ts`, `packages/shared/src/content/worldDesignIntegrity.ts:210-220`
- Test: `packages/shared/test/footprint.test.ts`

**Interfaces:**
- Produces: `WorldObjectDefinition.footprint?: { readonly width: number; readonly height: number }`; `objectFootprintSize(definition: WorldObjectDefinition | undefined, facing?: Facing): { width: number; height: number }` (swaps for `east`/`west`); `objectFootprintTiles(definition: WorldObjectDefinition | undefined, placement: { position: TilePoint; facing?: Facing }): TilePoint[]` (top-left = `position`).

- [ ] **Step 1: Write the failing tests** in `footprint.test.ts`:
  - `objectFootprintTiles` of a definition with `footprint: { width: 3, height: 2 }` at `{x:10,y:5}` facing `south` yields 6 tiles spanning x 10–12, y 5–6; facing `east` spans x 10–11, y 5–7; facing `north` equals `south`; no footprint yields `[position]`.
  - `createObjectWalkabilityGrid` with that object blocks all 6 (or rotated 6) tiles and leaves `{x:13,y:5}` walkable.
  - `positionsOf` with an `ObjectPlacement` for a 3×2 object returns all 6 tiles (pass a definition lookup; see Step 3).
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/footprint.test.ts`. Expected: FAIL, `objectFootprintTiles` not exported.
- [ ] **Step 3: Implement.** Add the field and the two helpers in `footprint.ts`. `createObjectWalkabilityGrid` expands blocking and deck placements through `objectFootprintTiles`. `positionsOf` in `populate.ts` resolves object ids through `GAME_CONTENT`-free lookup: import the object definitions list the way `assemblies` are imported (`WORLD_OBJECTS` from `content/worldObjects.ts`), build a module-level `Map`, and expand any placement with `objectId`. `mapScenery` emits one entry per footprint tile. `findFixtureIssues` passes if any tile adjacent to the footprint's back edge is a wall.
- [ ] **Step 4: Run** the footprint test, then `npm run typecheck && npm test`. Expected: PASS (no existing object has a footprint yet).
- [ ] **Step 5: Commit** `git add packages/shared && git commit -m "Give world objects multi-tile footprints"` (with the co-author line).

### Task 2: Footprints on the server and client

**Files:**
- Modify: `packages/server/src/gameplay/interactionController.ts:73-95`, `packages/client/src/render/world/chunkView.ts:285-345`, `packages/client/src/render/pickTarget.ts`, `packages/client/src/state/worldState.ts:300-310`
- Test: `packages/server/test/footprints.test.ts`, `packages/client/test/placement.test.ts`

**Interfaces:**
- Consumes: `objectFootprintSize`, `objectFootprintTiles` (Task 1).
- Produces: `objectModelOrigin(placement: ObjectPlacement, definition: WorldObjectDefinition): { x: number; z: number }` exported from `chunkView.ts` (tile-space centre of the footprint).

- [ ] **Step 1: Write the failing tests.**
  - Server: register a test object `test-plinth` (`footprint: { width: 3, height: 2 }`, one `examine` interaction) in a test district via the existing harness in `packages/server/test/support`; a player standing south of the middle footprint tile can interact; a player standing two tiles away from every footprint tile is walked to a tile adjacent to the footprint, not to `position`.
  - Client: `objectModelOrigin` for that object at `{x:4,y:4}` facing `south` is `{x:5, z:4.5}`, facing `east` is `{x:4.5, z:5}`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/server/test/footprints.test.ts packages/client/test/placement.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `approachObject` treats every tile adjacent to any footprint tile as an approach tile. `chunkView.addObject` and `addDecor` position the group at `objectModelOrigin`. The object belongs to the chunk of its top-left tile, and the decor band uses the footprint's last row. Picking maps any footprint tile to the object's `instanceId`.
- [ ] **Step 4: Run** both tests, then `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Approach, place and pick multi-tile objects".

### Task 3: Prefab library v2

**Files:**
- Create: `packages/shared/src/content/prefabs/types.ts`, `index.ts`, one file per library: `civic.ts office.ts canteen.ts dormitory.ts industrial.ts freight.ts garden.ts wet.ts medical.ts lab.ts ritual.ts transit.ts archive.ts post.ts camp.ts cold.ts ruin.ts`
- Delete: `packages/shared/src/content/prefabs.ts`
- Modify: `packages/shared/src/content/districts/furnish.ts` (imports only), `packages/shared/test/furnish.test.ts`
- Test: `packages/shared/test/prefabs.test.ts`

**Interfaces:**
- Produces (in `types.ts`):
  ```ts
  export type PrefabRole = 'focal' | 'bay' | 'corner' | 'edge' | 'island' | 'wall';
  export interface PrefabPiece { readonly dx: number; readonly dy: number; readonly objectId: WorldObjectId; readonly facing?: Facing }
  export interface PrefabDecal { readonly kind: FloorDecalKind; readonly rect: TileRect; readonly pattern?: FloorDecalPattern; readonly tint?: string }
  export interface Prefab { readonly id: string; readonly themes: readonly DressingTheme[]; readonly roles: readonly PrefabRole[]; readonly pieces: readonly PrefabPiece[]; readonly decals?: readonly PrefabDecal[]; readonly clearance?: number; readonly symmetric?: boolean; readonly minRoom?: { readonly width: number; readonly height: number } }
  export const DRESSING_THEMES: readonly [...same 18 themes as today]; export type DressingTheme
  ```
  `prefab(id, themes, roles, pieces, options?)` builder replacing the old one.
- Produces (in `index.ts`): `PREFABS: Readonly<Record<string, Prefab>>`, `type PrefabName = string`, `prefabsWithRole(theme: DressingTheme, role: PrefabRole): readonly Prefab[]`, `findPrefabIssues(prefab: Prefab, objectOf: (id: WorldObjectId) => WorldObjectDefinition | undefined): string[]`.
- `FloorDecalKind` and `FloorDecalPattern` come from Task 4; until Task 4 lands, define them in `world/decals.ts` in this task (Task 4 only adds the rest).

- [ ] **Step 1: Write the failing tests** in `prefabs.test.ts`:
  - every theme has at least one prefab for each of `bay`, `island`, `corner` (via `prefabsWithRole`);
  - `findPrefabIssues` is empty for every prefab in `PREFABS`;
  - `findPrefabIssues` reports overlapping pieces for a prefab placing a 2×2 object at (0,0) and another piece at (1,1);
  - `findPrefabIssues` reports an unknown object id and an empty `roles`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/prefabs.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** Move each existing prefab to the library of its theme. Old `placement: 'wall'` becomes `roles: ['wall', 'bay']`. Old floor prefabs become `['island']`; ones of four or fewer pieces in one row also get `'edge'`. Every theme's old `corner` object becomes a one-piece prefab with role `corner`. Keep the prefab ids unchanged. Point `furnish.ts` at the new module, deriving its old `field`/`wall` lists from roles so behaviour is unchanged. Replace the `THEME_LAYOUTS` test in `furnish.test.ts` with the role test above. `ruin.ts` starts empty and Task 7 fills it.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Split prefabs into role-tagged libraries".

### Task 4: Floor decals in shared

**Files:**
- Modify: `packages/shared/src/world/decals.ts`, `packages/shared/src/world/district.ts:51-71`, `packages/shared/src/world/levelLayout.ts:34-49,147+`, `packages/shared/src/index.ts`
- Test: `packages/shared/test/levelLayout.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type FloorDecalKind = 'inlay' | 'mosaic' | 'rug' | 'runner' | 'lane-paint' | 'hazard-paint' | 'wear' | 'scorch' | 'moss' | 'water-stain' | 'salt-crust' | 'alien-vein' | 'cracks';
  export type FloorDecalPattern = 'solid' | 'border' | 'checker' | 'compass' | 'stripe';
  export interface FloorDecal { readonly kind: FloorDecalKind; readonly rect: TileRect; readonly pattern?: FloorDecalPattern; readonly tint?: string }
  export interface DecalCell { readonly decal: FloorDecal; readonly u: number; readonly v: number }
  export function decalIndex(decals: readonly FloorDecal[]): ReadonlyMap<string, readonly DecalCell[]>
  ```
  `u`, `v` are the tile's offset inside `rect`. Cells are in list order, so later decals paint over earlier ones. `DistrictDefinition.decals?: readonly FloorDecal[]`, `ResolvedLevel.decals: readonly FloorDecal[]` (rects offset by district origin).

- [ ] **Step 1: Write the failing tests:** a level with one district carrying a decal at `{x:2,y:3,width:4,height:2}` resolves it to the district origin plus that rect; `decalIndex` of two overlapping decals returns both for a shared tile, in order, with correct `u`/`v`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/levelLayout.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, and export the new types and `decalIndex` from `index.ts`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Carry floor decals from districts to levels".

### Task 5: Compositions and the composer

**Files:**
- Create: `packages/shared/src/content/compositions.ts`, `packages/shared/src/content/districts/compose.ts`
- Modify: `packages/shared/src/content/districts/furnish.ts`
- Test: `packages/shared/test/compose.test.ts`, `packages/shared/test/furnish.test.ts`

**Interfaces:**
- Consumes: `prefabsWithRole`, `Prefab` (Task 3); `objectFootprintSize` (Task 1); `FloorDecal` (Task 4).
- Produces:
  ```ts
  export type CompositionName = 'court' | 'radial' | 'concourse' | 'hall' | 'workroom' | 'yard' | 'nave';
  export interface CompositionZone { readonly kind: 'focal' | 'bays' | 'corners' | 'edges' | 'field'; readonly role: PrefabRole; readonly spacing: Readonly<Record<DressingDensity, number>>; readonly max?: number }
  export interface RoomComposition { readonly zones: readonly CompositionZone[]; readonly formal: boolean; readonly lane: 'cross' | 'spine' | 'ring' | 'none'; readonly laneDecal?: FloorDecalKind }
  export const COMPOSITIONS: Readonly<Record<CompositionName, RoomComposition>>
  export function inferComposition(rect: TileRect, shape: RoomShape, theme: DressingTheme): CompositionName
  export interface ComposeInput { readonly roomId: string; readonly rect: TileRect; readonly theme: DressingTheme; readonly density: DressingDensity; readonly composition: RoomComposition; readonly seed: string; readonly clear: ReadonlySet<string>; readonly openings: readonly TilePoint[]; readonly isWall: (point: TilePoint) => boolean; readonly objectOf: (id: WorldObjectId) => WorldObjectDefinition | undefined; readonly occupied: Set<string> }
  export interface Composed { readonly objects: readonly ObjectPlacement[]; readonly decals: readonly FloorDecal[] }
  export function composeRoom(input: ComposeInput): Composed
  ```
  `RoomDressing` gains `composition?: CompositionName`. `blueprint.ts` must expose each room's `RoomShape`; add `plan.shapes: Readonly<Record<string, RoomShape>>` if it is not already there.

`inferComposition` rules, in order: `octagon`/`round` → `radial`; `chapel` → `nave`; aspect ≥ 2.5 → `concourse`; area < 500 → `workroom`; `freight` or `wet` → `yard`; otherwise `court`.

Composer algorithm (not determined by the signature):

1. **Lane.**
   - `cross` and `spine` keep today's `inWalkingLane` rules.
   - `ring` keeps clear an annulus 2–4 tiles outside the focal slot's bounds. It also keeps clear a 3-wide straight path from every opening to the annulus.
   - `none` keeps nothing extra clear.
2. **Zones** fill in the composition's order. Every candidate placement uses the existing `fits` rules, extended to footprints and to `prefab.clearance ?? 1`.
   - **`focal`:** one slot centred in the room. Try each rotation of each candidate and take the first that fits. Skip this zone when `occupied` already holds a tile in the room's centre third.
   - **`corners`:** four slots, each touching two walls, rotated to face inward.
   - **`bays`:** slots along each wall at `spacing[density]` pitch, using the back-to-wall check as `wall` prefabs do today.
   - **`edges`:** slots on both sides of the lane, one tile outside it, at `spacing[density]` pitch.
   - **`field`:** a grid over the remaining clear tiles at `spacing[density]` pitch.
3. **Pick.** Each slot draws from a shuffled candidate list for its role. Skip a candidate that equals the previous slot in the same zone, or that already appears 3 times in the room, unless the composition is `formal`. Skip a candidate whose `minRoom` exceeds the room.
4. **Jitter.** In non-formal compositions, each bay, edge and field slot moves by `floor(random()*3)-1` tiles along its run.
5. **Mirror.** In `formal` compositions, slots are generated only on the half before the main axis (x for wide rooms, y for tall ones). Each placed prefab is copied mirrored across the axis: dx reflected, `east`↔`west` (or `north`↔`south`) swapped. The copy is placed only if it fits.
6. **Decals.** Prefab decals are offset by placement and rotation. If `laneDecal` is set, a decal of that kind covers the lane rects.

`COMPOSITIONS` values:

| Composition | Zones (role, spacing sparse/normal/dense, max) | Settings |
| ----------- | ---------------------------------------------- | -------- |
| `court` | focal (focal); corners (corner); bays (bay, 8/5/3); field (island, 9/6/4) | formal: false, lane: cross |
| `radial` | focal (focal); bays (bay, 8/5/3); edges (island, 8/5/4, max 8) | formal: true, lane: ring |
| `concourse` | edges (edge, 12/8/5); bays (bay, 14/9/6) | formal: false, lane: spine, laneDecal: wear |
| `hall` | bays (bay, 6/4/2); field (island, 8/5/3); focal (focal, max 1) | formal: false, lane: cross |
| `workroom` | bays (bay, 5/3/2); field (island, 8/6/4, max 1); corners (corner) | formal: false, lane: none |
| `yard` | field (island, 9/6/4); bays (bay, 8/5/3) | formal: false, lane: cross |
| `nave` | focal (focal); field (island, 4/3/2) | formal: true, lane: spine |

- [ ] **Step 1: Write the failing tests** in `compose.test.ts`, on a synthetic 30×20 plating room with one door:
  - `composeRoom` gives identical output for the same seed and different output for another seed;
  - no prefab id is used more than 3 times in a `court`;
  - in a `nave`, every placed piece's mirror tile across the room's x axis holds the same object id with mirrored facing;
  - lane tiles and tiles within 3 of the door are never occupied;
  - a 5×5 room composes without throwing and places at most one prefab;
  - `inferComposition` returns `radial` for an octagon, `concourse` for 100×13, `workroom` for 16×12, `nave` for any `chapel` room.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/compose.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `compositions.ts` and `compose.ts`, then switch `furnish.ts` to call `composeRoom`, using `entry.composition ?? inferComposition(...)`. Delete the old corner, wall-run and grid code. Generic NPCs now prefer standing tiles that are 4-adjacent to a placed piece whose object id is `briefing-bench`, `pew`, `stool`, `canteen-table` or `bench-curve`, and fall back to today's rule.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Existing furnish tests (facing, chairs face desks, wall furniture backs onto walls, pews face one way, no litter under furniture) must still pass. Expected: PASS.
- [ ] **Step 5: Commit** "Compose rooms from zones instead of grids".

### Task 6: Set-pieces and landmarks

**Files:**
- Create: `packages/shared/src/content/districts/setPiece.ts`
- Modify: `packages/shared/src/content/districts/furnish.ts`
- Test: `packages/shared/test/compose.test.ts`

**Interfaces:**
- Consumes: `Prefab`, `PREFABS` (Task 3); `composeRoom` (Task 5).
- Produces:
  ```ts
  export interface SetPiece { readonly room: string; readonly prefab: string; readonly origin: TilePoint; readonly facing: Facing; readonly instanceId?: string }
  export function setPiece(plan: Blueprint, room: string, prefab: string, dx: number, dy: number, facing?: Facing, instanceId?: string): SetPiece
  ```
  `FurnishOptions` gains `setPieces?: readonly SetPiece[]` and `landmarks?: readonly string[]`. `DistrictDefinition` gains `landmarks?: readonly string[]`, which `furnish` copies from the option.

- [ ] **Step 1: Write the failing tests.**
  - A set-piece placed by `furnish` appears with ids `<instanceId>/<n>` when given an id, and `<district>-<room>-set-<k>-<n>` otherwise.
  - Its rotated pieces match `facing`.
  - No composed piece overlaps it or its clearance.
  - A focal set-piece in the centre third suppresses the room's `focal` zone.
  - `setPiece` throws when any piece lands on an unwalkable tile.
- [ ] **Step 2: Run** the test. Expected: FAIL.
- [ ] **Step 3: Implement.** `setPiece` checks every footprint tile through `plan.at` semantics. `furnish` places set-pieces after reading fixtures, NPCs and assemblies, marks their tiles and clearance as occupied, adds their decals, then composes.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Place hand-composed set-pieces before composing rooms".

### Task 7: Condition overlay and the first ruin objects

**Files:**
- Create: `packages/shared/src/content/conditions.ts`, `packages/shared/src/content/districts/condition.ts`, `packages/shared/src/content/ruinObjects.ts`, `packages/client/src/render/models/ruinModels.ts`
- Modify: `packages/shared/src/world/entities.ts` (model union), `packages/shared/src/content/worldObjects.ts` (register), `packages/shared/src/content/prefabs/ruin.ts`, `packages/shared/src/content/districts/furnish.ts`, `packages/shared/src/world/district.ts`, `packages/client/src/render/models/objectModels.ts:336`
- Test: `packages/shared/test/condition.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Condition = 'pristine' | 'worn' | 'breached' | 'overgrown' | 'flooded' | 'alien' | 'uncanny';
  export interface ConditionRule { readonly swapShare: number; readonly swaps: Readonly<Partial<Record<WorldObjectId, WorldObjectId>>>; readonly adds: readonly string[]; readonly addsPerThousandTiles: number; readonly decals: readonly FloorDecalKind[]; readonly decalsPerThousandTiles: number }
  export const CONDITION_RULES: Readonly<Record<Condition, ConditionRule>>
  export function applyCondition(input: { readonly condition: Condition; readonly rect: TileRect; readonly seed: string; readonly composed: Composed; readonly clear: ReadonlySet<string>; readonly occupied: Set<string>; readonly objectOf: (id: WorldObjectId) => WorldObjectDefinition | undefined }): Composed
  ```
  `DistrictDefinition.condition?: Condition` (default `pristine`). `RoomDressing.condition?: Condition`.
- New objects, all non-interactive (`interactions: []`), each with a voxel model in `ruinModels.ts`:

| id | model | footprint | blocks |
| -- | ----- | --------- | ------ |
| `bench-toppled` | `benchToppled` | 1×1 | yes |
| `planter-toppled` | `planterToppled` | 1×1 | yes |
| `barricade` | `barricade` | 1×1 | yes |
| `debris-pile` | `debrisPile` | 1×1 | yes |
| `kiosk-burnt` | `kioskBurnt` | 1×1 | yes |
| `collapsed-slab` | `collapsedSlab` | 3×3 | yes |

- Ruin prefabs in `ruin.ts`, with roles `island`/`edge` and themes = all themes: `barricade-line` (4 barricades in a row), `rubble` (collapsed-slab plus 2 debris-pile), `debris` (2 debris-pile).

`CONDITION_RULES`:

| Condition | swapShare | swaps | adds | adds per 1000 tiles | decals | decals per 1000 tiles |
| --------- | --------- | ----- | ---- | ------------------- | ------ | --------------------- |
| pristine | 0 | none | none | 0 | none | 0 |
| worn | 0.1 | none | `debris` | 1 | `wear` | 4 |
| breached | 0.3 | `briefing-bench`→`bench-toppled`, `planter`→`planter-toppled`, `shuttered-kiosk`→`kiosk-burnt` | `barricade-line`, `rubble`, `debris` | 4 | `scorch`, `cracks` | 8 |
| overgrown | 0 | none | none | 0 | `moss` | 10 |
| flooded | 0 | none | `sandbagRow` | 2 | `water-stain` | 10 |
| alien | 0 | none | none | 0 | `alien-vein` | 8 |
| uncanny | 0 | none | none | 0 | none | 0 |

Wave 3–5 plans add the overgrown, flooded and alien variants.

- `uncanny` makes `furnish` treat the room's composition as `formal: true`. After composing, it copies one placed piece to the free tile mirrored across the room centre (if clear).
- Decal stamps are seeded rectangles 2–4 tiles on a side, placed on clear floor.
- Swaps apply to composed pieces only, never to fixtures or set-pieces with fixed ids. A swap keeps position and facing.

- [ ] **Step 1: Write the failing tests:**
  - `pristine` returns its input unchanged;
  - `breached` on a composed room with 20 benches swaps 6 ± 2 of them, deterministically;
  - every swap target exists in `WORLD_OBJECTS` and has the same footprint as its source;
  - adds never land on `clear`-excluded tiles;
  - `uncanny` adds exactly one mirrored duplicate.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/condition.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** objects, models (each fits its footprint × 16 voxels and is under 32 voxels tall), rules and `applyCondition`. `furnish` calls it after `composeRoom` with `entry.condition ?? district.condition ?? 'pristine'`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Weather rooms by condition".

### Task 8: Client decal painting

**Files:**
- Create: `packages/client/src/render/world/floorDecals.ts`
- Modify: `packages/client/src/render/world/levelVoxels.ts:76-110`, `packages/client/src/render/world/floorScatter.ts`, `packages/client/src/render/world/chunkView.ts:228-240`
- Test: `packages/client/test/floorDecals.test.ts`

**Interfaces:**
- Consumes: `decalIndex`, `DecalCell`, `ResolvedLevel.decals` (Task 4).
- Produces: `decalColor(cells: readonly DecalCell[], lx: number, lz: number, base: number, grain: number): number | null` (`null` means keep base). `paintTileRows(volume, layout, region, fromRow, toRow, decals?: ReadonlyMap<string, readonly DecalCell[]>)`.

Pattern rules (16 voxels per tile; `U = u*16+lx`, `V = v*16+lz`, rect width and height in voxels `W`, `H`):
- `solid`: whole rect.
- `border`: voxels within 3 of the rect edge.
- `checker`: `(floor(U/8)+floor(V/8)) % 2 === 0`.
- `stripe`: `floor((U+V)/6) % 2 === 0`.
- `compass`: radius `r` from the rect centre. Paint the ring `0.42 ≤ r/min(W,H) ≤ 0.48` and the four cardinal and four diagonal spokes 2 voxels wide out to 0.42, with the inner disc at 0.12 in a lighter tint.

Kind colours (overridden by `tint`):
- `inlay` `#c9b27a`
- `mosaic` `#3f7f9a` (checker uses `#d9d2bf` as the second colour)
- `rug` `#7a2f3a`
- `runner` `#8a3a2f`
- `lane-paint` `#d8c040`
- `hazard-paint` stripes `#c99a1c` and `#17170f`
- `wear` lightens the base by 0.12 where `grain > 0.55`
- `scorch` darkens by 0.55 where `grain > 0.35`
- `moss` `#3f6a2f` where `grain > 0.4`
- `water-stain` darkens by 0.25
- `salt-crust` `#e6e2d6` where `grain > 0.5`
- `alien-vein` `#9a3fd8` emissive where `grain > 0.82`
- `cracks` darken by 0.6 where `noise3(vx,0,vz,7) > 0.9`

- [ ] **Step 1: Write the failing tests:**
  - a `rug` with `border` pattern colours edge voxels and leaves the centre at base;
  - `compass` colours the centre voxel of a 5×5 rect with the inner tint and leaves a voxel at r/min = 0.3 off any spoke at base;
  - a later decal overrides an earlier one on the same voxel;
  - `alien-vein` voxels report emissive.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/floorDecals.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `chunkView` builds `decalIndex(level.decals)` once per zone and passes it to `paintTileRows`. `floorScatter` adds `leaf`/`tuft` on `moss`, `flake` on `scorch` and `shard` on `cracks`, and skips scatter on `rug`, `runner` and `inlay`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Paint floor decals into the level".

### Task 9: findFurnishingIssues, district conditions and the design guide

**Files:**
- Create: `packages/shared/src/content/furnishingIntegrity.ts`
- Modify: `packages/shared/src/content/contentIntegrity.ts:25`, every `packages/shared/src/content/districts/*.ts` that calls `furnish` (add `condition`), `WORLD_DESIGN.md` (rule 6 and a new "Furnishing" subsection)
- Test: `packages/shared/test/furnishingIntegrity.test.ts`, `packages/shared/test/worldAudit.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `findFurnishingIssues(content: GameContent): string[]`, called from `findContentIssues`.

Checks (spec section "Rules and checks"):
1. No dressing or set-piece tile is a door, exit, anchor, link or track tile, or lies within 2 tiles of a room opening.
2. **Reachability.** Per resolved level, on `createObjectWalkabilityGrid(level.layout, level.objects, …)`, flood fill from every room opening, 4-connected and limited to the room rect. Every walkable tile in the room must be reached.
3. Every room id in `district.landmarks` exists and holds a set-piece whose prefab has role `focal`. The rule that every district must declare a landmark is switched on in the wave 5 plan, once all districts have one.
4. A room with more than 150 walkable tiles uses at least 3 distinct prefabs. In non-formal compositions, no prefab is used more than 3 times.
5. Every decal tile is walkable floor (not `door`, `track` or `coolant`).
6. Every `CONDITION_RULES` swap target exists and keeps its source's footprint.
7. `findFixtureIssues` with footprints (Task 1) still runs.
8. `findPrefabIssues` for every prefab.

Composition and prefab use per room are needed for check 4. `furnish` records them on the district as `dressingLog?: readonly { room: string; composition: CompositionName; formal: boolean; prefabs: readonly string[]; setPieces: readonly { prefab: string; roles: readonly PrefabRole[] }[] }[]`.

District conditions: set exactly as in the spec's "Condition by district" table. Override the Atrium's `quarantine-gate` room to `breached`.

- [ ] **Step 1: Write the failing tests** in `furnishingIntegrity.test.ts`, on synthetic content:
  - a fixture line sealing a corner of a room is reported as unreachable tiles;
  - a decal on a door tile is reported;
  - a landmark room without a focal set-piece is reported;
  - a 20×20 room dressed with one prefab is reported.
  
  In `worldAudit.test.ts`, assert `findFurnishingIssues(GAME_CONTENT)` is empty.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/furnishingIntegrity.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the checks and assign conditions. Fix every real issue the audit reports in existing districts by adjusting dressing (density, composition override). Do not touch blueprints, and add no exemptions. Rewrite `WORLD_DESIGN.md` rule 6 to describe set-pieces, compositions, decals and conditions, and add a "Furnishing" subsection listing the checks above, marked **Checked**.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Look at it.** Run the game with `npm run dev` (via `preview_start`). Screenshot the Circuit, Service Yards, Sector 2 and the Salt Cathedral. Each should show composed rooms with no grids or blocked doors; breached districts show scorch and toppled benches.
- [ ] **Step 6: Commit** "Check furnishing and weather every district".

---

## Wave 2: Atrium flagship

### Task 10: Atrium large models

**Files:**
- Create: `packages/shared/src/content/setPieceObjects.ts`, `packages/client/src/render/models/setPieceModels.ts`
- Modify: `packages/shared/src/world/entities.ts` (model union), `packages/shared/src/content/worldObjects.ts`, `packages/client/src/render/models/objectModels.ts:336`
- Test: `packages/client/test/setPieceModels.test.ts`

**Interfaces:**
- Produces these object ids (all `interactions: []` except where noted, each with an `examine` line in the house voice, as in `furnitureObjects.ts`):

| id | model | footprint | blocks | light |
| -- | ----- | --------- | ------ | ----- |
| `fountain-basin` | `fountainBasin` | 3×3 | yes | `#7fd8ff`, r4, 0.35 |
| `fountain-grand` | `fountainGrand` | 5×5 | yes | `#7fd8ff`, r6, 0.45 |
| `monument-statue` | `monumentStatue` | 2×2 | yes | none |
| `bench-curve` | `benchCurve` | 3×1 | yes | none |
| `banner-mast` | `bannerMast` | 1×1 | yes | none |
| `glass-kiosk` | `glassKiosk` | 3×2 | yes | `#ffd27f`, r3, 0.3 |
| `directory-pylon` | `directoryPylon` | 1×1 | yes | `#4fd8ff`, r2, 0.3 |
| `reception-desk` | `receptionDesk` | 4×2 | yes | none |
| `map-table` | `mapTable` | 3×2 | yes | `#9fd8ff`, r2, 0.25 |
| `triage-station` | `triageStation` | 3×2 | yes | `#d8fff0`, r3, 0.3 |
| `transit-shelter` | `transitShelter` | 3×2 | no (`deck: true`) | none |
| `timetable-board` | `timetableBoard` | 3×1 | yes | `#ffb347`, r2, 0.3 |
| `ticket-barrier` | `ticketBarrier` | 1×1 | yes | none |
| `guard-booth` | `guardBooth` | 2×2 | yes | `#ff8a5a`, r2, 0.3 |
| `hydraulic-press` | `hydraulicPress` | 3×3 | yes | none |

`fountain-*` has an animated water part (a rising and falling jet). `banner-mast` has a gently swaying banner. `timetable-board` has a blinking row.

Add `timetableBoard` to `WALL_FIXTURE_MODELS`.

- [ ] **Step 1: Write the failing test:** for every object with a footprint, its built model's voxel extent fits within `footprint.width*16 × footprint.height*16` (centred) and its `heightVoxels` is between 4 and 64.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/setPieceModels.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** definitions and voxel models in the style of `furnitureModels.ts` (the `grained`/`jitter`/`noise3` palette helpers, `VOXEL_EMISSIVE` for lit parts, `VOXEL_GLASS` for the kiosk and shelter).
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Model the Atrium's large features".

### Task 11: Civic, office, transit, medical and industrial libraries

**Files:**
- Modify: `packages/shared/src/content/prefabs/civic.ts`, `office.ts`, `transit.ts`, `medical.ts`, `industrial.ts`
- Test: `packages/shared/test/prefabs.test.ts`

**Interfaces:**
- Consumes: Task 10 objects; `prefab` builder (Task 3).
- Produces these prefab ids (dx, dy and facings are the implementer's; each must pass `findPrefabIssues`):
  - **civic focal:** `fountain-court` (`fountain-grand` with four `bench-curve` facing it at distance 2, `compass` `mosaic` decal 11×11 under it, `symmetric`); `statue-court` (`monument-statue` with four `planter` at the corners and an `inlay` `border` decal 6×6, `symmetric`).
  - **civic island:** `fountain-corner` (`fountain-basin` with two `bench-curve` and a `rug`); `kiosk-island` (`glass-kiosk`, two `briefing-bench`, `trash-bin`); `bench-ring` (four `bench-curve` around a `planter`, `symmetric`); `info-stand` (`directory-pylon`, two `potted-fern`).
  - **civic edge:** `banner-pair` (two `banner-mast` four apart, `symmetric`); `pylon-bench` (`directory-pylon`, `briefing-bench`, `planter`).
  - **office focal and bay:** `reception` (`reception-desk`, two `office-chair` behind it, `rug` decal 6×4); `map-room` (`map-table`, four `office-chair`, `monitor-bank`).
  - **transit bay and edge:** `shelter-stop` (`transit-shelter`, two `briefing-bench` under it, `timetable-board` behind); `barrier-line` (five `ticket-barrier` with a `hazard-paint` `stripe` decal 5×1 in front, `symmetric`).
  - **transit wall:** `timetable-wall` (`timetable-board`, `trash-bin`).
  - **medical focal:** `triage-hub` (`triage-station`, four `gurney` around it, `inlay` `border` decal 7×6).
  - **industrial focal:** `press-cell` (`hydraulic-press`, `tool-cart`, `workbench`, `hazard-paint` `border` decal 5×5).
  - **civic and works focal:** `checkpoint` (two `guard-booth` either side of four `ticket-barrier`, `hazard-paint` decal, `symmetric`).

- [ ] **Step 1: Extend the test:** every id above exists; the roles `focal`, `island` and `edge` each have at least 3 civic prefabs; `fountain-court` and `checkpoint` are `symmetric`.
- [ ] **Step 2: Run** the prefab test. Expected: FAIL.
- [ ] **Step 3: Implement** the prefabs.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Add Atrium prefab libraries".

### Task 12: Hand-compose the Atrium

**Files:**
- Modify: `packages/shared/src/content/districts/meridianAtrium.ts`
- Test: `packages/shared/test/furnish.test.ts`

**Interfaces:**
- Consumes: `setPiece`, `FurnishOptions.setPieces`/`landmarks` (Task 6); Task 11 prefabs; `FloorDecal` (Task 4).

Set-pieces (spec table, Atrium rows):

| Room | Set-pieces |
| ---- | ---------- |
| `plaza` | `fountain-court` would collide with `atrium-core` at (29,25), so the core stays and gets a hand `mosaic` `compass` decal 13×13 centred on it. Add four `fountain-corner` on the diagonals, about 14 tiles from the core. Add `bench-ring` north and south of the core. Add `banner-pair` on the quarantine-gate axis at the north door. Add `runner` decals 3 wide from the core to each of the six openings. |
| `quarantine-gate` | `checkpoint` centred 5 tiles south of the bulkhead. Room condition `breached`. |
| `lift-bay` | `shelter-stop` along the platform edge; `timetable-wall` on the east wall. |
| `medbay` | `triage-hub` at the room centre. |
| `requisitions`, `response-office`, `archives` | `reception` facing the main door. |
| `workshop`, `engineering` | `press-cell` at the room centre. |
| `west-gate` | `info-stand` either side of the exit. |
| `east-gate` | `kiosk-island` near the exit. |

Additional rules:
- Delete the fixtures these replace: `plaza-bench-a`, `plaza-bench-b`, `planter-nw`, `planter-ne`, `planter-sw`, `planter-se`. Keep `plaza-pillar-*`, `atrium-contract-board`, `plaza-directory` and every quest or service fixture. Grep for each deleted id first; none may be referenced elsewhere. The `mb-plaza-*` ids in `meridianBelow.ts` are separate.
- Dressing: `plaza` uses composition `radial`; `quarantine-gate` uses `court` with condition `breached`; other rooms use their inferred composition. District `condition: 'pristine'`, `landmarks: ['plaza']`.
- Every set-piece has `instanceId` `atrium-<room>-<name>` so they are stable.

- [ ] **Step 1: Write the failing test:** the Atrium declares `landmarks: ['plaza']`; the plaza holds pieces of `fountain-basin` ×4 and `bench-curve` ≥ 8; the Atrium's decals include a `mosaic` `compass` that contains `atrium-core`'s tile; the quarantine-gate room contains a `guard-booth`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/furnish.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the set-pieces. Tune the offsets until `findFurnishingIssues` is empty.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Look at it.** Run the game (`preview_start`) and screenshot the plaza from all four sides, plus each Atrium room. Iterate on offsets and prefab choices until the plaza reads as a composed space: a centrepiece, framed seating, routes to each wing, no grid.
- [ ] **Step 6: Commit** "Hand-compose the Meridian Atrium".
- [ ] **Step 7: Hand to the user** with the screenshots for the in-game review that gates waves 3 to 5.
