# Region Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the district viewer into a region editor (district and level editing with undo and saving), draw NPCs and creatures in 3D, and audit and fix the whole map with it.

**Architecture:** Editing is a set of pure functions over `DistrictLayout` held in an `EditorDocument` with snapshot undo. The page rebuilds districts with `buildDistrict` after every edit, and a dev-only Vite plugin validates and writes saved layouts. Level files become recipes over a small context so a level can be re-stitched from edited districts. An audit script scores every district, and the audit pass uses the editor to fix what it finds.

**Tech Stack:** TypeScript (erasable only, `.ts` imports, no comments), Node 24 `node --test`, Vite 6 plugin API, Three.js 0.170, zod 3.

**Spec:** `docs/superpowers/specs/2026-11-12-region-editor-design.md`

## Global Constraints

- Write no code comments. Erasable TypeScript only. Imports use `.ts` extensions.
- Gameplay does not change, except where the audit fixes a reported problem, and every such fix is listed in the audit report.
- Editing and saving work only under `npm run dev`; the save endpoint is registered only when Vite runs in serve mode.
- Saved files are written by `printLayout` and must stay canonical; `layoutFiles.test.ts` keeps guarding this.
- Fresh ids are `<district-id>-<kind>-<n>`, smallest `n` not taken in the district.
- No new runtime dependencies.
- Every task ends with `npm run typecheck` and `npm test` passing.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch `world/region-editor` in `C:/Users/aiden/Documents/portfolio/portfolio-node-containment-layouts`.

## Decisions taken while planning

- **Level recipes take a context, not just a district lookup.** Two levels align districts by a hollow's corner, which lives in layout steps, not on `DistrictDefinition`. A recipe is `(context: LevelContext) => LevelDefinition` with `LevelContext = { districtOf(id): DistrictDefinition; hollowOf(id): TilePoint }`. The spec's "district lookup" becomes this two-method context.
- **One index of layout files.** `content/districts/layouts/index.ts` imports all 31 JSON files as `LAYOUT_SOURCES: Readonly<Record<DistrictId, unknown>>`. District modules keep their own direct import; the index serves recipes, the editor and the audit.
- **`positionAt(plan, point)` in shared** re-expresses a tile as the room, exit, link or absolute form, using the same order the migration used. Moves and additions use it.

## Review Focus

- Moving a placement onto a wall, a pillar or void must be refused with a visible reason, not saved silently (the content check would catch it later). Task 3 tests `moveEntry` onto a wall tile.
- Editing a room that a set-piece, area or another step names (renaming, shrinking so a placement falls outside) must report what breaks rather than corrupt the layout. Task 3 tests shrinking a room past a placement.
- Two quick saves of the same district, or a save while Vite is mid-reload, must not lose an edit or reload the page. Task 5 tests that a second write within the window is also suppressed.
- Undo after a save must still work and mark the district dirty again. Task 4 tests it.
- The level view clicked on a seam tile shared by two districts must pick the district that owns a non-void tile there. Task 8 tests a tile in the Atrium hollow of the Circuit.

---

### Task 1: People in 3D

**Files:**
- Create: `packages/client/src/editor/actorLayer.ts`
- Modify: `packages/client/src/editor/previewView.ts`, `packages/client/src/editor/viewer.ts`
- Test: `packages/client/test/actorLayer.test.ts`

**Interfaces:**
- Produces:
  - `actorsOf(content: GameContent, level: ResolvedLevel): ActorSpec[]`, pure, with `ActorSpec = { kind: 'npc'; id: string; appearance: CharacterAppearance; gear: readonly ItemId[]; position: TilePoint } | { kind: 'creature'; id: string; model: CreatureModel; position: TilePoint }`. Unknown NPC or creature ids are skipped.
  - `class ActorLayer { readonly root: Group; show(specs: readonly ActorSpec[]): void; update(time: number): void; setVisible(on: boolean): void; dispose(): void }`, building `new CharacterRig(appearance, gear)` and `createCreatureRig(model)`, placed at `(x + 0.5, 0, y + 0.5)`, facing south, idle pose each frame.
  - `PreviewView.showActors(on: boolean)`. `show(zone)` builds the actors from `zone.definition`.

