# Region Editor, People in 3D, and the Map Audit

**Status:** design approved in conversation, awaiting spec review
**Branch:** `world/region-editor`, cut from `world/district-layouts`
**Sub-project:** 2 of 2. It builds on the district layouts and viewer (`2026-11-12-district-layouts-and-viewer-design.md`).

## Why

The viewer shows a district but cannot change it, shows no people, and works one district at a time. Fixing a layout still means editing JSON by hand and reloading. The user also wants the whole map audited, with the clear-cut problems fixed. The editor is the tool for that audit, so it comes first.

## Goals

1. **People in 3D:** the 3D view draws every NPC and creature with the game's own rigs.
2. **District editor:** everything in a layout file can be changed in the viewer: rooms, links, exits, pillars, patches, hollows, track, painted tiles, every placement and the dressing settings. Changes have undo and redo, and saving writes the canonical file.
3. **Level view:** a whole level is shown with its districts stitched in place, and anything in any of them can be edited there.
4. **Audit:** every district is checked, looked at and scored by heuristics. The findings are written up, and the clear-cut ones are fixed with the editor.

## Non-goals

- New game rules, or checks beyond the audit heuristics.
- Editing level stitching directly. Districts move only through their exits, as the game joins them.
- Editing prefabs, object definitions or NPC definitions. The palette uses what exists.
- Multiple people editing at once, or any editing outside `npm run dev`.

## 1. People in 3D

An `ActorLayer` in `packages/client/src/editor/actorLayer.ts` draws every NPC placement with `new CharacterRig(npc.appearance, npc.gear)`. That covers named NPCs and the ambient crowds dressing adds. It draws every creature placement with `createCreatureRig(creature.model)`. Each actor stands idle at its tile centre, facing south, and its idle animation plays.

- The `npcs` layer toggle shows and hides the actors.
- Rigs are disposed when the district or level changes.
- An NPC or creature with an unknown id is skipped. Its issue is already listed.

## 2. District editor

The viewer gains an **Edit** toggle. In view mode nothing can change. In edit mode the 2D plan becomes the editing surface, and the 3D view follows every change.

### The document

`packages/client/src/editor/document.ts` holds an `EditorDocument`:

- the current `DistrictLayout` of every district that has been opened, keyed by id;
- which of those have unsaved changes;
- an undo stack and a redo stack of layout snapshots, each recording the district it belongs to;
- `apply(districtId, edit)`, which runs a pure edit, pushes the old layout onto undo and clears redo.

After each change the district is rebuilt in the browser with `buildDistrict`. If the build throws, the error shows in an inline banner with the district id and JSON path, and the plan and 3D view keep the last good build. The broken layout stays in the document so the next edit can fix it, and Save is disabled while it is broken.

### Edits

The edits live in `packages/client/src/editor/edits.ts`. Each is a pure function from one `DistrictLayout` to the next, so each can be tested in Node:

| Edit | What it does |
| ---- | ------------ |
| `moveEntry(layout, ref, to)` | Moves a placement (object, assembly, NPC, creature, light, decal, set-piece or anchor) to a tile. The position is rewritten in the room form for whichever room holds the target tile, falling back to exit, link, then absolute. |
| `rotateEntry(layout, ref)` | Turns a placement's facing clockwise. |
| `deleteEntry` / `duplicateEntry` | Removes an entry, or copies it one tile east with a fresh id. |
| `addEntry(layout, collection, entry)` | Adds a placement from the palette with a fresh id. |
| `setField(layout, ref, field, value)` | Sets one property: object type, span, light colour, radius or intensity, decal kind, pattern, tint or size, prefab, NPC or creature id. |
| `moveRoom` / `resizeRoom` | Changes a room's rect. Contents keep their room-relative positions, so they move with the room. |
| `editStep(layout, index, patch)` | Changes any blueprint step: link width or offset, exit side, width, offset or gate, pillar spacing, and the rects of patches and hollows. |
| `addStep` / `deleteStep` | Adds or removes a blueprint step. A room that other steps or placements still name cannot be deleted; the edit reports which ones. |
| `paintTiles` / `eraseTiles` | Adds painted tiles of one kind, or removes painted tiles. Tiles on exits and links are skipped, matching the load rule. |
| `setDressing(layout, room, dressing)` | Sets a room's theme, density, composition and condition. |

Fresh ids are `<district-id>-<kind>-<n>`, using the smallest `n` not taken in the district.

### Selecting and hit testing

`packages/client/src/editor/hitTest.ts` has `entriesAt(layout, district, tile)`, which lists what stands at a tile, topmost first: set-piece, object, NPC, creature, anchor, light, decal, then the room and any step under it. Clicking selects the first entry, and clicking again on the same tile cycles to the next.

Generated objects can be selected, but they lead back to their source:

- a set-piece piece (an id with `/`) selects its `setPieces` entry;
- dressing (`-dressing-` ids) and ambient crowd NPCs select their room's dressing settings, with a note that dressing is generated.

### Controls

| Action | How |
| ------ | --- |
| Select, cycle | Click; click the same tile again |
| Move | Drag a selection; it snaps to tiles |
| Move or resize a room | Drag the room body; drag the corner and edge handles |
| Rotate | `R` |
| Delete, duplicate | `Delete`; `Ctrl+D` |
| Undo, redo | `Ctrl+Z`; `Ctrl+Shift+Z` or `Ctrl+Y` |
| Paint, erase | Brush tool with a tile kind; eraser tool; drag to paint |
| Add | Palette search, then click a tile |
| Save | `Ctrl+S`, or the Save button |

