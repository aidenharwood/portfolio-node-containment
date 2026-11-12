# District Layouts and Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every district's layout into a validated JSON file and add a dev-only viewer that shows a district as a 2D plan and a free-camera 3D view with check failures marked.

**Architecture:** Shared gains a zod layout schema, `buildDistrict` (layout JSON → `DistrictDefinition` via the existing `drawBlueprint` and `furnish`), and a canonical printer. A one-off migration evaluates today's district modules, converts their resolved output back to room-relative layouts, and proves each rebuild is identical before the old code is deleted. The client gets an `editor.html` page that draws the plan on a canvas, renders the 3D view through the game's `LevelScene`, and lists issues from the shared checks.

**Tech Stack:** TypeScript (erasable only, `.ts` imports, no comments), zod 3 (already in `shared`), Node 24 `node --test`, Vite multi-page, Three.js 0.170 with `OrbitControls` from `three/examples/jsm`.

**Spec:** `docs/superpowers/specs/2026-11-12-district-layouts-and-viewer-design.md`

## Global Constraints

- Write no code comments. Erasable TypeScript only (no enums, namespaces or parameter properties). Imports use `.ts` extensions.
- Gameplay does not change: every district's map, rooms, exits, anchors, areas, objects with instance ids, assemblies, NPCs, creatures, lights, decals, landmarks and dressing log come out identical.
- There are 31 districts (the `DISTRICTS` list in `gameContent.ts`); the spec's "38" counted helper files.
- Layout files live at `packages/shared/src/content/districts/layouts/<district-id>.json`.
- The viewer is dev-only and is left out of the production build.
- No new runtime dependencies.
- Every task ends with `npm run typecheck` and `npm test` passing.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `world/district-layouts` in the worktree `C:/Users/aiden/Documents/portfolio/portfolio-node-containment-layouts`.

## Decisions taken while planning

These refine the approved spec where reading the code showed a simpler equivalent. Each keeps the spec's outcome.

- **Steps are stored as today's `BlueprintStep` objects** (`room` steps carry `rect: { x, y, width, height }`), not flattened arguments. `drawBlueprint` already takes exactly these objects.
- **One room-relative position form.** `plan.spot` is the same tile as `plan.at` without the walkability check, so `{ "spot": … }` is dropped. Positions resolve without a walkability check; the content checks already report placements on unwalkable tiles. Forms: `{ room, dx, dy }`, `{ exit, index }`, `{ link: [from, to], index }`, `{ x, y }`.
- **Migration reconstructs, then proves.** Rather than wrapping a dozen helpers, it evaluates each district as it stands, converts resolved positions back to room-relative, recognises installations and scatter runs, and requires a deep-equal rebuild. Only two capture points are needed: `drawBlueprint`'s arguments (kept permanently on `Blueprint` as `size` and `steps`) and `furnish`'s input (a temporary recorder deleted in Task 4).
- **Anchors keep literal keys.** `anchorsOf(district, keys)` returns `Record<K, TilePoint>` so `ATRIUM_ANCHORS.transit` still types as `TilePoint` under `noUncheckedIndexedAccess`.

## Review Focus

- A district whose rooms touch or whose objects sit on a shared wall: room-relative conversion must pick the room the point is in, and fall back to exit, link or absolute form; Task 3's equivalence check proves it, and Task 1 tests a point outside every room.
- Painting a tile over a door, exit or link tile in the viewer era must not silently desync `plan.links`/`plan.exits`; Task 1 tests that painted tiles change `map` and `tileAt` but leave `rooms`, `exits` and `links` as drawn.
- Hand edits to a layout file that reorder keys or change spacing: `printLayout` must normalise them, and a file that already is canonical must stay byte-identical; Task 2 tests both.
- A JSON file with a typo'd room, object id or unknown key must fail with the district id and JSON path, not a stack trace from deep in `drawBlueprint`; Task 2 tests unknown keys and Task 1 tests an unknown room.
- The viewer opened with a stale or hand-typed URL (unknown district, missing params, negative zoom) must fall back to defaults rather than throw; Task 5 tests it.

---