- [ ] **Step 1: Write the failing test:** `actorsOf` on the Atrium preview level returns one `npc` spec per NPC placement with that NPC's appearance (check `atrium-okafor`), skips an NPC placement whose `npcId` is unknown, and returns creature specs with their model for a district with creatures (`salt-cathedral`).
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/actorLayer.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `actorsOf` and `ActorLayer`. For the idle pose, pass the same pose object `GameRenderer.syncEntities` gives a standing entity. Wire the `npcs` layer toggle to `showActors`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`, then check in the browser pane that the Atrium shows Okafor, Sel, Kade and the crowds in 3D, and the Salt Cathedral shows its creatures. Expected: PASS, people visible.
- [ ] **Step 5: Commit** "Draw NPCs and creatures in the viewer".

### Task 2: Level recipes and the layout index

**Files:**
- Create: `packages/shared/src/content/districts/layouts/index.ts`, `packages/shared/src/content/levels/recipes.ts`
- Modify: all 9 files in `packages/shared/src/content/levels/`, `packages/shared/src/world/level.ts` (types)
- Test: `packages/shared/test/levelRecipes.test.ts`

**Interfaces:**
- Produces:
  - `LAYOUT_SOURCES: Readonly<Record<DistrictId, unknown>>`.
  - `interface LevelContext { districtOf(id: DistrictId): DistrictDefinition; hollowOf(id: DistrictId): TilePoint }` and `type LevelRecipe = (context: LevelContext) => LevelDefinition`, in `world/level.ts`.
  - Each level file exports `<NAME>_RECIPE: LevelRecipe` and keeps its constant as `<NAME>_RECIPE(SHIPPED_CONTEXT)`.
  - `SHIPPED_CONTEXT: LevelContext` (from `DISTRICTS` and `LAYOUT_SOURCES` via `firstHollowOf`) and `LEVEL_RECIPES: ReadonlyMap<LevelId, LevelRecipe>`, in `content/levels/recipes.ts`.
  - `resolveLevelFrom(recipe: LevelRecipe, context: LevelContext, assemblies): ResolvedLevel`, a thin wrapper.

Inside a recipe, every former use of a district constant (`MERIDIAN_CIRCUIT.map.length`, `VESPER_LODGE.map.length`, `widthOf(HYDROPONICS)`, `CIRCUIT_HOLLOW_FOR_ATRIUM`, `ATRIUM_ANCHORS.x`) reads through the context. `*_HOLLOW_FOR_*` exports may then be deleted if nothing else uses them.

- [ ] **Step 1: Write the failing test:** for every entry of `LEVEL_RECIPES`, `recipe(SHIPPED_CONTEXT)` deep-equals the matching `LevelDefinition` used by `GAME_CONTENT`; `LEVEL_RECIPES.size` is 9; a context whose `districtOf('hydroponics')` returns a district one column wider moves `verdance-concourse` and everything joined beyond it on the main floor, and nothing on its other side.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/levelRecipes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the index, context, recipes and the 9 rewrites. Record the content fingerprint before (as in the previous plan) and require it unchanged after.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS, fingerprint identical.
- [ ] **Step 5: Commit** "Build levels from recipes".

### Task 3: Pure edits

**Files:**
- Create: `packages/client/src/editor/edits.ts`
- Modify: `packages/shared/src/world/layoutPosition.ts` (add `positionAt`)
- Test: `packages/client/test/edits.test.ts`, `packages/shared/test/layoutPosition.test.ts`

**Interfaces:**
- Consumes: `DistrictLayout`, `drawBlueprint`, `buildDistrict`.
- Produces:
  - `positionAt(plan: Blueprint, point: TilePoint): LayoutPosition` in shared.
  - `type Collection = 'objects' | 'assemblies' | 'npcs' | 'creatures' | 'lights' | 'decals' | 'setPieces'` and `type EntryRef = { collection: Collection; index: number } | { collection: 'anchors'; name: string }`.
  - `type EditResult = { ok: true; layout: DistrictLayout } | { ok: false; reason: string }`.
  - In `edits.ts`, each returning `EditResult`: `moveEntry(layout, ref, to: TilePoint)`, `rotateEntry(layout, ref)`, `deleteEntry(layout, ref)`, `duplicateEntry(layout, ref)`, `addEntry(layout, collection, entry: Omit<Entry, 'id' | 'at'>, at: TilePoint)`, `setField(layout, ref, field: string, value: unknown)`, `moveRoom(layout, room, to: TilePoint)`, `resizeRoom(layout, room, rect: TileRect)`, `editStep(layout, index, patch: Record<string, unknown>)`, `addStep(layout, step)`, `deleteStep(layout, index)`, `paintTiles(layout, tiles: readonly TilePoint[], tile: TileKindId)`, `eraseTiles(layout, tiles: readonly TilePoint[])`, `setDressing(layout, room, dressing: DressingTheme | RoomDressing | null)`; plus `freshId(layout, kind: string): string`.

Rules the edits enforce, each with a `reason` when refused: a move or add target must be inside the district and, for objects, NPCs and creatures, on a walkable tile (track and liquid allowed for objects whose definition is `deck`); a room edit or step edit must still build (`buildDistrict` succeeds) and must leave every room-form position inside its room; a room named by other steps, placements, areas, set-pieces or dressing cannot be deleted; paints skip exit and link tiles; set-piece moves keep the room form.

- [ ] **Step 1: Write the failing tests** on the sample fixture and the Atrium layout:
  - `positionAt` returns the room form inside a room, the exit form on an exit tile, the link form on a link tile, absolute elsewhere.
  - `moveEntry` of `hall-planter` into `side` gives `{ room: 'side', … }`; onto a wall tile returns `ok: false` with `wall` in the reason.
  - `rotateEntry` cycles `south → west → north → east → south`.
  - `duplicateEntry` adds `sample-district-objects-1` one tile east; `freshId` skips taken numbers.
  - `resizeRoom` shrinking `hall` so `hall-bench` falls outside returns `ok: false` naming `hall-bench`.
  - `moveRoom` shifts the room's rect and its placements' absolute positions (after build) by the same delta.
  - `deleteStep` on the `hall` room step returns `ok: false` listing what names it.
  - `paintTiles` over an exit tile and a floor tile adds only the floor tile.
  - `setDressing(layout, 'side', null)` removes the entry; `setField` on a light's `radius` changes it; an unknown field returns `ok: false`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/edits.test.ts packages/shared/test/layoutPosition.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Every edit copies the layout (`structuredClone`), changes the copy, and checks it with `buildDistrict` before returning `ok: true`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Add pure district edits".

### Task 4: The editor document and hit testing

**Files:**
- Create: `packages/client/src/editor/document.ts`, `packages/client/src/editor/hitTest.ts`
- Test: `packages/client/test/document.test.ts`, `packages/client/test/hitTest.test.ts`

**Interfaces:**
- Consumes: Task 3 edits.
- Produces:
  - `class EditorDocument { constructor(sources: Readonly<Record<DistrictId, unknown>>); layout(id): DistrictLayout; district(id): DistrictDefinition; buildError(id): string | null; isDirty(id): boolean; dirtyIds(): DistrictId[]; apply(id, edit: (layout) => EditResult): EditResult; undo(): DistrictId | null; redo(): DistrictId | null; markSaved(id, layout): void; onChange(listener: (id: DistrictId) => void): void }`. `district(id)` returns the last good build; `buildError` the current one's error.
  - `type Hit = { kind: 'entry'; ref: EntryRef } | { kind: 'step'; index: number } | { kind: 'room'; room: string } | { kind: 'dressing'; room: string }` and `hitsAt(layout: DistrictLayout, district: DistrictDefinition, tile: TilePoint): Hit[]`, topmost first: set-piece, object, npc, creature, anchor, light, decal, then steps under the tile (link, exit, pillars, patch, hollow, track), then the room. A generated object or crowd NPC maps to its source.

- [ ] **Step 1: Write the failing tests:** undo and redo across two districts restore the right layouts in order; a new edit clears redo; undo after `markSaved` marks the district dirty again; an edit that fails returns its reason and changes nothing; `hitsAt` on a set-piece piece of the Atrium bench ring returns its `setPieces` entry first, on a `-dressing-` object returns `{ kind: 'dressing', room }`, and on an empty plaza tile returns only the room.
- [ ] **Step 2: Run** the two tests. Expected: FAIL.
- [ ] **Step 3: Implement.** The undo stack keeps whole-layout snapshots, at most 200 entries.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Hold edits in an undoable document".

### Task 5: Saving through the dev server

**Files:**
- Create: `packages/client/editorSave.ts`
- Modify: `packages/client/vite.config.ts`, `packages/client/tsconfig.json` (include `editorSave.ts`)
- Test: `packages/client/test/editorSave.test.ts`

**Interfaces:**
- Produces:
  - `saveLayout(root: string, districtId: string, body: string): { ok: true; text: string } | { ok: false; status: number; error: string }`, where `root` is the layouts directory. Unknown id (no file) → 404. Invalid JSON, schema failure, or `buildDistrict` failure → 422 with the message. An `id` field not matching the URL → 422. On success it writes `printLayout`'s text.
  - `layoutSavePlugin(root: string): Plugin` with `apply: 'serve'`, handling `POST /__editor/layouts/:id`, and `handleHotUpdate` returning `[]` for a file it wrote within the last 2000 ms.
  - Client: `saveDistrict(id: DistrictId, layout: DistrictLayout): Promise<{ ok: true } | { ok: false; error: string }>` in `packages/client/src/editor/saveClient.ts`.

- [ ] **Step 1: Write the failing tests** against a temporary copy of the layouts directory: unknown id → 404 and no file created; malformed JSON → 422; a layout with `npcs[0].at.room` misspelt → 422 whose error names `npcs[0].at`; mismatched id → 422; a valid layout with shuffled keys → written in canonical form and equal to `printLayout`; two saves within the window both report suppression from `shouldSuppress(path, now)`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/editorSave.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, registering the plugin in `vite.config.ts` with the path `../shared/src/content/districts/layouts`.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Save layouts through the dev server".

### Task 6: Editing in the viewer

**Files:**
- Create: `packages/client/src/editor/editController.ts`, `packages/client/src/editor/propertiesPanel.ts`, `packages/client/src/editor/palette.ts`, `packages/client/src/editor/toolbar.ts`
- Modify: `packages/client/src/editor/viewer.ts`, `packages/client/src/editor/planCanvas.ts` (selection outline, room handles, drag ghost, brush cursor), `packages/client/src/editor/editor.css`
- Test: `packages/client/test/editController.test.ts`

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces:
  - `type Tool = 'select' | 'paint' | 'erase' | 'add'` and `class EditController { constructor(document: EditorDocument); tool: Tool; selection: Hit | null; pointerDown(tile, modifiers); pointerMove(tile); pointerUp(tile); key(key: string, modifiers): boolean; setBrush(tile: TileKindId); setPending(entry: PaletteEntry) }`. It turns gestures into document edits and exposes `status: string` for refusals.
  - `PlanCanvas` gains `onPointer(kind: 'down' | 'move' | 'up', fn)`, `showSelection(rect | null)`, `showHandles(rect | null)`, `showGhost(rect | null)` and stops panning while a drag is owned by the controller.
  - `PaletteEntry = { collection: Collection; label: string; entry: Record<string, unknown> }`, built from `GAME_CONTENT.worldObjects`, `PREFABS`, `GAME_CONTENT.npcs`, `GAME_CONTENT.creatures`, the decal kinds and a default light.

Page behaviour: an **Edit** toggle shows the toolbar (Select, Paint with a tile select, Erase, Add with the palette search, Undo, Redo, Check, Save, and a dirty marker per district); the properties panel replaces the issues list while something is selected; refusals and build errors show in a banner; a failed save shows the server's error and leaves the district dirty with its undo history; `beforeunload` asks when anything is dirty; keys as the spec's controls table.

- [ ] **Step 1: Write the failing test** driving `EditController` with no DOM: select then drag `hall-planter` two tiles east moves it; `R` rotates the selection; `Delete` removes it and `Ctrl+Z` brings it back; dragging a room handle resizes the room; paint drag over three floor tiles adds three painted tiles; a drag onto a wall leaves the layout unchanged and sets `status` to the refusal.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/editController.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the controller, panel, palette, toolbar and canvas additions.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. In the browser pane on the Atrium: move a bench ring, rotate it, undo twice, paint three tiles, erase them, add a planter from the palette, save, reload the page and see the saved change; then revert the file with `git checkout` on the layout.
- [ ] **Step 5: Commit** "Edit districts in the viewer".

### Task 7: Checking edited content

**Files:**
- Create: `packages/client/src/editor/contentWith.ts`
- Modify: `packages/client/src/editor/viewer.ts`
- Test: `packages/client/test/contentWith.test.ts`

**Interfaces:**
- Consumes: `LEVEL_RECIPES`, `LevelContext`, `EditorDocument`.
- Produces: `contentWith(base: GameContent, districts: ReadonlyMap<DistrictId, { district: DistrictDefinition; layout: DistrictLayout }>): GameContent`, replacing those districts and re-resolving every level whose recipe uses them, with a context whose `hollowOf` reads the edited layout.

- [ ] **Step 1: Write the failing test:** adding a planter on a wall tile to the edited Atrium makes `findContentIssues(contentWith(...))` report it, and the untouched base content still reports nothing; widening `hydroponics` in the edit moves `verdance-concourse` on the resolved main floor.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement**, and wire **Check** and every save to run `findContentIssues(contentWith(...))` and refresh the issues list and markers.
- [ ] **Step 4: Run** `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Check edited districts against the whole game".

