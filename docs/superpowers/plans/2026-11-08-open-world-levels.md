# Open World Sub-project 1: Levels, Districts and Chunked Interest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace standalone zones with continuous levels assembled from placed districts. The server sends each player only what is inside their 3 × 3 chunk interest set, and the game stays fully playable.

**Architecture:** Districts (today's zones, renamed) keep district-local content. A pure `resolveLevel` stamps districts and connectors onto one level layout and translates every placement into level coordinates. The result, `ResolvedLevel`, looks almost like today's `ZoneDefinition`, so `LevelInstance` and the client scene change little. Interest management is a chunk index on `LevelInstance` plus `broadcastNear`.

**Tech Stack:** TypeScript (erasable only), Node 24 `node:test`, npm workspaces, Three.js client.

**Spec:** `docs/superpowers/specs/2026-11-08-open-world-design.md` (sections 1 and 2 are binding; section 2's "Sub-project 1 client changes" is in scope)

## Global Constraints

- Write no code comments. Use erasable TypeScript only (no enums, namespaces or parameter properties). Imports use `.ts` extensions.
- The server is authoritative and validates every client intent.
- `npm run typecheck` and `npm test` must pass at the end of every task.
- `CHUNK_SIZE = 32` and `INTEREST_RADIUS = 1` (a 3 × 3 chunk interest set).
- `main-floor` capacity is 300. The pathfinding node cap stays 6000.
- District content positions stay district-local. Only resolved data is in level coordinates.
- Gated same-level links stay teleports with unchanged conditions. Only the Hydroponics tram pair becomes a walkable connector.

## Review Focus

1. **A legacy character saved on a tile that is no longer walkable, or in an unknown zone.** It loads at a walkable point instead of inside a wall or void. Test: Task 5, `legacy locations convert…`.
2. **A same-level teleport across the level, such as a Deepwatch lift.** The player gets `world.chunksLeft` and `world.chunksEntered`, and old observers see them despawn. Test: Task 7, `a same-level teleport swaps interest`.
3. **A creature whose target walks or teleports out of its interest, so the creature becomes unwatched.** It must not stay dormant mid-chase. It drops the target and is reset home at full health. Test: Task 8, `an abandoned creature resets home`.
4. **A private ground item in a chunk the owner re-enters.** The owner sees it again, and other players don't. Test: Task 7, `chunk entry respects ground-item privacy`.
5. **Entering a level.** `world.entered` must include self and nearby entities, but never far ones. Test: Task 7, `world.entered carries only the interest set`.

---

## File Structure

| File | Responsibility |
| ---- | -------------- |
| `packages/shared/src/world/district.ts` (renamed from `zone.ts`) | `DistrictDefinition`, placements, ambience, `TileLayout`, `parseTileLayout`, `createWalkabilityGrid` |
| `packages/shared/src/world/chunks.ts` (new) | Chunk constants, `chunkOf`, `chunkKey`, `interestSet`, `interestDelta` |
| `packages/shared/src/world/level.ts` (new) | `LevelDefinition`, `ConnectorDefinition`, `DistrictPlacement`, `WorldLocation` |
| `packages/shared/src/world/levelLayout.ts` (new) | `assembleLevel`, `LevelLayout`, `resolveLevel`, `ResolvedLevel`, `ResolvedArea` |
| `packages/shared/src/content/districts/*.ts` (renamed from `content/zones/`) | District content |
| `packages/shared/src/content/levels/*.ts` (new) | One file per level, with connector maps |
| `packages/shared/src/content/levelIndex.ts` (new) | `locate`, `levelOfDistrict` construction |
| `packages/shared/src/content/levelIntegrity.ts` (new) | `findLevelIssues`, called from `findContentIssues` |
| `packages/server/src/world/levelInstance.ts` (renamed from `zoneInstance.ts`) | Level layer state, chunk index, `broadcastNear` |
| `packages/server/src/world/chunkIndex.ts` (new) | `ChunkIndex`: chunk → entity ids, kept in sync on move/spawn/despawn |
| `packages/server/src/characters/legacyLocation.ts` (new) | `upgradeLegacyLocation` |

---

### Task 1: Rename the zone vocabulary to districts

A mechanical rename with no behaviour change. Character `location` keeps its current shape until Task 5.

**Files:**
- Rename: `packages/shared/src/world/zone.ts` → `district.ts`; `packages/shared/src/content/zones/` → `content/districts/`
- Modify: every file in the "zone references" list (`grep -rn "ZoneDefinition\|ZoneId\|ZoneLayout\|parseZoneLayout\|content.zones\|zones:" packages --include=*.ts`)
- Test: existing suites

**Interfaces:**
- Produces:
  - `DistrictId` (replaces `ZoneId` in `ids.ts`);
  - `DistrictDefinition` (replaces `ZoneDefinition`);
  - `TileLayout` (replaces `ZoneLayout`);
  - `parseTileLayout(map)` (replaces `parseZoneLayout`);
  - `GameContent.districts` (replaces `zones`).
- Produces: renamed fields:
  - `GameEffect` teleport `{ type: 'teleport'; districtId; position }`;
  - `QuestObjective` `enterArea.districtId`;
  - `QuestEvent` `enteredArea.districtId`;
  - `DistrictDefinition.recovery?: { districtId; position }`.
- Unchanged: `ZoneLocation`, `CharacterRecord.location.zoneId`, `ZoneInstance` and `world.entered.zoneId` keep their names until Task 5. Where they hold a district id, the value is a `DistrictId`.

- [ ] **Step 1:** Rename the files and identifiers listed above across all three packages, including content (`teleport`, `enterArea`, `recovery` literals) and tests.
- [ ] **Step 2:** Run `npm run typecheck`. Expected: exit 0.
- [ ] **Step 3:** Run `npm test`. Expected: all suites pass, with the same count as before the rename.
- [ ] **Step 4:** Commit: `git commit -am "Rename zones to districts"`

---

### Task 2: Chunk maths

**Files:**
- Create: `packages/shared/src/world/chunks.ts`, exported from `packages/shared/src/index.ts`
- Test: `packages/shared/test/chunks.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const CHUNK_SIZE = 32;
  export const INTEREST_RADIUS = 1;
  export interface ChunkCoord { readonly cx: number; readonly cy: number }
  export type ChunkKey = string;
  export function chunkOf(point: TilePoint): ChunkCoord;
  export function chunkKey(chunk: ChunkCoord): ChunkKey;
  export function chunkKeyOf(point: TilePoint): ChunkKey;
  export function interestSet(chunk: ChunkCoord): ReadonlySet<ChunkKey>;
  export function interestDelta(from: ChunkCoord | null, to: ChunkCoord): { readonly entered: readonly ChunkKey[]; readonly left: readonly ChunkKey[] };
  ```
  `chunkKey` formats as `` `${cx},${cy}` ``. Chunks with negative coordinates are allowed and simply hold no tiles.

- [ ] **Step 1: Write the failing tests**

```ts
test('chunkOf floors tiles into 32-tile chunks', () => {
  assert.deepEqual(chunkOf({ x: 0, y: 0 }), { cx: 0, cy: 0 });
  assert.deepEqual(chunkOf({ x: 31, y: 32 }), { cx: 0, cy: 1 });
  assert.deepEqual(chunkOf({ x: 64, y: 95 }), { cx: 2, cy: 2 });
});
test('interestSet is the 3x3 block around a chunk', () => {
  const set = interestSet({ cx: 1, cy: 1 });
  assert.equal(set.size, 9);
  assert.ok(set.has('0,0') && set.has('2,2') && set.has('1,1'));
  assert.ok(!set.has('3,1'));
});
test('interestDelta from nothing enters all nine chunks', () => {
  assert.deepEqual(interestDelta(null, { cx: 0, cy: 0 }).entered.length, 9);
  assert.deepEqual(interestDelta(null, { cx: 0, cy: 0 }).left, []);
});
test('interestDelta stepping one chunk east enters and leaves one column', () => {
  const delta = interestDelta({ cx: 1, cy: 1 }, { cx: 2, cy: 1 });
  assert.deepEqual([...delta.entered].sort(), ['3,0', '3,1', '3,2']);
  assert.deepEqual([...delta.left].sort(), ['0,0', '0,1', '0,2']);
});
test('interestDelta to the same chunk is empty', () => {
  assert.deepEqual(interestDelta({ cx: 4, cy: 4 }, { cx: 4, cy: 4 }), { entered: [], left: [] });
});
```

- [ ] **Step 2:** Run `node --test packages/shared/test/chunks.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `chunks.ts` with the signatures above.
- [ ] **Step 4:** Run the test again. Expected: PASS. Then run `npm run typecheck`.
- [ ] **Step 5:** Commit: `git commit -m "Add chunk interest maths"`

---

### Task 3: Level model, assembly and resolution

**Files:**
- Create: `packages/shared/src/world/level.ts` and `packages/shared/src/world/levelLayout.ts`, both exported from `index.ts`
- Modify: `packages/shared/src/ids.ts` (add `LevelId` and `ConnectorId` as `string`)
- Test: `packages/shared/test/levelLayout.test.ts`

**Interfaces:**
- Consumes: `DistrictDefinition`, `TileLayout` and `parseTileLayout` (Task 1)
- Produces in `level.ts`: `DistrictPlacement`, `ConnectorDefinition` and `LevelDefinition`, exactly as in spec §1 but with no `recovery` field, plus:
  ```ts
  export interface WorldLocation { readonly levelId: LevelId; readonly position: TilePoint }
  ```
- Produces in `levelLayout.ts`:
  ```ts
  export interface LevelLayout extends TileLayout {
    districtAt(point: TilePoint): DistrictId | undefined;
    connectorAt(point: TilePoint): ConnectorId | undefined;
    toLevelPoint(districtId: DistrictId, local: TilePoint): TilePoint;
    toLocalPoint(point: TilePoint): { readonly districtId: DistrictId; readonly position: TilePoint } | undefined;
  }
  export function assembleLevel(level: LevelDefinition, districts: ReadonlyMap<DistrictId, DistrictDefinition>): LevelLayout;
  export interface ResolvedArea extends AreaDefinition { readonly districtId: DistrictId }
  export interface ResolvedLevel {
    readonly definition: LevelDefinition;
    readonly id: LevelId;
    readonly name: string;
    readonly layout: LevelLayout;
    readonly spawn: TilePoint;
    readonly capacity?: number;
    readonly ambience: ZoneAmbience;
    readonly areas: readonly ResolvedArea[];
    readonly npcs: readonly NpcPlacement[];
    readonly objects: readonly ObjectPlacement[];
    readonly creatures: readonly CreaturePlacement[];
    readonly lights: readonly ZoneLight[];
    ambienceAt(point: TilePoint): ZoneAmbience;
  }
  export function resolveLevel(level: LevelDefinition, districts: ReadonlyMap<DistrictId, DistrictDefinition>): ResolvedLevel;
  ```
- **`assembleLevel` stamping:** placements are stamped in order (districts, then connectors). A tile's owner is the placement whose map covers it with a non-`void` symbol. `width` and `height` are the max extents, and unstamped tiles are `void`. `toLevelPoint` throws for a district that isn't on the level.
- **`resolveLevel` translation:** every district's areas (each tagged with `districtId`), placements and lights are offset by that district's origin. Connector lights are offset by the connector origin.
- **`resolveLevel` ambience:** `ambience` is the spawn district's. `ambienceAt` returns the ambience of the district or connector under the point, falling back to `ambience`.

- [ ] **Step 1: Write the failing tests.** Build a fixture with two 4 × 3 districts (`a` at origin `{0,0}`, `b` at `{6,0}`) and a 2 × 3 connector at `{4,0}`. Test names and assertions:
  - `assembleLevel stamps districts and connectors at their origins`: `layout.width === 10`, `layout.height === 3`, `districtAt({x:7,y:1}) === 'b'`, `connectorAt({x:4,y:1}) === 'link'`, `tileAt({x:20,y:1}) === 'void'`
  - `toLevelPoint and toLocalPoint round-trip`: `toLevelPoint('b', {x:1,y:1})` deep-equals `{x:7,y:1}`, and `toLocalPoint({x:7,y:1})` deep-equals `{ districtId: 'b', position: {x:1,y:1} }`
  - `toLocalPoint is undefined on connectors and void`: true for both `{x:4,y:1}` and `{x:20,y:1}`
  - `resolveLevel offsets placements, areas and lights per district`: an NPC at local `{1,1}` in `b` resolves to `{7,1}`, and its area rect `x` shifts by 6 and carries `districtId: 'b'`
  - `resolveLevel uses the spawn district for ambience and ambienceAt per tile`
- [ ] **Step 2:** Run `node --test packages/shared/test/levelLayout.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `level.ts` and `levelLayout.ts`.
- [ ] **Step 4:** Run the test (expected: PASS), then `npm run typecheck`.
- [ ] **Step 5:** Commit: `git commit -m "Add level assembly and resolution"`

---

### Task 4: Level content and integrity

The server keeps running on districts in this task. Districts keep `spawn` and `capacity` until Task 5 removes them.

**Files:**
- Create:
  - `packages/shared/src/content/levels/mainFloor.ts`, `undercroftLevel.ts`, `theDeep.ts`, `theThreshold.ts` and `meridianBelowLevel.ts`;
  - `packages/shared/src/content/levelIndex.ts`;
  - `packages/shared/src/content/levelIntegrity.ts`.
- Modify:
  - `content/gameContent.ts`;
  - `content/contentIntegrity.ts`;
  - `content/districts/meridianAtrium.ts` (map row 26: `(0,26)` `#`→`D`);
  - `content/districts/hydroponics.ts` (one east-wall tile → `D`, see Step 3);
  - `content/districts/intakeWing.ts` (add `recovery: { districtId: 'intake-wing', position: <its spawn> }`).
- Test: `packages/shared/test/levels.test.ts`, `packages/shared/test/content.test.ts`

**Interfaces:**
- Consumes: `resolveLevel` and `LevelDefinition` (Task 3)
- Produces:
  - `GameContent.levels: ReadonlyMap<LevelId, ResolvedLevel>`;
  - `GameContent.levelOfDistrict: ReadonlyMap<DistrictId, LevelId>`;
  - `locate(content: GameContent, districtId: DistrictId, local: TilePoint): WorldLocation | undefined` in `levelIndex.ts`;
  - `findLevelIssues(content: GameContent): string[]`, whose issues are appended by `findContentIssues`.

Level data (origins are level coordinates):

| Level | Kind / depth | Districts at origin | Spawn | Capacity |
| ----- | ------------ | ------------------- | ----- | -------- |
| `main-floor` "Site Meridian" | floor / 0 | hydroponics `{0,30}`, meridian-atrium `{52,26}`, sector-two `{59,0}`, intake-wing `{52,64}` | meridian-atrium `{5,28}` | 300 |
| `b1-undercroft` "Undercroft" | floor / -1 | undercroft `{0,0}` | undercroft `{5,4}` | default |
| `the-deep` "The Deep" | floor / -2 | deepwatch `{60,0}`, cryovault `{0,30}`, signal-array `{48,30}`, drowned-archive `{96,30}`, furnace `{100,0}` | deepwatch `{3,10}` | 200 |
| `the-threshold` "The Threshold" | pocket / -2 | sector-three `{0,0}` | sector-three `{3,6}` | default |
| `meridian-below` "Meridian Below" | pocket / -4 | meridian-below `{0,0}` | meridian-below `{5,5}` | default |

- **Verdance Concourse** (connector on `main-floor`): spans x 38–51 at origin `{38, 51}`. It is a three-row corridor (wall / floor / wall) 14 tiles wide, using `#` and `.`, joining the Hydroponics east-wall door (level x 37) to the Atrium west-wall door (level `{52,52}`). It carries cool green ambience and two lights.
- **Single-district levels:** a district whose definition had `capacity` passes it on to its single-district level.

- [ ] **Step 1: Write the failing tests** in `levels.test.ts`:
  - `every district belongs to exactly one level`: `levelOfDistrict.size === districts.size`
  - `locate translates district-local points into level points`: `locate(GAME_CONTENT, 'meridian-atrium', {x:5,y:28})` deep-equals `{ levelId: 'main-floor', position: {x:57,y:54} }`
  - `locate is undefined for an unknown district`
  - `the Verdance Concourse joins the Atrium and Hydroponics`: a BFS over `main-floor`'s walkability grid (`createWalkabilityGrid` with blocking objects) from the level spawn reaches `locate(…,'hydroponics',{x:3,y:12})`'s position
  - `findLevelIssues reports overlapping placements` (fixture level, two districts at the same origin)
  - `findLevelIssues reports unreachable walkable tiles` (fixture with an isolated floor pocket)
  - `findLevelIssues reports duplicate instance ids within a level`
  - `findLevelIssues treats teleport destinations as reachable from their source object` (fixture: two districts separated by void, joined only by a teleport object)
- [ ] **Step 2:** Run `node --test packages/shared/test/levels.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Author the five level files and `levelIndex.ts`, then wire them into `GameContent`.
  - Edit the Atrium door.
  - For Hydroponics, open a door in its east wall on the row nearest level y 52 whose inner tile (local x 36) is walkable. If that row isn't y 52, bend the concourse so the seam still lines up.
- [ ] **Step 4:** Implement `findLevelIssues`.
  - **Overlap:** no non-void tile is claimed by two placements.
  - **Reachability:** every walkable tile is reachable from the level spawn by 4-way walking plus teleport edges. A teleport edge runs from the tiles cardinally adjacent to each object on the level whose interaction has a `teleport` into the same level, to the teleport's located destination.
  - **Ids:** instance ids are unique per level.
  - **Walkability:** the spawn, every teleport destination and every district `recovery` are walkable in the assembled level.
  - Change the existing teleport and `enterArea` checks in `contentIntegrity.ts` to use `content.districts`, and keep them.
- [ ] **Step 5:** Run `npm test`. Expected: all pass, including `content.test.ts` (no content issues).
- [ ] **Step 6:** Run `npm run typecheck`, then commit: `git commit -m "Add level content and level integrity checks"`

---

### Task 5: Cut the server and client over to levels

After this task, players live on levels in level coordinates. Messages are still broadcast to the whole layer.

**Files:**
- Rename: `packages/server/src/world/zoneInstance.ts` → `levelInstance.ts` (`ZoneInstance` → `LevelInstance`)
- Create: `packages/server/src/characters/legacyLocation.ts`
- Modify (shared):
  - `character/character.ts`: `location: WorldLocation`; `CharacterSummary.districtId`
  - `content/gameContent.ts`: `newCharacter.startingLocation` via `locate` at intake-wing `{4,5}`
  - `world/district.ts`: drop `spawn` and `capacity` from `DistrictDefinition`, and from every district file
  - `protocol/serverMessages.ts`: `world.entered.levelId` replaces `zoneId`
  - `content/worldObjects.ts`: delete `atrium-hydroponics-tram` and `hydroponics-tram`, and their placements in `meridianAtrium.ts` and `hydroponics.ts`
- Modify (server): `world/world.ts`, `world/player.ts`, `gameplay/gameplay.ts`, `gameplay/effectRunner.ts`, `gameplay/*Controller.ts`, `characters/characterRepository.ts`, `characters/characterService.ts`
- Modify (client):
  - `state/worldState.ts`: `ActiveZone.definition` becomes `ResolvedLevel`, and `layout` becomes `LevelLayout`, read from `GAME_CONTENT.levels.get(message.levelId)`
  - `render/world/zoneScene.ts`
  - `hud/minimap.ts`
  - `screens/rosterScreen.ts`: `GAME_CONTENT.districts.get(character.districtId)`
- Test: port `packages/server/test/*.test.ts`; add `packages/server/test/levels.test.ts`; update `test/support/testHarness.ts`

**Interfaces:**
- Consumes: `ResolvedLevel`, `locate`, `GameContent.levels` and `levelOfDistrict` (Tasks 3–4)
- `LevelInstance`:
  - `constructor(level: ResolvedLevel, content: GameContent, layer: number)`;
  - `definition: ResolvedLevel` and `id: LevelId`;
  - `areasAt(point): ResolvedArea[]`;
  - all other members keep their current names and behaviour.
- `World`:
  - `levelOf(player): LevelInstance` and `findLevelOf(player)`;
  - `layersOf(levelId)`;
  - `capacityOf(level: ResolvedLevel)`;
  - `transfer(player, location: WorldLocation)`;
  - `WorldHooks.onAreaEntered(player, districtId: DistrictId, areaId)`, fired with `area.districtId`;
  - `World.districtOf(player): DistrictId | undefined`, which uses `layout.districtAt`.
- `Player`: `levelId: LevelId` replaces `zoneId`, and `relocate(location: WorldLocation)`.
- `EffectHost.teleport(player, location: WorldLocation)`. `EffectRunner` resolves `teleport` through `locate`. When `locate` returns undefined, it notifies `'warning'` with "That route is not available." and logs `console.warn`.
- **Recovery:** in `gameplay.ts`, the district under the player supplies its `recovery`, located via `locate`. Without one, recovery goes to the player's level spawn. The notice names the recovery district's `name`.
- `upgradeLegacyLocation(stored: unknown, content: GameContent): WorldLocation`.
  - `{ zoneId, position }` converts via `locate`.
  - An unknown zone, or a resulting tile that isn't walkable on the resolved level, gives the main-floor spawn.
  - An already-current `{ levelId, position }` is returned unchanged.
  - `parseRecord` calls it, and its signature gains `content: GameContent`. Thread `GAME_CONTENT` through `CharacterRepository`'s constructor.
- Test harness:
  - `export function at(districtId: DistrictId, local: TilePoint): WorldLocation` throws for unknown districts;
  - `export function levelPoint(districtId: DistrictId, local: TilePoint): TilePoint`;
  - every test location or position assertion written in district-local numbers is wrapped in these.

- [ ] **Step 1: Write the failing tests** in `server/test/levels.test.ts`:
  - `legacy locations convert to level coordinates`: `upgradeLegacyLocation({ zoneId: 'hydroponics', position: {x:4,y:10} }, GAME_CONTENT)` deep-equals `at('hydroponics', {x:4,y:10})`
  - `legacy locations convert to the main-floor spawn when the zone is gone`: `{ zoneId: 'sector-nine', position: {x:1,y:1} }` gives `{ levelId: 'main-floor', position: levelPoint('meridian-atrium', {x:5,y:28}) }`
  - `legacy locations on an unwalkable tile fall back to the main-floor spawn`: `{ zoneId: 'meridian-atrium', position: {x:0,y:0} }` gives the main-floor spawn
  - `current locations pass through unchanged`
  - `walking from the Atrium into Hydroponics needs no teleport`: harness at `at('meridian-atrium', {x:3,y:26})` walks toward `levelPoint('hydroponics', {x:3,y:12})` in hops of 20 tiles or fewer. `ticksUntil` arrives, `world.districtOf(player) === 'hydroponics'`, and `sink.messages` contains exactly one `world.entered`.
  - `a gated same-level lift still teleports within the level`: a player with `clearance.cryovault`, standing next to the Deepwatch cryovault lift, interacts. They end with `levelId === 'the-deep'` and `districtOf === 'cryovault'`.
  - `incapacitation in the Intake Wing recovers in the Intake Wing`
- [ ] **Step 2:** Run `node --test packages/server/test/levels.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the shared, server and client changes listed above. In `hub.test.ts`, replace the Hydroponics tram ride test with the walking test from Step 1, and port every other suite to `at` and `levelPoint`.
- [ ] **Step 4:** Run `npm run typecheck`, then `npm test`. Expected: both pass.
- [ ] **Step 5:** Run `npm run dev` and use the built-in browser preview. Log in, confirm the Atrium renders, walk into Hydroponics through the concourse, and check the console for errors.
- [ ] **Step 6:** Commit: `git commit -am "Run the world on levels assembled from districts"`

---

### Task 6: Client level presentation

**Files:**
- Modify:
  - `packages/client/src/hud/minimap.ts`: draw a 64 × 64 tile window centred on the player, redrawn when the player moves 8+ tiles from the last centre. The title shows the district under the player, plus `· L{layer}`. Click-to-walk and the destination marker translate through the window offset.
  - `packages/client/src/render/world/zoneScene.ts`: scene darkness, tint and fog come from `definition.ambienceAt(self position)` on entering. Each ceiling fixture is `'failing'` when `ambienceAt(fixture).fixtures === 'failing'`.
  - `packages/client/src/screens/gameScreen.ts`: when the district under the player changes, update the area/location label to that district's `name` and `subtitle`.

**Interfaces:**
- Consumes: `ResolvedLevel.ambienceAt` and `LevelLayout.districtAt` (Task 3); `WorldState.zone` (Task 5)

- [ ] **Step 1:** Implement the three changes.
- [ ] **Step 2:** Run `npm run typecheck`. Expected: exit 0.
- [ ] **Step 3:** Run `npm run dev` with the preview. Walk from the Atrium into Hydroponics, checking that the minimap scrolls and its title switches from "Meridian Atrium" to "Hydroponics". Take the service lift to the Undercroft and confirm the failing fixtures flicker there. Take a screenshot as proof, and check the console for errors.
- [ ] **Step 4:** Commit: `git commit -am "Show the district under the player and window the minimap"`

---

### Task 7: Chunked interest on the server

**Files:**
- Create: `packages/server/src/world/chunkIndex.ts`
- Modify:
  - `world/levelInstance.ts`;
  - `world/world.ts`;
  - every `.broadcast(` call site in `gameplay/*.ts` and `world/*.ts`, plus `chatController.ts`;
  - `packages/shared/src/protocol/serverMessages.ts`;
  - `packages/client/src/state/worldState.ts`.
- Test: `packages/server/test/interest.test.ts`

**Interfaces:**
- Consumes: `chunkOf`, `chunkKeyOf`, `interestSet` and `interestDelta` (Task 2)
- `ChunkIndex`:
  - `place(entityId: EntityId, point: TilePoint): { from: ChunkKey | null; to: ChunkKey }`;
  - `remove(entityId)`;
  - `entitiesIn(chunk: ChunkKey): ReadonlySet<EntityId>`;
  - `chunkOfEntity(entityId): ChunkKey | undefined`.
- `LevelInstance`:
  - `readonly chunks: ChunkIndex`;
  - `observersOf(point: TilePoint): Player[]`, the players whose interest set contains `chunkKeyOf(point)`;
  - `broadcastNear(point, message, exceptEntityId?)`;
  - `entitySnapshotsIn(chunks: Iterable<ChunkKey>)`;
  - `groundItemsVisibleIn(chunks, entityId)`;
  - `depletedObjectsIn(chunks)`.
  - `broadcast` is deleted.
- `Player.interestChunk: ChunkCoord | null` holds the chunk whose interest set the player last received.
- New server messages:
  ```ts
  | { readonly type: 'world.chunksEntered'; readonly chunks: readonly ChunkKey[]; readonly entities: readonly EntitySnapshot[]; readonly groundItems: readonly GroundItemSnapshot[]; readonly depletedObjects: readonly string[] }
  | { readonly type: 'world.chunksLeft'; readonly chunks: readonly ChunkKey[] }
  ```
- **`World.tick` per layer:**
  1. Advance walkers and players as today, recording `{ movement, fromChunk, toChunk }`.
  2. Group movements by `toChunk`, and send each player one `world.tick` holding the movements in their interest set (none if empty).
  3. For each moved non-self entity whose chunk changed, send `world.entityDespawned` to observers of `fromChunk` that aren't observers of `toChunk`, and `world.entitySpawned` to the reverse.
  4. For each player whose chunk changed, send `world.chunksLeft` for `delta.left`, then `world.chunksEntered` for `delta.entered`, and update `interestChunk`.
- **Same-level `transfer`:** moves the player in place, without despawn and spawn, then applies the step 3 and step 4 rules.
- **`world.entered`:** its payload covers only the initial interest set.
- **Broadcast routing:**
  - spawn and despawn: `broadcastNear` at the entity's position;
  - combat messages: at the target's position;
  - gathering depletion: at the object's position;
  - ground items: at the item's position, filtered by `isGroundItemVisibleTo`;
  - chat and speech: at the speaker's position.
- **Client `worldState`:**
  - `world.chunksEntered` upserts entities, ground items and depleted flags;
  - `world.chunksLeft` removes every non-self entity and ground item whose tile is in a left chunk, and clears depleted flags for objects positioned in those chunks.

- [ ] **Step 1: Write the failing tests** in `interest.test.ts`. The whole main floor fits inside one interest set from the Atrium, so these tests run on `the-deep`, which is 144 tiles wide. Use two `RecordingSink` players with `capacityOverride` large enough to share a layer, following `scaling.test.ts`'s `crowd` pattern, and give them the `clearance.*` flags they need. Tests:
  - `world.entered carries only the interest set`: a player at `at('cryovault', {x:4,y:4})`, which is level `{4,34}`, chunk `0,1`. `entities` includes self, and excludes every Furnace and Drowned Archive placement (level x ≥ 96). Assert at least one exclusion.
  - `a far player receives no movement ticks`: A is at `at('cryovault', {x:4,y:4})` and B at `at('drowned-archive', {x:4,y:4})`, in chunks `0,1` and `3,1`. A walks one tile, and B's sink gains no `world.tick` mentioning A.
  - `walking across a chunk boundary sends chunksLeft then chunksEntered`: in the Cryovault, walk from level x 4 to level x 33, crossing x = 32. The last two interest messages are `world.chunksLeft` (3 keys) followed by `world.chunksEntered` (3 keys).
  - `an entity crossing into view spawns for the observer`
  - `a same-level teleport swaps interest`: a player with `clearance.cryovault` uses the Deepwatch cryovault lift. They receive `world.chunksLeft` and `world.chunksEntered`, and no `world.entered`. A second player standing at the lift gets `world.entityDespawned` for them.
  - `chunk entry respects ground-item privacy`: A drops an item, walks out of interest and back. A's `chunksEntered` includes the item, and B's (B also walking in) does not, while the item is under `OWNER_PRIVACY_TICKS`.
  - `local chat only reaches nearby players`
- [ ] **Step 2:** Run `node --test packages/server/test/interest.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `ChunkIndex`, keeping it in sync wherever positions change: walker advance, creature respawn, spawn, despawn and transfer. Then implement the `LevelInstance` and `World` changes, the call-site migration and the client handlers.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: both pass, including the existing combat, groundItems and scaling suites.
- [ ] **Step 5:** Run `npm run dev` with the preview, using two browser tabs logged into different accounts on the main floor. Confirm each player sees the other and that movement still animates smoothly. Check the console for errors. Separation by interest is proven by the tests above, because the main floor fits in a single interest set.
- [ ] **Step 6:** Commit: `git commit -am "Send each player only their chunk interest set"`

---

### Task 8: Dormancy and interest-bounded intents

**Files:**
- Modify: `packages/server/src/world/world.ts`, `packages/server/src/gameplay/combatController.ts`, `packages/server/src/gameplay/interactionController.ts`
- Test: `packages/server/test/interest.test.ts`

**Interfaces:**
- `LevelInstance.watchedChunks(): ReadonlySet<ChunkKey>` is the union of every player's interest set, recomputed once per tick before simulation.
- `World.walk` rejects targets not in `interestSet(chunkOf(player.position))`. This replaces the `MAX_WALK_DISTANCE` check.
- `InteractionController.request` rejects NPC, object and ground-item targets whose position isn't in the player's interest set.
- **Dormancy:** NPC wander and creature advance skip entities in unwatched chunks, and creature aggro and leash checks do the same. Respawn and depletion timers, and ground-item expiry, still run.
- **Abandonment:** when a creature has a `targetId` whose player is no longer in the layer, or is outside the creature's interest set, the creature drops the target. If its chunk is unwatched, it is placed at `home` at full integrity in the same tick.

- [ ] **Step 1: Write the failing tests:**
  - `an unwatched creature does not aggro or wander`: put the only player in the Cryovault (chunk x ≤ 1) and pick an aggressive Furnace creature (level x ≥ 100), then run 50 ticks. The creature's position equals its home, and its `targetId` is null.
  - `an unwatched creature still respawns`: defeat a Cryovault creature, ride `cryovault-return` to Deepwatch, and tick past `respawnTicks`. The creature's state is not `'despawned'`.
  - `an abandoned creature resets home`: engage a Cryovault creature placed at local x < 28, then ride `cryovault-return` (arriving at level `{85,20}`, chunk `2,0`). After one tick the creature has `targetId === null`, is at `home`, and has full integrity.
  - `walking to a tile outside the interest set is refused`: from the Cryovault, `world.walk` returns false for a Drowned Archive tile (chunk x = 3).
  - `interacting with an object outside the interest set is refused`: `pendingInteraction` stays null.
- [ ] **Step 2:** Run the tests. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement the changes above.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expected: both pass.
- [ ] **Step 5:** Commit: `git commit -am "Let unwatched chunks sleep and bound intents to the interest set"`

---

### Task 9: Documentation and end-to-end check

**Files:**
- Modify:
  - `ARCHITECTURE.md`: replace the zone wording with levels and districts. Add an "Interest management" subsection (chunks, `broadcastNear`, chunk messages, dormancy), and update the Scaling section to say layers are per level.
  - `CLAUDE.md`, only if it mentions zones.
  - `CONTRIBUTING.md`: how to add a district to a level, author a connector, and what `findLevelIssues` enforces.

- [ ] **Step 1:** Update the docs.
- [ ] **Step 2:** Run `npm run typecheck` and `npm test`. Expected: both pass.
- [ ] **Step 3:** Run `npm run dev` with the preview, using a fresh character:
  - complete Orientation Protocol from the Intake Wing to the Atrium;
  - walk into Hydroponics and back;
  - take the service lift to the Undercroft;
  - check that the console has no errors;
  - take a screenshot of the concourse.
- [ ] **Step 4:** Commit: `git commit -am "Document levels, districts and interest management"`