### Task 1: Layout schema, positions and painted tiles

**Files:**
- Create: `packages/shared/src/world/layoutSchema.ts`, `packages/shared/src/world/layoutPosition.ts`
- Modify: `packages/shared/src/world/blueprint.ts` (`Blueprint` gains `size` and `steps`; `drawBlueprint` takes `painted`)
- Test: `packages/shared/test/layoutPosition.test.ts`, `packages/shared/test/blueprintPainted.test.ts`

**Interfaces:**
- Produces:
  - `DISTRICT_LAYOUT_SCHEMA` (zod, `.strict()` on every object) and `type DistrictLayout = z.infer<typeof DISTRICT_LAYOUT_SCHEMA>`.
  - `type LayoutPosition = { room: string; dx: number; dy: number } | { exit: string; index: number } | { link: readonly [string, string]; index: number } | { x: number; y: number }`.
  - `type PaintedTile = { x: number; y: number; tile: TileKindId }`.
  - `resolvePosition(plan: Blueprint, at: LayoutPosition, path: string): TilePoint`, throwing `Error(\`${path}: …\`)`.
  - `drawBlueprint(size, steps, painted: readonly PaintedTile[] = [])`; `Blueprint.size` and `Blueprint.steps` echo the arguments.

Schema keys, in this order (the printer relies on it): `id, name, subtitle, tier, region, condition?, reachedOnlyByTram?, deadEnd?, ambience, size, steps, tiles, areas, anchors, recovery?, objects, assemblies, npcs, creatures, lights, decals, setPieces, scatter, dressing, furnish`. Entry shapes:

| key | entry |
| --- | ----- |
| `areas` | `{ room, name, safe?, multiCombat? }` or `{ id, name, rect, safe?, multiCombat? }` |
| `anchors` | `Record<string, LayoutPosition>` |
| `recovery` | `{ districtId, at }` |
| `objects` | `{ id, object, at, facing? }` |
| `assemblies` | `{ id, install, at, facing? }` or `{ id, assembly, at, facing?, span? }` |
| `npcs` / `creatures` | `{ id, npc, at }` / `{ id, creature, at }` |
| `lights` | `{ at, radius, color, intensity }` |
| `decals` | `{ kind, pattern?, tint?, at, width, height }` |
| `setPieces` | `{ id?, prefab, at, facing }` (`at` must be the room form) |
| `scatter` | `{ room, prefix, pool, count }`, `pool` ∈ `litter`, `office-props`, `civic-props`, `industrial-props` |
| `dressing` | `Record<string, DressingTheme \| RoomDressing>` |
| `furnish` | `{ cast?, landmarks?, decalSwaps? }` |

- [ ] **Step 1: Write the failing tests.**
  - `resolvePosition` on a two-room blueprint: room form returns `rect.x + dx, rect.y + dy`; exit form returns `plan.exits[exit].tiles[index]`; link form returns `plan.linkTile(from, to, index)`; absolute returns itself.
  - Errors: unknown room → message contains `objects[3].at` and `"plazza"`; `dx` beyond the room width → message contains `outside room`; unknown exit and out-of-range index each fail with the path.
  - `drawBlueprint` with `painted: [{ x, y, tile: 'hazard' }]` on a floor tile and on a wall tile: `plan.map` shows the painted symbol at both, `plan.at` sees the painted tile, and `rooms`, `exits` and `links` equal the unpainted draw.
  - `DISTRICT_LAYOUT_SCHEMA.safeParse` rejects an object with an unknown key and reports its path.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/layoutPosition.test.ts packages/shared/test/blueprintPainted.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement.** Painted tiles apply after wall generation, as the last write before `map` is built. Export the schema, types and `resolvePosition` from `packages/shared/src/index.ts`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Add the district layout schema and position resolution".

### Task 2: buildDistrict, anchorsOf and printLayout

**Files:**
- Create: `packages/shared/src/world/layout.ts`, `packages/shared/src/world/printLayout.ts`
- Modify: `packages/shared/src/content/districts/populate.ts` (export `SCATTER_POOLS: Readonly<Record<ScatterPool, readonly WorldObjectId[]>>`)
- Test: `packages/shared/test/layout.test.ts`, `packages/shared/test/fixtures/sample-layout.json`

