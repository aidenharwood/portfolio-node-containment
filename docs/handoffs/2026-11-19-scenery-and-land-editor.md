# Handoff: the client draws the land and the editor has a land layer; draw the Hinterland next

Written 2026-11-19. Picks up from `2026-11-19-land-plan-engine.md`. Plan: `docs/superpowers/plans/2026-11-19-client-scenery-and-land-editor.md` (build order steps 2 and 3 of `docs/superpowers/specs/2026-11-19-hinterland-atlas-design.md`).

## What landed (pushed to main)

- `a06ad0d` Task 1: the scene layout, `world/landScene.ts` (`sceneOf`, `SceneLayout`, `LAND_MARGIN`), set as `ResolvedLevel.scene` in `resolveLevel`.
- `40e00d6` Task 2: footprints and area goals, `world/districtFootprint.ts` (`footprintsOf`, `areaGoal`).
- `261ffd0` Task 3: land plans as content, `content/land/` (`LAND_SOURCES`, `SHIPPED_LANDS`, `landFrom`), `GameContent.lands`, `LevelContext.landOf`, `printLandPlan`. `hinterland.json` is a 12 × 10 sea of 64-tile squares.
- `b7f8b90` Task 4: `changedSquares(before, after)`, and the foreign-anchor cache keyed by the land it was found on.
- `441a160` Task 5: chunks are built from the scene, including the margin (`chunkRegion` clips to `scene.bounds`).
- `ab9eb21` Task 6: seams treat land no district owns as the outside (`ownerAt`); wall lights mount on their own district's side (`mountsIn`).
- `1e1c82e` Task 7: the minimap and world map paint the whole plan and label districts by footprint (`hud/mapLabels.ts`).
- Task 8, the editor's land scope (`?land=<id>`, `readViewState`, `landLevel`), was swept into another session's commit `a312f38` ("UI audit round 6: critic round 5 fixes") because both sessions staged in the same folder. The code is on main and tested; only the commit message is wrong.
- `cc2f59f` Task 9: the editor document holds land plans, re-cuts the squares a land edit changes, and has one undo stack across districts and land.
- `5f105ed` Task 10: pure land edits (`client/src/editor/landEdits.ts`).
- `53adcc6` Task 11: the land tool (L) and step and vertex selection on the plan.
- `13cc7c5` Task 12: `POST /__editor/land/:id` (`saveLand` in `client/editorSave.ts`), refusing a plan that breaks a square cut from it.
- This commit, Task 13: ARCHITECTURE.md (Levels and districts, Client rendering), WORLD_DESIGN.md (Authoring rule 7a), CONTRIBUTING.md (Cut a land square) and this handoff.

`npm run typecheck` passes; `npm test` passes (`ℹ tests 941`, `ℹ pass 941`, `ℹ fail 0`).

The shipped game did not change: no shipped level has `land`, so the overworld, the server and `bench:tick` behave as before.

## Decisions this plan made

- **One drawing layout, not a second render pass.** Land is the scene's fallback tile, so the voxel builder, liquid, sky mask, floor scatter and maps needed no land code of their own.
- **`scene` is for drawing, maps and picking only.** Walkability, safety and district or area lookups read `layout`.
- **Past the edge, the nearest edge tile repeats** (tile and height) for `LAND_MARGIN = CHUNK_SIZE` tiles. Walkable land never meets the edge, so `BUILD_RADIUS` (one chunk) never builds past the margin. Distant views are the far view's job (build order step 6).
- **Maps paint the plan only, not the margin.**
- **Footprints, not rectangles.** Labels, outlines, `enterArea` goals and wall-light mounts go by the tiles a district owns. `PlacedDistrict.rect` stays as the placement rectangle.
- **A land plan is content**, asked for with `context.landOf(id)`; the fixture does the same with `fx-land`.
- **Land edits apply on release**, with a ghost outline while dragging, because `drawLand` takes 25 to 40 ms on a full plan.
- **An edit re-cuts only the squares whose window changed** (tiles, heights and wards compared per square).
- **Saving land is refused while any square cut from it fails to build**, since the game builds every district at load. Rock under a placement is a content issue Check reports; only void under a placement fails `buildDistrict`.
- **One undo stack across districts and land.**

## Not yet checked in a running editor

Step 2 of Task 13 (the browser look) was skipped. **The land tools have not yet been checked in a running editor.** Everything above is covered by unit tests only. Before drawing the Hinterland for real, run `npm run dev`, open `/editor.html?land=hinterland`, and draw a coast polygon, a river line, a round rise with a ramp, a ward and a gate. Check that:

- the 3D view shows sea, land, the cliff at the rise and the margin past the edge;
- undo and redo work;
- saving writes `hinterland.json` and a reload shows the same land.

Then put `hinterland.json` back to the starting sea (`git checkout` that file, after checking `git diff` shows only the test drawing). Look hardest at the plan's Review Focus item **a district wall beside land**: a district's outer fence should look the same beside sea as beside void, and a building wall should not get a kerb because there is grass beyond it. Check the fixture's 3D preview too.

## Still open

- **Before `npm run bench:tick` on 768 × 640:** `isSafe` in `server/src/world/levelInstance.ts` allocates a filtered array per call, and creature pathfinding calls it per node. Build a per-tile safe mask and area index once per level instance. (Carried over from the last handoff.)
- The small items listed under "Still open" in `2026-11-19-land-plan-engine.md` still stand.

## Next: draw the Hinterland (build order step 4)

The plan is written and committed: `docs/superpowers/plans/2026-11-19-draw-the-hinterland.md`. Execute it task by task. It starts with the open `isSafe` item above, then seeds `hinterland.json` from the approved map, cuts the land squares, and changes the overworld recipe: the Low Ward joined and pinned with `pinPlacements` so Terminus Square's origin is (128, 320), land squares placed by `placeLandSquares`, and the 42 block-out squares replaced. Do the browser check above first, since that plan tunes the land in the editor's land layer.

## How to work

- Read `CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` and `WORLD_DESIGN.md` first.
- Commit and push to main after each green batch, and leave a handoff here before the context gets long.
- **Other sessions are working in this folder.** Stage files by name only. Never stage the HUD files under `packages/client/src/hud`, `screens` or `styles`, `scripts/_ids.ts`, `scripts/_ascii.ts`, `.claude/launch.json`, `.claude/settings.json` or `docs/handoffs/2026-11-18-ui-audit.md` unless they are your own work. `git pull --rebase` may refuse because of other sessions' unstaged files; use `git pull --rebase --autostash` only if origin has moved.
