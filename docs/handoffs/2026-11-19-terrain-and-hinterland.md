# Handoff: terraced ground built; the Hinterland atlas is next

Written 2026-11-19. The owner looked at the Hollow Bay atlas, said it reads as "a grid of square areas with different tiers" with "no real flow or wonder factor", and pointed at how the OSRS map is laid out. Spec: `docs/superpowers/specs/2026-11-19-hinterland-and-terrain-design.md`.

## Decisions the owner made

- **Towns in a reclaimed landscape.** The Low Ward stays a dense port town; beyond the Cordon the anomalies let the city go wild, and towns of very different sizes stand in that land.
- **Sketch B, the Hinterland.** The Low Ward is a port on the west coast where a river meets a small bay, and the land opens behind it in every direction, as round Lumbridge.
    - The Shipyards are on the north-west coast and the Heights on a ridge to the north.
    - Old Town is walled, in the central valley. Ironside is at the falls under the north-east mountains.
    - The Tidemarsh is a delta on the south coast and the Drowned Quarter is on the south-east coast. The Lantern is on a spit to the south-east.
    - The Blight in the far east is the wild edge where the Hollow opens in a crater lake.
    - Roads fork at crossroads and loop.
- **Terraced ground (sketch A).** Whole steps; one step is a walkable rise, more is a rock cliff.
- **Height works as it does in OSRS.** It decides where you can walk and what you can see past, and adds nothing in combat.

The sketches were throwaway HTML in `.superpowers/brainstorm/` (git-ignored), and the brainstorm server is stopped.

## What landed (pushed to main)

- `9aeab6b` **Shared.**
    - Tiles carry a height from 0 to 15. `rise` and `ramp` blueprint steps and painted `heights` in a layout raise ground.
    - Walkable ground two or more steps above a walkable neighbour becomes the new `cliff` tile: not walkable, a wall for sight. The server needed no change.
    - The blueprint refuses a doorway that would become cliff and a building on uneven ground. `findTerrainSeamIssues` checks seams between districts.
    - Districts store `heights` rows only when raised, so every existing district is unchanged.
- `b1e54e4` **Client, editor and docs.**
    - Chunks paint each tile at its height with earth or rock beneath (`levelVoxels.ts`, `RaisedCanvas`).
    - Everything on the ground follows `groundAt`, characters ease towards it, and clicks walk the height field (`render/world/ground.ts`).
    - The editor has a height brush (H) that raises, lowers, levels or resets tiles, selectable rise and ramp steps, and height shading on the plan, the minimap and the world map.
    - `WORLD_DESIGN.md` has a Terrain section, and `ARCHITECTURE.md` notes the renderer.

`npm run typecheck` is clean and 810 tests pass.

## Verified, and not

- **Verified in the editor** (`http://localhost:5176/editor.html`, the older preview still running from the UI audit). A three-step plateau painted on Laundry & Gardens drew:
    - rock cliff faces with a rocky rim;
    - a two-step ramp of terraces;
    - banner props standing on top;
    - an NPC placed by clicking the plateau, seated on it with its selection box lifted;
    - a plan showing the cliff ring and lighter raised ground.
- **Nothing was saved.**
- **Not verified in a live game.** No shipped district has terrain yet, a new character always spawns in Terminus Square, and the dev servers on 5173/7420 and 5176/7421 belong to other sessions. The first district built with terrain should be walked end to end, checking:
    - a character climbing a ramp;
    - the camera following it;
    - clicking the top of a cliff;
    - creatures pathing round a plateau;
    - ranged attacks across a cliff rim.
- **Weather** lifts its whole volume to the ground under the camera focus, so rain falls to that height everywhere in view. That is fine while hills stay local.

## Next: the Hinterland atlas (build order step 2)

1. **A short brainstorm on placement** before any layout changes:
    - how large the land is: the overworld is 640×512 tiles today;
    - where each town sits and how big it is;
    - where the river, the ridge, the mountains and the Blight go;
    - which crossings are the ward gates;
    - how the tier ladder from `2026-11-18-hollow-bay-atlas.md` maps onto distance from the Low Ward;
    - whether the story chapters keep their order now the Hollow is under the Blight's crater instead of the bay.
2. **Authoring across squares.** The land must read as one continuous place with the 64×64 squares invisible, as in OSRS: the coast, the river and the ridges cross square edges. Two ways to get there:
    - a world-scale terrain plan that each square's layout is cut from;
    - squares of varied sizes joined by `joinDistricts`.

    Decide which before drawing. The current 42 squares beyond the Cordon are a throwaway block-out and can be replaced; the Low Ward is built and peopled and stays.
3. **Update the docs.** Rewrite the "What the world should feel like" section of `WORLD_DESIGN.md`, its Wards section and the atlas spec to match.

## How to work

- Read `CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` and `WORLD_DESIGN.md` first.
- Commit and push to main after each green batch, and leave a handoff here before the context gets long.
- `.claude/launch.json` has an unrelated local change (a `gear-gallery` entry for another worktree). It is not this work, so leave it uncommitted.