**Interfaces:**
- Consumes: Task 1 schema, `resolvePosition`, `drawBlueprint(size, steps, painted)`.
- Produces:
  - `buildDistrict(source: unknown): DistrictDefinition`. Parses (`ZodError` → `Error(\`${id ?? 'layout'}: ${path}: ${message}\`)`), draws, resolves, then builds the pre-furnish district in this order: objects from `objects`, then each `scatter` entry via `scatterObjects(plan, room, prefix, SCATTER_POOLS[pool], count, positionsOf(fixturesSoFar, npcs, assemblies))`; assemblies via `install(id, install, at, facing)` or the plain placement; set-pieces via `setPiece(plan, room, prefab, dx, dy, facing, id)`. Then `furnish(plan, district, dressing, { cast, setPieces, landmarks, decalSwaps })`.
  - `anchorsOf<K extends string>(district: DistrictDefinition, keys: readonly K[]): Readonly<Record<K, TilePoint>>`, throwing if a key is missing.
  - `printLayout(layout: DistrictLayout): string`: two-space JSON, keys in schema order, absent optionals omitted, each element of `objects`, `assemblies`, `npcs`, `creatures`, `lights`, `decals`, `setPieces`, `scatter`, `tiles` and `steps` on one line, trailing newline.

The scatter `taken` list must reproduce what each district passes today: the positions of every fixture, NPC and assembly declared in the file plus earlier scatter output. Task 3's equivalence check is the proof; if a district passed something else, record it with an optional `avoid: LayoutPosition[]` on that scatter entry.

- [ ] **Step 1: Write the failing tests** against `sample-layout.json` (two rooms, a link, an exit, two objects, an installation, an NPC, a light, a decal, a set-piece, a litter scatter of 3, a dressing entry):
  - `buildDistrict` returns the expected `map`, object instance ids in order (fixtures, then `<prefix>-1..3`), the installation at `install(...)`'s position, and dressing objects containing `-dressing-`.
  - Building twice gives deep-equal results.
  - An unknown key, an unknown room in `npcs[0].at`, and an unknown pool each throw an error starting `sample-district: ` and naming the path.
  - `anchorsOf` returns typed anchors and throws for a missing key.
  - `printLayout(parse(file))` equals the fixture file byte for byte; a copy with shuffled keys and extra whitespace prints to the same bytes.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/layout.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `layout.ts` and `printLayout.ts`. Export `buildDistrict`, `anchorsOf` and `printLayout` from `packages/shared/src/index.ts`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Build districts from layout files".

### Task 3: Migrate every district to a layout file

**Files:**
- Create: `scripts/migrate-layouts.ts`, `packages/shared/src/content/districts/layouts/*.json` (31 files)
- Modify: `packages/shared/src/content/districts/furnish.ts` (temporary `captureFurnish` recorder)
- Test: `packages/shared/test/layoutMigration.test.ts` (deleted in Task 4)

**Interfaces:**
- Consumes: `buildDistrict`, `printLayout`, `Blueprint.size`/`steps`.
- Produces: one canonical layout file per district, and the equivalence test that Task 4 relies on before deleting old code.

The recorder: `export function captureFurnish(record: (input: { plan: Blueprint; district: DistrictDefinition; dressing: Dressing; options: FurnishOptions }) => void): () => void` in `furnish.ts`, which `furnish` calls with its arguments when set. The script installs it, then dynamically imports `packages/shared/src/content/gameContent.ts` so every district module evaluates.

Conversion, per captured call:
- Steps and size from `plan.steps`/`plan.size`; `tiles: []`.
- A resolved point becomes, in order of preference: the room form for the first room in step order whose rect contains it; the exit form if it is an exit tile; the link form if it is a link tile; otherwise absolute.
- An area whose `id` is a room and whose `rect` equals that room's rect becomes the room form.
- An assembly whose `assemblyId` is an installation becomes `install` with its core tile (the inverse of `install`); others stay plain.
- Objects whose ids run `<prefix>-1..n` and whose ids and positions match `scatterObjects` for some room, pool and count become one `scatter` entry; everything else stays an explicit object.
- `options.setPieces` become `setPieces`; `dressing` and the remaining options copy across.

