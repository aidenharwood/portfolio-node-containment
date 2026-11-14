# World design guide

Read this before adding or changing a district, a level or anything placed in one. It applies to humans and AI agents alike. Every district in the game follows these rules; there is no exemption list. The rules marked **checked** are enforced by `findWorldDesignIssues` (`packages/shared/src/content/worldDesignIntegrity.ts`), which runs inside `findContentIssues`: the server will not boot and `npm test` fails when one is broken. The rest is judgement, and reviewers hold changes to it.

> **Status:** the world is being rebuilt as an open city (`docs/superpowers/specs/2026-11-14-first-region-design.md`). The Low Ward is built: nine open squares from Terminus Square out to the Cordon gate, and three levels below Site Meridian (Intake, the Secure Wing and the Vault) reached by the headhouse lift. Phase 4 adds the people's quests, items and creatures.

## What the world should feel like

Hollow Bay is **a city you can walk across in any direction**, the way you can in RuneScape. The overworld is not a set of rooms joined by corridors: it is open ground, with roads, squares, yards and parks, and buildings standing in it. You go indoors by walking through a building's door. You go down by taking a lift or stair inside a facility.

- **Open ground first.** Each overworld district is one wide square of open ground, and neighbouring squares join along their whole shared edge, so you can't tell where one district ends and the next begins. Walls exist only around buildings and at the edge of the playable map.
- **Buildings stand in the ground.** A building is a small walled interior with doors onto the ground around it: a shop, a home, a pub, a gatehouse. Interiors are small and full; the ground outside is wide.
- **Underground is enclosed.** Facility levels below the street are rooms joined by links, as before, and get more enclosed and more dangerous the deeper you go.
- **Filler is content.** Roughly half of a district's ground is space no quest sends you to: back alleys, yards, parks, quays. It carries props, light, people and the odd gathering spot.
- **Coherent shape.** Every region has a plan you can describe in one sentence. New districts extend that plan.
- **Landmarks.** Each district has one thing you can see from a distance and won't find anywhere else, such as the station clock or the washing-line courtyard, so players can find their way without the map.

## Rules

### Authoring

1. **Maps are drawn with blueprints** (`shared/src/world/blueprint.ts`), never typed as ASCII rows. A district sets `map`, `rooms` and `exits` from `drawBlueprint`. **Checked.**
2. **Never draw walls.** Carve rooms, buildings, links and exits; every void tile touching floor becomes wall. On open ground, draw the district's `ground` room first, paint roads, plazas and yards over it with `patch` (`asphalt`, `paving`, `gravel`, `grass`), then stand `building` steps in it. A building names its interior `rect`, `floor`, `wall` material and `doors` (side, width, offset); the ring around it becomes wall in that material, with the doors cut through. Use `patch` with `wall` or `glass` only for partitions inside a space.
3. **Place by room.** Every position in a layout file is room-relative, `{ "room", "dx", "dy" }`, or an exit or link tile (`{ "exit", "index" }`, `{ "link", "index" }`). An absolute `{ "x", "y" }` is only for a point in no room. Everything must stand inside a named room or on a door tile. **Checked.**
    - **Things that belong on a wall stand against one.** Doors, lifts, lockers, cabinets, placards, valves, vents and notice boards have a wall tile directly beside them and face away from it (**checked** for the wall, `findFixtureIssues`). A door never stands in an open exit; put it in a wall beside the opening or in a doorway of its own width. The Knock is the one freestanding door, by design.
    - **Track through a room is walled off** unless the room is the platform or people must cross it there.