### Task 8: Level view and documentation

**Files:**
- Create: `packages/client/src/editor/levelView.ts`
- Modify: `packages/client/src/editor/viewer.ts`, `viewState.ts` (`level` param), `planCanvas.ts` (district outlines, connectors), `previewLevel.ts`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `WORLD_DESIGN.md`
- Test: `packages/client/test/levelView.test.ts`, `packages/client/test/viewState.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 4, 6, 7.
- Produces:
  - `ViewState` gains `level?: LevelId`; `readViewState` keeps `level` only if known, and `level` wins over `district`.
  - `levelPlan(content: GameContent, level: ResolvedLevel): PlanShape[]` (tiles from the level layout, district outlines labelled, connector strips) and `districtAtLevelTile(content, level, tile): { districtId: DistrictId; local: TilePoint } | null` using the non-void rule.
  - The edit controller works in level mode through a coordinate adapter: level tile → `(districtId, local)` for every gesture.

- [ ] **Step 1: Write the failing tests:** `districtAtLevelTile` on the main floor returns `meridian-atrium` for a tile inside the plaza and `meridian-circuit` for a boulevard tile, and `null` for void; a level tile in the Circuit's hollow resolves to the Atrium; `readViewState('?level=main-floor&district=x')` keeps the level; an unknown level is dropped.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** the level view: picker group, whole-level plan and 3D, per-district editing, re-stitching after each edit via `contentWith`, saving all dirty districts. Update the three docs (editing, saving rules, level recipes).
- [ ] **Step 4: Run** `npm run typecheck && npm test`. In the browser pane: open the main floor, select and move an object in the Service Yards, see it move in place, undo; open the Deep.
- [ ] **Step 5: Commit** "Edit whole levels in the viewer".

### Task 9: Audit heuristics

**Files:**
- Create: `packages/shared/src/world/audit.ts`, `scripts/audit.ts`
- Modify: root `package.json` (`"audit": "node --no-warnings=ExperimentalWarning scripts/audit.ts"`)
- Test: `packages/shared/test/audit.test.ts`

**Interfaces:**
- Produces: `type AuditFinding = { districtId: DistrictId; room?: string; kind: 'issue' | 'empty-room' | 'density' | 'dark-room' | 'dead-end' | 'people' | 'seam'; message: string; tile?: TilePoint }` and `auditDistrict(content: GameContent, districtId: DistrictId): AuditFinding[]`, `auditSeams(content: GameContent): AuditFinding[]`.

Thresholds: density compares placements per 100 walkable tiles against the district's median room, flagging below 0.25× or above 3×, for rooms with at least 40 walkable tiles. A dark room has no light whose position is inside its rect and no object with a `light`. A dead end has exactly one opening (by `openingsOf`-style detection) and no quest object, NPC, creature or resource node. People: an NPC outside every safe area on a `floor` level, a creature inside a safe area. Seams: joined exits whose widths differ or whose facing tiles are not both walkable.

`scripts/audit.ts` writes `docs/audits/2026-11-12-map-audit.md` with a summary table (district, findings by kind) and one section per district listing findings with a viewer deep link `http://localhost:5173/editor.html?district=<id>&focus=<x,y>`.