- [ ] **Step 1: Write the failing test** `layoutMigration.test.ts`: for every district in `GAME_CONTENT.districts`, `buildDistrict(readFile(layouts/<id>.json))` deep-equals the district (compare `map`, `rooms`, `exits`, `anchors`, `areas`, `objects`, `assemblies`, `npcs`, `creatures`, `lights`, `decals`, `landmarks`, `dressingLog`, and every scalar field).
- [ ] **Step 2: Run** it. Expected: FAIL (no layout files).
- [ ] **Step 3: Implement** the recorder and `scripts/migrate-layouts.ts` (`node --no-warnings=ExperimentalWarning scripts/migrate-layouts.ts` writes all 31 files with `printLayout`). Iterate on the conversion until the test passes for all 31; never edit a district's old code to make it match.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS, with `layoutMigration.test.ts` green for 31 districts.
- [ ] **Step 5: Commit** "Migrate every district to a layout file".

### Task 4: Switch districts to their layouts and delete the old code

**Files:**
- Modify: all 31 district modules in `packages/shared/src/content/districts/`, `packages/shared/src/content/districts/furnish.ts` (remove `captureFurnish`)
- Delete: `scripts/migrate-layouts.ts`, `packages/shared/test/layoutMigration.test.ts`
- Test: `packages/shared/test/layoutFiles.test.ts`

**Interfaces:**
- Consumes: Task 2's `buildDistrict`, `anchorsOf`, `printLayout`.
- Produces: unchanged exports `<DISTRICT>` and `<DISTRICT>_ANCHORS` from every district module.

Each module becomes:

```ts
import layout from './layouts/meridian-atrium.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const MERIDIAN_ATRIUM = buildDistrict(layout);
export const ATRIUM_ANCHORS = anchorsOf(MERIDIAN_ATRIUM, ['transit', 'deepLineArrival', 'serviceLiftArrival', 'recovery']);
```

Before switching, record a fingerprint of `GAME_CONTENT` (JSON of every district and every resolved level) to a scratch file; after switching, it must match byte for byte.

- [ ] **Step 1: Write** `layoutFiles.test.ts`: every file in `layouts/` parses, its `id` matches its file name and a district in `GAME_CONTENT`, and `printLayout(parse(file))` equals the file; `GAME_CONTENT.districts.size` is 31.
- [ ] **Step 2: Record** the fingerprint: `node --no-warnings=ExperimentalWarning -e "…"` writing `JSON.stringify` of all districts and `GAME_CONTENT.levels` to the scratchpad.
- [ ] **Step 3: Rewrite** each module as above, keeping its anchor keys, and delete helpers that no module uses any more (unused exports in `populate.ts` stay only if `layout.ts` uses them).
- [ ] **Step 4: Verify** the fingerprint matches, then delete the migration script, test and `captureFurnish`.
- [ ] **Step 5: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 6: Commit** "Build every district from its layout file".

### Task 5: Terminal plan and the shared plan model

**Files:**
- Create: `packages/shared/src/world/planModel.ts`, `scripts/plan.ts`
- Modify: root `package.json` (`"plan": "node --no-warnings=ExperimentalWarning scripts/plan.ts"`)
- Test: `packages/shared/test/planModel.test.ts`

**Interfaces:**
- Consumes: `GAME_CONTENT`, `objectFootprintTiles`, `findWorldDesignIssues`, `findFurnishingIssues`, `findContentIssues`.
- Produces:
  - `type PlanMark = { kind: 'fixture' | 'dressing' | 'set-piece' | 'quest' | 'litter' | 'npc' | 'creature' | 'light' | 'anchor'; id: string; label: string; tiles: readonly TilePoint[]; facing?: Facing }`.
  - `planMarks(content: GameContent, districtId: DistrictId): PlanMark[]`: one mark per placement with its full rotated footprint; `set-piece` for ids containing `/`, `dressing` for `-dressing-`, `litter` for `litter-` objects, `quest` for objects with interactions.
  - `issuesFor(content: GameContent, districtId: DistrictId): { message: string; tile?: TilePoint }[]`: the three checks' messages that name this district or one of its levels at a tile inside it, with the first `x,y` in the message parsed as `tile` and converted to district coordinates.
  - `asciiPlan(content, districtId, room?): string`: rulers every 10 tiles, tiles as in the spec, marks overlaid (`F` fixture, `d` dressing, `S` set-piece, `Q` quest, `,` litter, `N` npc, `C` creature, `!` issue tile).