The properties panel replaces the issues list on the right while something is selected. Each field is a typed input, and a select for ids lists the known ids.

### Saving

A Vite plugin in `packages/client/vite.config.ts`, active in dev only, serves `POST /__editor/layouts/<district-id>`.

- It accepts only ids that already have a layout file.
- It validates the body with `parseLayout` and builds it with `buildDistrict`. If either fails, it answers with that error and writes nothing.
- It writes `printLayout(layout)` to the file and answers with the saved text.
- It records the path, and its `handleHotUpdate` returns no modules for that path for two seconds, so the page does not reload and undo history survives.

`saveLayout(root, districtId, body): { ok: true } | { ok: false; error: string }` holds the validation and writing, so it can be tested without Vite.

### Checks

The full checks need the whole game content. `contentWith(base, layouts)` in `packages/client/src/editor/contentWith.ts` rebuilds the edited districts, re-resolves every level that uses them through the level recipes (section 3), and returns a `GameContent` with those districts and levels replaced. **Check** (and every save) runs `findContentIssues` on it. That takes about two seconds and shows a spinner. Issues are filtered and drawn as they are today.

## 3. Level view

### Level recipes

Each of the 9 files in `content/levels/` exports a recipe, `(districtOf: (id: DistrictId) => DistrictDefinition) => LevelDefinition`, beside its existing constant. The constant becomes `recipe(id => DISTRICTS.get(id))`, so nothing else changes. Anything the file read from district constants (map sizes, hollow corners, trackway points) is read through `districtOf` instead. A test asserts that every recipe, run on `GAME_CONTENT.districts`, deep-equals its level constant.

`LEVEL_RECIPES: ReadonlyMap<LevelId, LevelRecipe>` lists them in `content/levels/recipes.ts`.

### The view

The district picker gains a **Level** group listing every level. Choosing one:

- resolves the level from the current edited layouts, through its recipe and `resolveLevel`;
- draws the whole level on the plan, with each district outlined and labelled, and connectors shown;
- shows the whole level in 3D, using the same survey and game lighting;
- lists the issues whose level or district belongs to it.

Clicking a tile finds its district with the same non-void rule `issuesFromMessages` uses, and converts the tile to that district's coordinates. All district editing then works as in section 2, on that district's layout. After each change the level is re-resolved, so moving an exit re-stitches its neighbours. Saving writes every district that has unsaved changes.

The URL carries `level=<id>` in place of `district=`.

## 4. Audit

### Heuristics

`scripts/audit.ts` (`npm run audit`) computes, per district:

- every issue from the checks;
- **empty rooms:** rooms with walkable tiles but no placement and no dressing;
- **density outliers:** placements per 100 walkable tiles, flagged when a room is below a quarter or above three times its district's median;
- **dark rooms:** rooms with no light within their own rect and no lit object;
- **lone dead ends:** rooms with one opening and nothing to do in them (no quest object, NPC, node or creature);
- **people:** NPCs not standing in a safe area on a floor level, creatures inside safe areas, and named NPCs with no route to the district's exits;
- **seams:** for each level, exits that meet a neighbour of a different width or tile kind across the join.

It writes `docs/audits/2026-11-12-map-audit.md`. That has one section per district with its findings, each with a viewer deep link, and a summary table at the top.

### Looking

For every district I open the viewer in split view, with survey light and then game light, and note what reads badly. That means grid-like dressing, clutter blocking routes, rooms that do not match their name, odd model choices and lighting gaps. Those notes go into the same report.

### Fixing

Clear-cut problems are fixed with the editor and saved through it, which also exercises it:

- check failures;
- objects in walls;
- dark rooms that should be lit;
- empty rooms that should hold their room's usual props;
- people standing where they should not.

Judgement calls are not changed. They are listed under "For you" with a deep link and a suggested fix. Changes to gameplay placements (quest objects, NPCs, creatures, nodes) are judgement calls unless a check fails.

## Errors

- A failed save shows the server's error, leaves the document dirty and keeps undo history.
- Leaving the page with unsaved changes asks for confirmation (`beforeunload`).
- A level whose recipe throws with the edited districts shows that error in the banner and keeps the last good level.

## Testing

- **Edits:** a test for each edit in `edits.ts`, including moving into another room (position re-expressed), rotating a 3×2 object, refusing to delete a referenced room, paint skipping exit tiles, and fresh-id generation.
- **Document:** undo and redo across two districts; redo is cleared by a new edit; a broken build keeps the last good district.
- **Hit testing:** a set-piece piece selects its entry; a dressing piece selects room dressing; cycling order.
- **Saving:** `saveLayout` rejects an unknown id, an invalid body and a body that fails to build, and writes canonical text on success.
- **Level recipes:** every recipe on the shipped districts equals its level constant; the main floor re-stitches when an exit moves.
- **`contentWith`:** an edited district's new object shows up in `findContentIssues` results.
- **Audit:** each heuristic flags a synthetic room built to fail it and passes the shipped Atrium plaza.
- **In the browser pane:** edit, move, rotate, paint, undo, save and reload on the Atrium; the level view of the main floor; NPC and creature rigs visible in 3D.

`npm run typecheck` and `npm test` pass at every commit.

## Documentation

- `CONTRIBUTING.md`: editing a district in the viewer, and the save rules.
- `ARCHITECTURE.md`: the editor document, edits, the save endpoint and level recipes.
- `WORLD_DESIGN.md`, "Adding a district": build it in the editor.