- [ ] **Step 1: Write the failing tests:** each kind flags a synthetic district built to fail it (an empty room; a room with 20 planters among sparse rooms; a room with no light; a one-door empty room; a creature in a safe area; a seam of mismatched widths) and the shipped Atrium `plaza` raises none of `empty-room`, `dark-room` or `dead-end`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/audit.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `audit.ts` and the script.
- [ ] **Step 4: Run** `npm run audit` (expected: the report file written, summary printed) and `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** "Score every district in a map audit" (the generated report is committed in Task 10).

### Task 10: The audit pass

**Files:**
- Modify: layout files the audit fixes; `docs/audits/2026-11-12-map-audit.md`

- [ ] **Step 1: Run** `npm run audit` and read the report.
- [ ] **Step 2: Look** at every district in the viewer, split view, with survey light and then game light. Add notes on what reads badly to each district's section under "Looking".
- [ ] **Step 3: Fix** the clear-cut findings with the editor and save through it: check failures, objects in walls, dark rooms that should be lit, empty rooms that should hold their room's usual props, people standing where they should not. Leave quest objects, named NPCs, creatures and nodes unless a check fails. Record each fix in the report under "Fixed".
- [ ] **Step 4: Write** "For you": every judgement call with a deep link and a suggested fix.
- [ ] **Step 5: Run** `npm run audit` again, `npm run typecheck && npm test`. Expected: PASS, and the report's summary shows only judgement calls left.
- [ ] **Step 6: Commit** "Audit the whole map and fix the clear-cut findings".
