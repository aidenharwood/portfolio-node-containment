# Handoff: the Hinterland atlas is designed; write the engine plan next

Written 2026-11-19. Picks up from `2026-11-19-terrain-and-hinterland.md`. The owner brainstormed placement and approved the design:

- Design: `docs/superpowers/specs/2026-11-19-hinterland-atlas-design.md`
- Approved map: `docs/superpowers/specs/2026-11-19-hinterland-atlas.svg`

## Decisions the owner made

- **Size: 12 × 10 squares** (768 × 640 tiles). One square takes about 19 seconds to cross; a character walks one tile per 300 ms tick, which is OSRS running speed.
- **Placement as drawn on the map**, built on sketch B.
- **The Low Ward does not change.** It keeps only the Cordon gate (east) and the sluice (south). The Shipyards are reached by the road round the moor; no north gate is added.
- **Approach A: one land plan for the whole overworld, with each 64 × 64 square cut from it.** B (varied-size squares) and C (one district per ward) were turned down.
- **Approved the design doc as it stands.** That includes the calls listed at the end of the doc, and the fixes added after the builder check:
    - the creek between the Great Wood and the Drowned Quarter;
    - Gallows Hill's cliffs;
    - the Blight road's ledge;
    - land closing the north and east edges;
    - area lookup by the tile's owning district.

## What landed

- `ca3dfbe` (pushed to main): the design doc and the map SVG. No code has changed.

## Next: the implementation plans

Use `superpowers:writing-plans` with the design doc. It spans separate pieces, so write one plan per piece, in this order:

1. **Land plan engine (shared and server)**, build order step 1. This plan comes first and is testable on the fixture world.
    - Land plan data types, and cutting a square from the plan in `buildDistrict`.
    - Placing land squares on the overworld by grid.
    - Edges derived from the land.
    - Split squares (two districts in one square).
    - The new sealed-ward check.
    - Exit, seam and tier checks adapted for land squares.
    - Server area and safety lookup by the tile's owning district.
2. **Client scenery and the editor's land layer**, build order steps 2–3.
3. **Draw the Hinterland**, build order step 4: about 90 squares, replacing the 42-square block-out.
4. Then docs and the live walk, the far view (its own plan), and wards in order.

### Code the engine plan touches (found while designing)

- **`shared/src/world/blueprint.ts`:**
    - `drawBlueprint` turns every `void` tile touching floor into a wall (`needsWall` and `wallFor`). In a split square, the sibling district's tiles are void to this one, so walls would grow against them.
    - Exits are declared steps (`drawExit`) and carve to the district edge.
    - `rise` and `ramp` exist; there are no free shapes yet.
- **`shared/src/world/layout.ts`:** `buildDistrict`, `drawLayout` and `checkGeometry`.
- **`shared/src/world/layoutSchema.ts`:** the zod schema for layout JSON. A land square needs a `square` and an optional ward for split squares.
- **`shared/src/world/levelPlan.ts`:** `joinDistricts` places districts by exits, or by `{ districtId, from, offset }`.
- **`shared/src/content/levelIntegrity.ts`:** overlap is checked per non-void tile, so two districts can share a square.
- **`shared/src/content/worldDesignIntegrity.ts`:**
    - `findExitIssues`: minimum width 9, and two ways in;
    - `findSeamIssues`: floor open onto void;
    - `findTerrainSeamIssues`;
    - `findTierIssues`, which walks district adjacency.
- **`shared/src/content/overworldIntegrity.ts`:** reachability on foot from the spawn.
- **`server/src/world/levelInstance.ts`:** `areasAt` and `isSafe` find areas by rectangle across the whole level. In a split square they must go by `LevelLayout.districtAt`.
- **`server/src/characters/storedLocation.ts`:** `restoreLocation` sends a position in a missing district to the main-floor spawn. Keep the `gatehouse-yard` id for the crossroads square.
- **`client/src/render/world/levelScene.ts`:** `BUILD_RADIUS = 1` chunk (32 tiles), so nothing far away is drawn. The far view needs its own plan.
- **`content/seed/hollowBay.ts`:** `HOLLOW_BAY_REGIONS`, the quartermasters and `WARD_OPEN_FLAG`.
- **`content/levels/overworld.ts`:** the overworld recipe, joining the 9 Low Ward squares and the 42 block-out squares.
- **Tests:** they run against `FIXTURE_CONTENT` (`packages/shared/test/fixtures/world/`). The engine plan should add a small land plan to the fixture world.

## How to work

- Read `CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` and `WORLD_DESIGN.md` first.
- Commit and push to main after each green batch, and leave a handoff here before the context gets long.
- **Other sessions are working in this folder.** At handoff time, `git status` showed changes that are not this work. Leave them alone and never stage them:
    - modified HUD files under `packages/client/src/hud`, `screens` and `styles`;
    - a deleted `scripts/_ids.ts`;
    - `.claude/launch.json`;
    - `docs/handoffs/2026-11-18-ui-audit.md`;
    - `scripts/_ascii.ts`.

  Stage only files by name.
- The brainstorm companion server from this session may still be running from `.superpowers/brainstorm/16845-1795078179/` (git-ignored). It stops by itself after four idle hours. The map generator was a throwaway scratch script. The SVG in the specs folder is the record.