4. **Areas are rooms.** Declare areas with `plan.area(room, name, options)`. An area's id and rectangle match a room. **Checked.**
5. **Name the points other content needs.** Tram platforms, teleport landings, spawns and recovery points are entries in the district's `anchors`. Other content and tests read the anchor; they do not repeat its numbers. Tests use `inRoom(districtId, roomId)` and `anchor(districtId, anchorId)` from the server test harness.
6. **Scatter instead of random.** Bulk litter, props, nodes and creature packs come from `plan.scatter(room, count, seed, avoid)`, which is deterministic. Nothing in `shared` calls `Math.random()`.
    - **Dress every room by hand.** Nothing composes a room for you. Every piece of furniture is placed deliberately in the layout file, chosen for what the room is for and who works there: a counter in front of the quartermaster, bunks along a dormitory wall, pews facing the altar, beds in each ward bay. Read the room's quests, NPCs and name before you place anything. Use `setPieces` for prefabs (`content/prefabs/`, placed as `{ "prefab", "at": { "room", "dx", "dy" }, "facing" }`) and `objects` for single pieces. Order beats scatter: rows, aisles and bays that follow the room's walls and columns, a clear walking line between its openings, and a few deliberate exceptions (a toppled bench in a breached hall). Leave quest props, nodes and creatures room to work, and keep boss arenas open in the middle. Do not scatter furniture with `scatterObjects`; it is for litter, nodes and creatures.
    - **Prefer plain models.** A prop is read from across a room. Keep new models to a few blocks of colour with a clear silhouette; slats, rivets, noise and trim make a room look busy, not rich.
    - **Set-pieces** are prefabs placed by hand. They never overlap what is already there, and they keep a clear ring around them that crowds stay out of. Name each district's landmark rooms in `furnish.landmarks`; each one holds a set-piece whose prefab has the `focal` role.
    - **Dressing** names each room's `theme` (`civic`, `office`, `canteen`, `freight`, `ward`, `chapel`…, see `DRESSING_THEMES` in `content/prefabs/types.ts`): what the room is for. The theme decides which props belong there (see Placement below) and who stands about: generic NPCs (`content/ambientNpcs.ts`) gather near the benches, stools and pews in safe rooms. A room that is honestly two things says so with `also`, such as `{ "theme": "garden", "also": ["dormitory"] }` for the gardeners' quarters. Set `people` or `cast` on a room to override the crowd.
    - **Decals** paint the floor: inlays, mosaics, rugs, runners, lane paint and hazard paint come with prefabs, and anything else (wear, scorch, moss, salt crust) is placed by hand in the layout's `decals`. They lie on walkable floor only and change nothing in play.
    - **Condition** labels how far a district has decayed (`pristine`, `worn`, `breached`, `overgrown`, `flooded`, `alien`, `uncanny`): the Low Ward is worn, the Shipyard Fringe breached, and the deep levels under Site Meridian alien. It adds nothing by itself; show it with what you place, such as barricades, rubble, sandbags and toppled furniture. An `uncanny` pocket mirrors its original strictly and gets it quietly wrong, with benches facing the wall and bookcases turned around.
7. **Ids are forever.** Do not rename an area, an instance id or a district: saves, quests and flags refer to them.

### Furnishing

`findFurnishingIssues` (`content/furnishingIntegrity.ts`) runs inside `findContentIssues`. Fix what it reports by moving a piece the least distance; never by editing a blueprint.

- **Nothing stands in a doorway.** No prop covers a door, exit, anchor, link or track tile. **Checked.**
- **Every floor tile can be reached.** After dressing, each room is flood-filled from its openings and anchors on the level's walkability grid; every walkable tile of the room must be reached. **Checked.**
- **Landmarks are set-pieces.** Every room named in `landmarks` exists and holds a set-piece with a `focal` prefab. **Checked.**
- **Rooms are dressed.** A dressed room with more than 150 walkable tiles holds at least three kinds of object, litter aside. **Checked.**
- **Decals lie on walkable floor**, never on a door. **Checked.**
- **Wall fixtures stand against a wall**, counting multi-tile footprints (the back edge must touch the wall). **Checked** (`findFixtureIssues`).
- **Prefabs are valid.** Pieces name real objects and do not overlap once footprints count (only the corner posts of a walk-under canopy block), roles are not empty, `wall` and `bay` prefabs have a back row, each prefab id appears once across the libraries and keys `PREFABS`, and every object footprint is at least 1×1. **Checked.**

### Placement

Every prop you can place has a profile in `FURNISHING_PROFILES` (`content/furnishingCatalogue.ts`): how it stands, which room themes it belongs in, and whether it comes in rows. Read the profile before you place a prop, and give a new prop one when you add it. `findPlacementIssues` (`content/placementIntegrity.ts`) checks the rules below inside `findContentIssues`; fix what it reports by moving or turning a piece, or by choosing one that belongs, never by widening a profile to fit one room.

| Mount | How it stands | Examples |
| ----- | ------------- | -------- |
| `wall` | Hangs on a wall, back edge against it | notice board, wall shelf, sign, locker |
| `backed` | On the floor with a back: against a wall or glass, against racking, or back to back with another backed piece | bookcase, filing cabinet, vending machine, cooking range, washer, bunk |
| `free` | Reads from every side; a `surface` is something seats serve | desks, tables, counters, workbenches, racks, beds, crates, planters |
| `seat` | A `view` seat looks out over open floor or a window; a `surface` seat faces a desk, table, counter or console | benches, pews, armchairs; office chairs; stools |
| `flat` | Walked over | litter, cable runs, reserved plots |

