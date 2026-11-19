# Handoff: the land plan engine is in; plan the client scenery and the editor's land layer next

Written 2026-11-19. Picks up from `2026-11-19-hinterland-atlas-plan.md`. Plan: `docs/superpowers/plans/2026-11-19-land-plan-engine.md` (build order step 1 of `docs/superpowers/specs/2026-11-19-hinterland-atlas-design.md`).

## What landed (pushed to main)

- `15f4034` A blueprint can draw on a base of tiles, heights and rooms (`BlueprintBase`); `isInsideShape`, `rampHeightAt` and `findCliffs` are shared.
- `93ebcd9` The land plan: `world/landPlan.ts` (`drawLand`, `cutSquare`) and `world/landSchema.ts` (`parseLandPlan`).
- `8bf5a3d` `buildDistrict(layout, land)` cuts a layout's `square` and draws its own steps on top.
- `f5b0d52` `placeLandSquares` and `pinPlacements` in `world/levelPlan.ts`.
- `c295841` The fixture level `fx-wilds` (`test/fixtures/world/wilds.ts`); the seam, exit and reachability checks know about land squares.
- `7cda5ef` The fixture's field and outpost meet only at a door (ruling R4: fix the content, no exemption).
- `5e43b7a` `findSealedWardIssues` (`content/wardIntegrity.ts`) and `findLandIssues` (`content/landIntegrity.ts`).
- `548ef24` The server's `areasAt` and `isSafe` go by the district that owns the tile.
- `25b8dcd` ARCHITECTURE.md and WORLD_DESIGN.md.
- `9b418a5` The review's fix wave (see below).

`npm run typecheck` passes; `npm test` passes (last suite: `ℹ tests 858`, `ℹ pass 858`, `ℹ fail 0`).

## Decisions this plan made

- **Polygon points are tile corners, line points are tile centres.** A tile is inside a polygon when its centre is, so a polygon from x 0 to 10 covers tiles 0–9 and a line from 0 to 10 covers 0–10.
- **Lines are an odd number of tiles wide** (the schema refuses even widths). A line of width `w` paints `w` tiles across when straight. It paints every tile whose square, grown by `(w − 1) / 2` on each side, the centre line touches, so a diagonal stays joined edge to edge (a diagonal wall does not leak, and a diagonal road is walkable).
- **`split` lives on the square** (`{ column, row, split: true }`); each half keeps its own ward's tiles and the rest is void.
- **The square's room is `ground`** (`LAND_GROUND_ROOM`), covering the whole square.
- **The land rides on `LevelDefinition.land`**, so the checks and the server read it.
- **The wilds are kept out of `FIXTURE_LAYOUT_SOURCES`**: they need the land to build.
- **`drawLand` parses its plan** with `parseLandPlan`. A TS-typed plan is zod-checked too.

## The review and its fix wave

The final review found nothing critical and judged the engine "ready to merge with fixes". `9b418a5` fixed:

- **Speed.** Polygons fill by scanline; each line segment visits only its own box; `findCliffs` skips ground lower than a cliff drop before reading walkability. A 768 × 640 plan with a 600-point coast and a 60-segment river draws in about 25–40 ms (it was over a second).
- **Line width and the coordinate rules**, as above, pinned by tests (widths 1/3/5, 2/4 refused, a diagonal and a shallow line stay joined, polygon even-odd against a brute-force oracle).
- **Split-square doorways.** `openingsOf` counts a tile as outside the room when the district's own map is void there but the level is walkable, so a ward gate is a doorway from the side that does not own it (test: a crate in front of `fx-wall-gate` on the west side).
- **Gate ids** are kept on a null-prototype object with `Object.hasOwn`, so `constructor` or `__proto__` are plain names.
- **255 wards** at most per plan; the 256th throws.
- **A gate drawn over** (painted later, or turned to cliff) is reported by `findLandPlanIssues`.
- **`district X: its land at x,y`** now gives square coordinates, so the editor's marker lands on the tile.
- **Unpainted land is a seam.** `isBareLand` needs a painted, unwalkable tile; void land no longer passes as sea.
- **WORLD_DESIGN.md**: the sealed-wards rule is now 12a, so "rule 13" and "rule 17" are unambiguous again.
- **P2 (set pieces skipping the void check) was not a gap.** `setPiece` already refuses a void tile; a test now pins it.

## Still open

- **Before `npm run bench:tick` on 768 × 640 (build step 4):** `isSafe` in `server/src/world/levelInstance.ts` allocates a filtered array per call, and creature pathfinding calls it per node. Build a per-tile safe mask and area index once per level instance.
- Small things for when the modules are next touched: `isWalkableLand` in `landIntegrity.ts` repeats `isWalkableTile`; `drawBlueprint` works out the drop depth again after `findCliffs`; the base-size test regex is weak; no negative sealed-ward test on a level without land; no `wildsWith(identity)` baseline test; no test for the void-land seam rule.

## Next: client scenery and the editor's land layer (build order steps 2–3)

Write the plan with `superpowers:writing-plans`. It starts from:

- `LevelDefinition.land`, for drawing land that lies in no district (sea, rock, scenery past the squares).
- `ResolvedLevel.districts` rectangles overlap in split squares, so world-map and minimap labels by rectangle will double up.
- `questRoute`'s `enterArea` goal sits at the area rectangle's centre, which can fall on the sibling's side of a split square. Wall-light mounts per area rectangle have the same issue.
- The editor builds land squares without the land, and the module-level `foreignAnchors` cache in `layout.ts` goes stale under land edits. The editor should re-cut every square a land edit touches; drawing is now cheap enough for that.

## How to work

- Read `CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` and `WORLD_DESIGN.md` first.
- Commit and push to main after each green batch, and leave a handoff here before the context gets long.
- **Other sessions are working in this folder.** Stage files by name only. Never stage the HUD files under `packages/client/src/hud`, `screens` or `styles`, `scripts/_ids.ts`, `scripts/_ascii.ts`, `.claude/launch.json`, `.claude/settings.json` or `docs/handoffs/2026-11-18-ui-audit.md` unless they are your own work.
