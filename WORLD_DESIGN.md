# World design guide

Read this before adding or changing a district, a level or anything placed in one. It applies to humans and AI agents alike. Every district in the game follows these rules; there is no exemption list. The rules marked **checked** are enforced by `findWorldDesignIssues` (`packages/shared/src/content/worldDesignIntegrity.ts`), which runs inside `findContentIssues`: the server will not boot and `npm test` fails when one is broken. The rest is judgement, and reviewers hold changes to it.

## What the world should feel like

Site Meridian is **one large facility you can walk across**, not a set of rooms joined by corridors. A player should be able to pick a direction and keep going, pass things that are not for any quest, and tell where they are from the shape of the place.

- **Open before enclosed.** Prefer halls, yards and plazas with things standing in them over boxes with one door. Break a big space up with colonnades, pools, partitions and changes of floor, not with walls on every side.
- **Filler is content.** Roughly half of a level's floor should be space no quest sends you to: boulevards, junction plazas, dormitories, canteens, storage bays, freight yards, plant rooms, canals. It carries props, litter, light, the odd gathering node and wandering creatures at the tier of the ground it joins.
- **Coherent shape.** Every level has a plan you can describe in one sentence (the main floor is a hub with a ring boulevard and wings off it; the Deep is a ring causeway around a chasm). New districts extend that plan. They do not get bolted onto the nearest free edge.
- **Negative space is deliberate.** Void between districts is a chasm, a shaft or solid rock, and reads as one. It is never just the part nobody drew.
- **Landmarks.** Each junction plaza and each district has one thing visible from a distance and found nowhere else, so players can navigate without the map.

## Rules

### Authoring

1. **Maps are drawn with blueprints** (`shared/src/world/blueprint.ts`), never typed as ASCII rows. A district sets `map`, `rooms` and `exits` from `drawBlueprint`. **Checked.**
2. **Never draw walls.** Carve rooms, links and exits; every void tile touching floor becomes wall. Use `patch` with `wall` or `glass` only for partitions inside a space.
3. **Place by room.** Every position in a layout file is room-relative, `{ "room", "dx", "dy" }`, or an exit or link tile (`{ "exit", "index" }`, `{ "link", "index" }`). An absolute `{ "x", "y" }` is only for a point in no room. Everything must stand inside a named room or on a door tile. **Checked.**
    - **Things that belong on a wall stand against one.** Doors, lifts, lockers, cabinets, placards, valves, vents and notice boards have a wall tile directly beside them and face away from it (**checked** for the wall, `findFixtureIssues`). A door never stands in an open exit; put it in a wall beside the opening or in a doorway of its own width. The Knock is the one freestanding door, by design.
    - **Track through a room is walled off** unless the room is the platform or people must cross it there.
4. **Areas are rooms.** Declare areas with `plan.area(room, name, options)`. An area's id and rectangle match a room. **Checked.**
5. **Name the points other content needs.** Tram platforms, teleport landings, spawns and recovery points are entries in the district's `anchors`. Other content and tests read the anchor; they do not repeat its numbers. Tests use `inRoom(districtId, roomId)` and `anchor(districtId, anchorId)` from the server test harness.
6. **Scatter instead of random.** Bulk litter, props, nodes and creature packs come from `plan.scatter(room, count, seed, avoid)`, which is deterministic. Nothing in `shared` calls `Math.random()`.
    - **Dress every room.** Wrap the district in `furnish(plan, district, dressing, options)` (`content/districts/furnish.ts`) with a theme for each room (`civic`, `office`, `canteen`, `freight`, `ward`, `chapel`…, see `DRESSING_THEMES` in `content/prefabs/types.ts`). Hand-place landmarks and quest props first; the dressing fills around them, and litter under furniture is cleared. Do not scatter loose furniture with `scatterObjects`; it is for litter, nodes and creatures. Generic NPCs (`content/ambientNpcs.ts`) stand in safe rooms.
    - **Set-pieces** are the hand-composed centres of landmark and feature rooms: a prefab from `content/prefabs/` placed with `setPiece(plan, room, prefab, dx, dy, facing)` and passed as `options.setPieces`. They go down before anything is composed, never overlap what is already there, and keep a clear ring around them. Name each district's landmark rooms in `options.landmarks`; each one holds a set-piece whose prefab has the `focal` role.
    - **Compositions** dress the rest. Each room uses one from `content/compositions.ts` (`court`, `radial`, `concourse`, `hall`, `workroom`, `yard`, `nave`), named by `composition` on its dressing or inferred in this order: an octagonal or round room is `radial`; a `chapel` room is a `nave`; a room at least 2.5 times as long as it is wide is a `concourse`; one under 500 tiles is a `workroom`; a `freight` or `wet` room is a `yard`; anything else is a `court`. A composition fills zones in order (a focal piece in the centre or at the far end from the main door, corner accents, bays backed onto the walls, edges beside the walking lane, and a field of islands), drawing role-tagged prefabs from the theme's libraries. No prefab sits in two neighbouring slots or appears more than three times in an informal room; informal rooms jitter each slot by a tile, and formal rooms (`radial`, `nave`) are mirrored across their main axis. Corners are only dressed when the room's short side is at least 8 tiles (`MIN_CORNER_SPAN`), and a corner accent may repeat the prefab beside it. The walking lane is a cross through the middle, a strip five wide down long concourses, or a ring round the focal piece with paths to every opening. Density sets the spacing. Composed pieces stay more than three tiles from every opening and clear of doorways, anchors and exits.
    - **Decals** paint the floor: inlays, mosaics, rugs, runners, lane paint and hazard paint come with prefabs and lanes; wear, scorch, cracks, moss, water stains, salt crust and alien veins come with condition. They lie on walkable floor only and change nothing in play.
    - **Condition** weathers a district after it is composed. Set `condition` on the district (`pristine`, `worn`, `breached`, `overgrown`, `flooded`, `alien`, `uncanny`) and override it per room on the dressing. `CONDITION_RULES` (`content/conditions.ts`) swaps a share of composed props for wrecked variants of the same footprint, adds ruin prefabs (`content/prefabs/ruin.ts`) and stamps decals; `uncanny` makes every composition formal and doubles one prop across the room. Fixtures and set-pieces are never touched. The world decays with depth: the Atrium is pristine, the Circuit and the yards worn, the wings breached or flooded, the Deep alien. `options.decalSwaps` trades one condition decal for another (the Calder salt workings show `salt-crust` in place of `alien-vein`).