- [ ] **Step 1: Write the failing tests:** `planMarks` gives a 3×2 object facing `east` six tiles in a 2-wide, 3-tall block; a dressing and a set-piece object get their kinds; `issuesFor` on a synthetic issue `level main-floor: … at 601,163` maps to the right district tile; `asciiPlan` for the Atrium's `plaza` has 50 map rows plus the ruler and an `F` at the core's tile.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/planModel.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `planModel.ts` and `scripts/plan.ts` (`npm run plan -- <district> [room]` prints `asciiPlan` then each issue on its own line, or `no issues`; an unknown district prints the known ids and exits 1).
- [ ] **Step 4: Run** `npm run plan -- meridian-atrium plaza` (expected: the plaza grid, then `no issues`) and `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Print district plans in the terminal".

### Task 6: The viewer page and 2D plan

**Files:**
- Create: `packages/client/editor.html`, `packages/client/src/editor/main.ts`, `packages/client/src/editor/viewState.ts`, `packages/client/src/editor/planCanvas.ts`, `packages/client/src/editor/editor.css`
- Modify: `packages/client/vite.config.ts` (serve `editor.html` in dev only; `build.rollupOptions.input` stays `index.html`)
- Test: `packages/client/test/viewState.test.ts`, `packages/client/test/planCanvas.test.ts`

**Interfaces:**
- Consumes: `planMarks`, `issuesFor`, `GAME_CONTENT`, `parseTileLayout`, `TILE_KINDS`, decal colours from `render/world/floorDecals.ts`.
- Produces:
  - `type ViewState = { district: DistrictId; room?: string; view: 'split' | '2d' | '3d'; yaw: number; pitch: number; zoom: number; focus?: TilePoint; layers: readonly PlanLayer[] }`, `type PlanLayer = 'tiles' | 'rooms' | 'objects' | 'dressing' | 'npcs' | 'lights' | 'decals' | 'issues'`.
  - `readViewState(search: string, known: ReadonlySet<DistrictId>): ViewState` (unknown district → first known; missing or out-of-range numbers → defaults `yaw 45, pitch 55, zoom 1`, zoom clamped to `0.1..8`) and `writeViewState(state): string`.
  - `planDrawList(content, districtId, layers): PlanShape[]` (pure; `PlanShape = { kind: 'tile' | 'mark' | 'room' | 'light' | 'decal' | 'issue'; x; y; width; height; color; label?; facing? }`) and `class PlanCanvas { constructor(canvas: HTMLCanvasElement); show(shapes, focus?): void; onHover(fn: (tile: TilePoint) => void); onClick(fn: (tile: TilePoint) => void) }`.

Layout: plan on the left, 3D placeholder on the right (Task 7 fills it), district picker and layer toggles in a top bar, a hover readout (`61,47 · plaza +29,+25 · atrium-core`), and the issues list in a bottom panel (clicking an issue sets `focus`). The view state is mirrored to the URL with `history.replaceState`. A district whose layout throws shows the error text where the plan would be.

- [ ] **Step 1: Write the failing tests:** `writeViewState(readViewState(s))` round-trips for a full state; `readViewState('?district=nope&zoom=-3')` returns the first district and zoom `0.1`; `planDrawList` for a 3×2 object facing each of the four directions yields a mark of 3×2 for `north`/`south` and 2×3 for `east`/`west` at the object's position.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/viewState.test.ts packages/client/test/planCanvas.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the page, state, draw list and canvas (pan with drag, zoom with wheel, both free).
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Then `npm run dev`, open `http://localhost:5173/editor.html?district=meridian-atrium&room=plaza` in the browser pane, and confirm the plaza draws with the core, both bench rings, the compass decal and `no issues`.
- [ ] **Step 5: Commit** "Add the district viewer with a 2D plan".