- **Every room has a purpose.** Each room of a furnished district names a theme. **Checked.**
- **Props belong where they stand.** A prop stands only in rooms whose theme, or one of whose `also` themes, is among its homes: no cooking range in a chapel, no ledger trolley in a laundry. Ruin pieces, sandbags, crates, lamps and landmark set-pieces belong anywhere. **Checked.**
- **A room shows what it is for.** A themed room of 60 walkable tiles or more holds at least one of its theme's signature pieces (`ROOM_SIGNATURES`): a canteen has tables or a serving counter, a dormitory has bunks, a ward has beds. **Checked.**
- **Room floors fit the room.** `ceramic` is for medical, ward, lab, cold and canteen rooms; `boards` for archive, dormitory, office, camp, canteen, chapel, garden and post rooms. **Checked.**
- **Doorways stay clear.** No blocking prop stands on or beside an opening up to 6 tiles wide, and a wider opening keeps a clear gap at least 3 tiles wide. Openings are read off the assembled level, so a gate into a neighbouring district or a hollow counts. **Checked.**
- **Backs go against something.** A `backed` piece has a wall, glass, racking or another backed piece turned the other way along its whole back edge. **Checked.**
- **Seats face something.** Benches, pews and armchairs have open floor or a window in front of them. Chairs face a desk, table, counter, console or station; stools stand within two tiles of one. A desk draws no chair of its own: put an `office-chair` at its working side. **Checked.**
- **No metronome.** No more than 4 of one prop stand on a fixed pitch in a line (`RHYTHM_LIMIT`), and no set-piece appears more than 4 times in one room (`REPEAT_LIMIT`). Row furniture (pews, beds, bunks, shelving, desks, tables, counters, cabinets) and prefabs marked `rows` are exempt, because a nave, a ward and a stack are rows by nature. **Checked.**
- **Anything players use stays usable.** Every interactive object keeps a walkable tile beside it after dressing. **Checked.**
- **Uncanny pockets break orientation on purpose.** In an `uncanny` district the backed and seat rules are waived, so its benches may face the wall and its bookcases may be turned round. Every other rule still holds.

The rest is judgement, and reviewers hold it:

- **Dress a passage by what it passes.** A boulevard or corridor gets a small group at each doorway that belongs to the room behind it (luggage outside a dormitory, a vending alcove by the canteen, pallets at the stores, ledger trolleys by the reading room) and stays empty between. Flank gates with banner masts and junctions with directory pylons.
- **Group, don't spread.** Place props in groups of two to six that make one scene each: a desk with its chair and cabinet, a bench with a planter and a bin, carts beside the salt they carry, a work lamp beside the work. A lone prop needs a reason.
- **Work with the architecture.** Put groups between columns, backed pieces against walls and partitions, and keep a walking line at least two tiles wide between a room's openings.
- **Stacks run in short ranges** at right angles to the main aisle, back to back, with cross aisles between. Break a range or two where the district is breached or flooded.
- **Decay is placed, not sprinkled.** Put rubble, toppled benches, barricades and sandbags where the story says something happened.
- **Dressing ids carry no state.** `furn-…` objects have no interactions and nothing refers to them, so re-dressing a room may renumber them. Anything a quest, flag or test needs keeps a fixed id like any fixture.

### Joining districts

8. **Districts meet at exits.** Overworld squares meet along a whole side: the `ground` room runs flush to that edge, and the exit spans it. A side with no neighbour keeps a one-tile edge (`barrier`, `fence`, `rock` or `trees`). An exit is declared with `exit(id, room, side, width)` and placed on a level with `joinDistricts` (`world/levelPlan.ts`), which works out origins. Do not write origin arithmetic by hand except for a district that is deliberately detached (`{ districtId, from, offset }`), such as the Intake Wing across its chasm.
9. **Open exits are at least 9 tiles wide.** Only an exit that is a door, bulkhead or gate may be narrower, and it is marked `gate: true`. **Checked.**
10. **No floor opens onto the void.** Every exit must meet the floor of a neighbouring district. When a loop of districts has to close, the sizes are yours to get right; the check tells you when they are not. **Checked.**
11. **Two ways in.** On a level with more than one district, a district has at least two exits, so the world has loops. A boss room, vault or other deliberate cul-de-sac sets `deadEnd: true`. **Checked.**
12. **Walk first.** Every district on the overworld is reachable on foot from the spawn (`findOverworldIssues`). Trams and lifts are shortcuts.

### Difficulty and population

13. **Tier never falls with distance.** Going outward from a level's spawn along the shortest chain of districts, tier stays level or rises. Filler takes the tier of the gentler ground it joins. **Checked.**
14. **Creature density stays in band:** between 3 and 14 creatures per thousand walkable hostile tiles in any district that has creatures. Around 6 suits open ground; boss rooms and camps run higher. **Checked.**
14a. **Bodies fit.** A creature's whole footprint (2×2 for large creatures) stands walkable inside one room and outside safe areas, and no two creature homes overlap. Bosses with telegraphs or hazards stand in a `multiCombat` area. **Checked** (`findFootprintIssues`, `findEncounterIssues`).
15. **Safe ground is for people.** NPCs, lockers, shops, mailboxes, contract boards and tram platforms stand in `safe` areas; creatures and gathering nodes do not (`findSafetyIssues`, the world audit test).
16. **Every region has an outpost** with the services `findRegionIssues` lists, behind or beside the hostile ground, and a dungeon lift once it has a dungeon floor.