7. **Ids are forever.** Do not rename an area, an instance id or a district: saves, quests and flags refer to them.

### Furnishing

`findFurnishingIssues` (`content/furnishingIntegrity.ts`) runs inside `findContentIssues`. Fix what it reports by moving a fixture the least distance, changing a room's density or composition, or widening a theme's library; never by editing a blueprint.

- **Doors stay clear.** No set-piece or composed piece covers a door, exit, anchor, link or track tile, and no composed piece stands within 2 tiles of its room's opening. **Checked.**
- **Every floor tile can be reached.** After dressing, each room is flood-filled from its openings and anchors on the level's walkability grid; every walkable tile of the room must be reached. **Checked.**
- **Landmarks are set-pieces.** Every room named in `landmarks` exists and holds a set-piece with a `focal` prefab. **Checked.** Every district will name one once they all have a set-piece.
- **Variety.** A room with more than 150 walkable tiles uses at least three distinct prefabs, counting set-pieces and condition additions; an informal room uses no prefab more than three times. `furnish` records what each room used in the district's `dressingLog`. **Checked.**
- **Decals lie on walkable floor**, never on a door. **Checked.**
- **Condition swaps are honest.** Every swap source and target exists and keeps its footprint, and every added prefab exists. **Checked.**
- **Wall fixtures stand against a wall**, counting multi-tile footprints (the back edge must touch the wall). **Checked** (`findFixtureIssues`).
- **Prefabs are valid.** Pieces name real objects and do not overlap once footprints count, roles are not empty, `wall` and `bay` prefabs have a back row, each prefab id appears once across the libraries and keys `PREFABS`, and every object footprint is at least 1×1. **Checked.**

### Joining districts

8. **Districts meet at exits.** An exit is declared with `exit(id, room, side, width)` and placed on a level with `joinDistricts` (`world/levelPlan.ts`), which works out origins. Do not write origin arithmetic by hand except for a district that is deliberately detached (`{ districtId, from, offset }`), such as the Intake Wing across its chasm.
9. **Open exits are at least 9 tiles wide.** Only an exit that is a door, bulkhead or gate may be narrower, and it is marked `gate: true`. **Checked.**
10. **No floor opens onto the void.** Every exit must meet the floor of a neighbouring district. When a loop of districts has to close, the sizes are yours to get right; the check tells you when they are not. **Checked.**
11. **Two ways in.** On a level with more than one district, a district has at least two exits, so the world has loops. A boss room, vault or other deliberate cul-de-sac sets `deadEnd: true`. **Checked.**
12. **Walk first.** Every district on the overworld is reachable on foot from the Atrium (`findOverworldIssues`). Trams and lifts are shortcuts. The Intake Wing is the only exception.

### Difficulty and population

