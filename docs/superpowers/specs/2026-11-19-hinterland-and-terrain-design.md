# The Hinterland and terraced ground

Follows `2026-11-18-hollow-bay-atlas.md`. The owner looked at the assembled atlas and said it reads as "a grid of square areas with different tiers" with "no real flow or wonder factor", and pointed at how the OSRS map is laid out. This spec records what was decided and how the first part, terrain height, is built.

## Why

The atlas is 51 squares of 64×64, each laid out alone from the same road template, one theme and one tier per square, with straight ward borders and the bay as black void. OSRS is also stored as 64×64 map squares, but nobody sees them: the coast, the rivers, the roads and the towns are drawn across them. Towns are destinations with land between them, you see places before you can reach them, and the ground itself (rivers, cliffs, mountains) decides where you can go.

## Decisions

1. **Towns in a reclaimed landscape.** The Low Ward stays a dense port town. Beyond it, the anomalies have let the city go wild: overgrown suburbs, woods, marsh, moor and ruins, with towns of very different sizes standing in that land.
2. **The Hinterland shape (sketch B).** The Low Ward is a port on the west coast where a river meets a small bay, and the land opens behind it in every direction, the way it does round Lumbridge. Roads fork at crossroads and loop.
    - **Towns.** The Shipyards sit on the north-west coast and the Heights on a ridge to the north. Old Town is walled, in the central valley. Ironside stands at the falls under the north-east mountains. The Tidemarsh is a delta on the south coast and the Drowned Quarter is on the south-east coast. The Lantern is out on a spit to the south-east.
    - **The Blight.** In the far east, a wild edge where the Hollow opens in a crater lake.
    - **Ward crossings** become things in the land: a bridge, the incline up the ridge, a pass, a ford, a causeway.
3. **Terraced ground (sketch A).** The ground rises in whole steps, like the blocks it is built from. One step is a walkable rise; anything more is a cliff of bare rock you cannot climb.
4. **Height works as it does in OSRS.** It decides where you can walk and what you can see past. There is no high-ground bonus in combat, and distances stay flat.

## Goals

- Ground that rises and falls, with impassable cliffs, on every level that wants it.
- Authoring stays blueprint-first: you raise ground with steps, as you carve rooms; cliffs are generated, as walls are.
- The server stays authoritative with no new movement rules: a cliff is a tile you cannot enter.
- Everything the client draws sits on the ground: characters, props, floor decals, litter, shadows, water, lights, markers and the click target.

## Non-goals

- Smooth slopes or tilted tiles.
- Overhangs, bridges over cliffs, or several floors on one tile.
- Height in combat, range or experience.
- Laying out the Hinterland itself. That is the next step and gets its own plan.

## Anti-goals

- Hand-typed height maps. Heights come from blueprint steps and the editor's brush, never typed rows.
- A cliff you can walk up because two districts disagree at a seam.

## The height model

- **Height.** Every tile has a height in whole steps from 0 to 15. Step 0 is the old flat ground and sea level, so every existing district is unchanged.
- **Size of a step.** One step is 4 voxels, half a tile; a 4-step cliff is as tall as a building wall.
- **The rule.** Two walkable tiles that touch, including diagonally, differ by at most one step.
- **Cliffs.** Where a walkable tile has a walkable or door neighbour two or more steps below it, the higher tile becomes a `cliff`: not walkable, a wall for line of sight, drawn as a rock face down to the ground below. Pathfinding, movement checks, creature leashing and line of sight already treat such a tile as blocked, so the server needs nothing new.
- **Liquids and walls** keep whatever height they are given. Water lies at its tile's height, and a wall stands on its tile's height.

## Authoring

- **`rise` step:** `{ kind: "rise", rect, height, shape? }` sets every non-void tile in the rect (or its round or octagonal shape) to that height.
- **`ramp` step:** `{ kind: "ramp", rect, side, from, to }` climbs from `from` at the far edge to `to` at the `side` edge, one step at a time, spread evenly across the rect.
- **Brush.** A layout's `heights` list, `[{ x, y, height }]`, paints single tiles after the steps. This is what the editor's height brush writes.
- **Order.** Steps run in order and later ones win. Rooms and buildings carve on top of whatever height is under them. Height steps usually come right after the ground room and before roads and buildings.
- **Storage.** A district stores its heights as generated rows (`heights`, one base-36 character per tile), and only when something is raised.

## Checks

- **No doorway on a cliff.** A door, exit or link tile never becomes a cliff: drawing the blueprint fails and names the tile.
- **Buildings stand level.** Every tile of a `building` step's interior has one height (**checked**).
- **Seams match.** Across a district seam, touching walkable tiles differ by at most one step (**checked**, `findWorldDesignIssues`).

## Client

- **Chunk voxels.** Each tile is painted at its raised base. Below it, the column is filled with earth: soil and grass sides on a one-step rise, rock on a cliff. A chunk's volume grows only by the height its tiles reach.
- **Ground height.** One shared lookup turns a tile into a ground height in world units. Characters ease towards the ground under them, so a step reads as a quick climb, not a snap.
- **What sits on the ground.** Objects, lights, floor litter, footprint shadows, water surfaces, rings, click markers, telegraphs and route dots all add the ground height.
- **Clicking.** The click ray walks the height field to find the first tile whose top it meets, so you can click the top of a cliff.
- **Maps.** The minimap and world map shade height, so ridges and valleys read from above.
- **Editor.** A height brush (raise, lower, set) paints `heights`, and the 3D preview shows the result.

## Build order

1. **Terrain engine.** Shared data, blueprint steps, cliffs and checks, then the client: voxels, ground height, placement, clicking, the maps and the editor brush. The checks and tests stay green throughout.
2. **The Hinterland atlas.** Re-plan the 42 squares beyond the Low Ward to sketch B, and update `WORLD_DESIGN.md` and the atlas spec. It gets its own short brainstorm on placement first.
3. **Wards in order**, as the atlas spec already sets out.