### Transit

17. **Track is drawn, and it connects.** Every platform has `track` tiles within six tiles of it (**checked**). On each level, a line's stations share one connected run of track (**checked**, `findLineIssues`; track tiles count as joined when they touch, including diagonally). The run need not close: it may branch, end in a buffer outside a terminal, or run on toward reserved ground. Lines that serve the same level share track where they can: the Intake Shuttle rides the Meridian trunk. The bed is two tiles wide.
    - **Platforms.** The track runs straight through the platform room and out of it at both ends, so a tram comes in one end and leaves by the other (`findTramIssues`). Give the room a `hazard` strip along the platform edge and walkable floor beside the car. A platform is usually a room on the district's edge with the bed along its outer side; where the bed cuts a door or an exit off from the platform, put `bridge` assemblies over it.
    - **Inside a district** draw the bed with `track(...)` in the blueprint. Through void it becomes a tunnel, since the rock beside it is walled. Where it must cross walkable floor, cross at right angles and put `bridge` assemblies over it (`facing: 'south'` over a bed running east–west, `'east'` over one running north–south), several side by side on a boulevard. Otherwise keep the bed out of rooms; a trench along the edge of a boulevard is acceptable.
    - **Between districts** the bed runs through the rock and the chasms as a level connector made by `drawTrackway` (`world/trackway.ts`), with waypoints given relative to placed districts. It may only cross void; when it would run into a district, that stretch belongs in that district's blueprint, ending at the district's edge where the connector picks it up.
    - **The Low Ward** will have one short line from Terminus Square to the Canal Basin. Walking stays the main way around.
18. **A terminal is a room of its own.** Every tram station stands in a safe room called `tram-terminal`. No NPC stands in it, and nothing in it offers storage, a shop, the market, contracts, crafting or a teleport: benches, a departure board, a directory kiosk and the tram map only. No district exit touches it, and it is walled apart from its own doors, each at most 3 tiles wide; track beside it does not count. **Checked** (`findTerminalIssues`).

## Shape language

| Place | Shapes and floors | Landmark |
| ----- | ----------------- | -------- |
| Overworld squares | 64×64 open ground, `paving` base, `asphalt` roads, `gravel` yards, `grass` parks | One per square, such as the station clock |
| City buildings | Small walled interiors in `brick`, `blockwork` or `cladding`; `boards` for homes, shops and pubs, `terrazzo` for public halls | Shop signs and awnings outside |
| Directorate buildings | Directorate panel walls (`wall`), `plating` floors, an orange band outside | The Directorate sign |
| Directorate compounds | A `building` with an outdoor floor and `edge: "barrier"`: a walled yard with a gate, Directorate buildings standing inside it | The Site Meridian headframe |
| Facility levels below ground | Rooms joined by links, one district per level, getting tighter and colder with depth; amber for low security (B1), red for high (B2), cold blue for the Vault (B3) | The Heart of the Vault |
| Lifts | A wall-mounted lift per landing whose interaction teleports to an `arrival` anchor on the next level | The headhouse headframe |

**Safe ground.** The squares near Terminus Square are safe all over. From the Cut, the Scrapyards and the Shipyard Fringe outward the open ground is hostile and only the buildings are safe, so creatures and gathering spots go on the ground and people stay indoors.

**Rooms.** A tile inside a building belongs to the building, not to the ground around it: placement checks and the editor use the smallest room that contains the tile.

**Floors.** `ceramic` is for medical, ward, lab, cold and canteen rooms; `boards` for homes, shops, offices, canteens and the like. Wall materials say who built a place: brick and blockwork for the old city, corrugated cladding for what went up after the anomalies, and the Directorate panel for the Directorate.

## Reserved ground

- **East of the Low Ward:** the Cordon, where the next region attaches through the Cordon gate.

## Adding a district

1. Decide where it attaches on the level's plan, and which exits it needs. Check its tier against rule 13.
2. Write its layout file, `content/districts/layouts/<district-id>.json`, and a `content/districts/<name>.ts` that loads it with `buildDistrict`.
3. Give it at least one landmark, at least one filler room, and props in every room.
4. Attach it in the level file with `joinDistricts`, and attach filler districts so it has two ways in.
5. Register it in `gameContent.ts`. Run `npm run typecheck` and `npm test` and fix what `findContentIssues` reports.
6. Build it in the editor (`npm run dev`, then `/editor.html?district=<district-id>`, Edit): place and tune everything there, orbit the 3D view, open its level to check the seams, and save with the issues panel clear. Then run the game and walk it end to end.