13. **Tier never falls with distance.** Going outward from a level's spawn along the shortest chain of districts, tier stays level or rises. Filler takes the tier of the gentler ground it joins. **Checked.**
14. **Creature density stays in band:** between 3 and 14 creatures per thousand walkable hostile tiles in any district that has creatures. Around 6 suits open ground; boss rooms and camps run higher. **Checked.**
14a. **Bodies fit.** A creature's whole footprint (2×2 for large creatures) stands walkable inside one room and outside safe areas, and no two creature homes overlap. Bosses with telegraphs or hazards stand in a `multiCombat` area. **Checked** (`findFootprintIssues`, `findEncounterIssues`).
15. **Safe ground is for people.** NPCs, lockers, shops, mailboxes, contract boards and tram platforms stand in `safe` areas; creatures and gathering nodes do not (`findSafetyIssues`, the world audit test).
16. **Every region has an outpost** with the services `findRegionIssues` lists, behind or beside the hostile ground, and a dungeon lift once it has a dungeon floor.

### Transit

17. **Track is drawn, and it loops.** Every platform has `track` tiles within six tiles of it (**checked**). On each level, a line's stations share one connected run of track, and that run is a closed circuit: with any one platform taken out, the track leaving its two ends still joins up the other way round (**checked**, `findLineIssues`; track tiles count as joined when they touch, including diagonally). Lines that serve the same level share track where they can: the Intake Shuttle rides the Meridian loop. The bed is two tiles wide.
    - **Platforms.** The track runs straight through the platform room and out of it at both ends, so a tram comes in one end and leaves by the other (`findTramIssues`). Give the room a `hazard` strip along the platform edge and walkable floor beside the car. A platform is usually a room on the district's edge with the bed along its outer side; where the bed cuts a door or an exit off from the platform, put `bridge` assemblies over it.
    - **Inside a district** draw the bed with `track(...)` in the blueprint. Through void it becomes a tunnel, since the rock beside it is walled. Where it must cross walkable floor, cross at right angles and put `bridge` assemblies over it (`facing: 'south'` over a bed running east–west, `'east'` over one running north–south), several side by side on a boulevard. Otherwise keep the bed out of rooms; a trench along the edge of a boulevard is acceptable.
    - **Between districts** the bed runs through the rock and the chasms as a level connector made by `drawTrackway` (`world/trackway.ts`), with waypoints given relative to placed districts. It may only cross void; when it would run into a district, that stretch belongs in that district's blueprint, ending at the district's edge where the connector picks it up.
    - **The main floor** has one trunk along the Intake chasm, south of the Circuit. The Lodge, the Atrium, the Yards, the Intake Wing and the Calder Gatehouse each reach it by a spur, and Verdance by a branch across the Sanatorium Rise. The Calder spur crosses the Salt Road and comes down the Gatehouse's west wall, bridged at its gate.

## Shape language

| Place | Shapes and floors | Landmark |
| ----- | ----------------- | -------- |
| Atrium and the Circuit | Octagonal plaza, colonnaded boulevards, `plating` and `carpet` | The central shaft |
| Service Yards, freight filler | Long rectangular yards, `concrete` and `rust`, `hazard` edging | Gantry cranes, scrap stacks |
| Hydroponics, Vesper approach | Rounded grow halls, `soil` with `coolant` channels | The Heart Bed |
| Waterworks, Calder approach | Tanks and canals: large `coolant` pools with `grate` walkways | Settling tanks |
| Calder Wing | Round caverns and long naves, `rust` and `concrete` | The Salt Cathedral nave |
| Vesper Wing | Symmetrical wards off long galleries, `carpet` and `plating` | The Pharmacy rotunda |
| The Deep | A ring causeway of `grate` over void, round caverns | The chasm |
| Dungeon floors | Winding round chambers with loops; boss room furthest from the lift | The boss room |
| Pockets | Small, wrong and symmetrical where the original is not | Whatever it mirrors |

## Reserved ground

Do not build on these; later wings attach here (see `docs/superpowers/specs/2026-11-10-one-world-to-level-100.md`).

- **North of Sector Two:** the Tallow Wing, behind the sealed north bulkhead.
- **South of the Intake chasm:** the Lattice Wing, behind the sealed south bulkhead.
- **Outside every wing:** the Gantry freight loop.

## Adding a district

1. Decide where it attaches on the level's plan, and which exits it needs. Check its tier against rule 13.
2. Write its layout file, `content/districts/layouts/<district-id>.json`, and a `content/districts/<name>.ts` that loads it with `buildDistrict`.
3. Give it at least one landmark, at least one filler room, and props in every room.
4. Attach it in the level file with `joinDistricts`, and attach filler districts so it has two ways in.
5. Register it in `gameContent.ts`. Run `npm run typecheck` and `npm test` and fix what `findContentIssues` reports.
6. Look at it in the viewer (`npm run dev`, then `/editor.html?district=<district-id>`): read the plan, orbit the 3D view, and clear the issues panel. Then run the game and walk it end to end.