### Task 7: The 3D view

**Files:**
- Create: `packages/client/src/render/sceneLook.ts`, `packages/client/src/editor/previewView.ts`
- Modify: `packages/client/src/render/gameRenderer.ts` (use `sceneLook.ts`), `packages/client/src/editor/main.ts`
- Test: `packages/client/test/previewView.test.ts`

**Interfaces:**
- Consumes: `LevelScene(zone: ActiveZone)`, `resolveLevel(level, districts, assemblies)`, the `ActiveZone` (`{ definition, layout, grid }`) built the same way `state/worldState.ts` builds it, `OrbitControls` from `three/examples/jsm/controls/OrbitControls.js`.
- Produces:
  - `applySceneLook(renderer: WebGLRenderer, scene: Scene, ambience: ZoneAmbience): SceneLook` with `update(time)` and `dispose()`: the lighting, fog, tone mapping and post-processing `GameRenderer` sets up for a zone, moved here unchanged so both use it.
  - `previewLevel(content: GameContent, districtId: DistrictId): ResolvedLevel`: a one-district `LevelDefinition` (`kind: 'pocket'`, origin `0,0`, no connectors, spawn at the district's first anchor or centre) resolved with the content's assembly index.
  - `class PreviewView { constructor(container: HTMLElement); show(level: ResolvedLevel): void; look(state: Pick<ViewState, 'yaw' | 'pitch' | 'zoom' | 'focus'>): void; gameAngle(): void; onCamera(fn: (state) => void); dispose(): void }`: streams every chunk of the level (no build budget), orbits freely with no zoom clamp, and reports camera moves so the URL stays current.

- [ ] **Step 1: Write the failing test:** `previewLevel` for the Atrium has the district's map size, its objects at district coordinates, and a `spawn` inside the map.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement** `sceneLook.ts` by moving code out of `GameRenderer` (the game must look the same), then `previewView.ts` and the wiring: clicking the plan sets `focus` and points the 3D camera there; the "game angle" button sets yaw and pitch to the game camera's defaults.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. In the browser pane: the game at `/` looks unchanged next to a screenshot taken before the change; `/editor.html?district=meridian-atrium&room=plaza&view=3d` shows the plaza from above at the URL's angle; clicking a bench ring on the plan centres it in 3D.
- [ ] **Step 5: Commit** "Show districts in 3D in the viewer".

### Task 8: Issues on the views, documentation, and a look at three districts

**Files:**
- Modify: `packages/client/src/editor/main.ts`, `packages/client/src/editor/planCanvas.ts`, `packages/client/src/editor/previewView.ts`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `WORLD_DESIGN.md` ("Adding a district")
- Test: `packages/client/test/planCanvas.test.ts`

**Interfaces:**
- Consumes: `issuesFor`, `planDrawList`, `PreviewView`.

Issue tiles draw as red outlined squares on the plan and as red floor markers in 3D. Clicking an issue in the list sets `focus` on both views. Docs: `ARCHITECTURE.md` describes layouts and `buildDistrict`; `CONTRIBUTING.md` says how to change a layout, run `npm run plan`, and open the viewer; `WORLD_DESIGN.md`'s "Adding a district" becomes: write the layout file, open it in the viewer, clear the issues panel.

- [ ] **Step 1: Extend** `planCanvas.test.ts`: a district with one synthetic issue at a tile yields an `issue` shape at that tile when the `issues` layer is on, and none when it is off.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement** the issue markers and update the three docs.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. In the browser pane, open the viewer on the Meridian Atrium, the Meridian Circuit and the Salt Cathedral in split view; each shows its plan, 3D view and an empty issues panel. Temporarily misspell a room in a layout file: the viewer shows the error with the JSON path and the other districts still open; revert.
- [ ] **Step 5: Commit** "Mark issues in the viewer and document layouts".
