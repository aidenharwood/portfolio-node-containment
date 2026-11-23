# World design guide

Read this before adding or changing a district, a level or anything placed in one. It applies to humans and AI agents alike. Every district in the game follows these rules; there is no exemption list. The rules marked **checked** are enforced by `findWorldDesignIssues` (`packages/shared/src/content/worldDesignIntegrity.ts`), which runs inside `findContentIssues`: the server will not boot and `npm test` fails when one is broken. The rest is judgement, and reviewers hold changes to it.

> **Status:** the overworld is the Span (`docs/superpowers/specs/2026-11-20-the-span-design.md`, reshaped by `docs/superpowers/specs/2026-11-23-the-span-unrolled.md`): one land plan, `content/land/the-span.json`, 18 × 14 squares of 64 (1152 × 896 tiles). It is an island, the Reach, cut into 138 land squares across six regions around the Quiet Massif, with five facility levels below ground (Kestrel Intake, the Gallowglass undercity, Tallow Holding, Vesper Deep and Null Below). Every wild square holds a point of interest: one building (a cottage, post, workshop, waystation, lab or a ruin with creatures in it), a `focal` landmark, and a region cache or skill-gated secret. Every region has its outpost, its Site and its settlement, built and peopled. Every Seam gate stands open from the start. The Span Transit runs the Ring Line and the Spindle Funicular through six terminals.
>
> **How it was made:** `scripts/span/atlas.ts` holds the map as data: the `GRID` of region codes, the `REGIONS` with their tiers and relief, the `PLACES`, the `SEAMS` and the `RAIL`. `scripts/span/drawLand.ts` drew the land plan from it, and `scripts/span/cutSquares.ts` wrote every layout file. It cuts each square, stands the buildings listed in `scripts/span/places.ts` and dresses them from the room recipes in `scripts/span/recipes.ts`. It also places props, creature packs, gathering nodes, gate leaves and landmarks, and retitles the blueprint facility levels (`scripts/span/below.ts`). `scripts/span/wilds.ts` holds `WILD_POIS`, the point of interest of every wild square, and `dressWild` stands it on a levelled spot, clearing the decor, nodes and pack creatures it covers; `cutSquares` applies it, and `scripts/span/dressWilds.ts` applies it in place to layouts already written (it skips a square that already has its building). `scripts/span/writeBelow.ts` writes chosen facility levels from `below.ts` without touching the others. Each wild square's creature mix is `WILD_PACKS` in `wilds.ts`, and `WILD_OVERRIDES` pins the points of interest that were moved or re-dressed. Quest objects and NPCs come from `scripts/span/extras/`: `quests.ts` places them at fixed spots, the other files stand quest props wherever there is room. Site holdings name their `elite` and `multiCombat` in `places.ts`, and `below.ts` does the same for the facility levels. The layout files are generator output: never edit one by hand. Change the input and re-run `node scripts/span/cutSquares.ts`, which rewrites every layout; `layoutGeneration.test.ts` fails if regenerating changes any committed file.

## What the world should feel like

The Span is **an island of a precursor ring-habitat that you explore in any direction**, read like an old-school RuneScape world map. The stretch the Directorate holds is the Reach: land in the Brim Sea, with the **Quiet Massif** rising in the middle and the Spindle standing on its summit, visible from everywhere. Bare rock at the top step rings the summit. The regions are cut apart by the Seams: precursor bulkheads that run along every border between neighbouring regions and are passable only at their gates. Inside each region the ground is open and walkable in any direction, the way it is in RuneScape. You go indoors by walking through a building's door, and you go down by taking a Site's lift.

- **Spinward is harder.** Spinward means clockwise round the Massif. The regions run in that order: Kestrel Reach in the south, Harrow Terraces up the west flank, Halcyon in the north-west, the Wreckfield in the north-east, the Glass Steppe down the east, and the Spindle on the summit, reached only from the Steppe through the Spindle Seam. Tier follows walking distance from Site Kestrel, not position: inside a region it rises with distance between the region's two tiers, so going round is the difficulty curve.
- **Height everywhere.** Every region has its own relief: Kestrel rolls down to beaches and a lake, Harrow climbs in terraces toward the Massif, Halcyon's tower blocks rise to the top step as a skyline, the Wreckfield sits low round a crater lake and the *Meridian*'s hull, the Steppe is a high glass plateau, and the Spindle stands under rock peaks.
- **Every region is a different place.** Kestrel is clean white Directorate land around a lake. Harrow is terraced farmland on the Massif's flank. Halcyon is a neon arcology on a street grid of tower blocks. The Wreckfield is rust and scrap on the coast, around the *Meridian*'s hull and a crater lake. The Glass Steppe is alien soil on a glass plateau. The Spindle is plating, grates and coolant on the summit.
- **Open ground first.** Walls stand only around buildings, in the Seams and on the Massif's bare rock. The sea closes every coast.
- **The Spill** comes down off the Harrow terraces and runs along the Kestrel side of the border to the sea, crossed by plank bridges. The Drop, a sea inlet, keeps Kestrel and the Steppe apart; nothing crosses it.
- **Settlements and Sites stand on pads.** These are flat paved grounds inside a square, with buildings in two rows facing south and a landmark set-piece. The Sites are graded by Security Class and status: Kestrel is Secure, Orchard is Strained, Gallowglass is Breached, Tallow is Overrun, Vesper is Lost and Null is Inverted. You see the status in what the Site holds: NPCs in safe buildings, or creatures in the cells, the yards and the open ground.
- **Underground is enclosed.** Facility levels are rooms joined by links.
- **Landmarks.** Every town, outpost and Site square holds one `focal` set-piece you can steer by, such as the Kestrel Headframe, the Aurelian Spire, the Meridian's bow or the Spindle.

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
    - **Condition** labels how far a district has decayed (`pristine`, `worn`, `breached`, `overgrown`, `flooded`, `alien`, `uncanny`): Kestrel is pristine, Halcyon worn, the Wreckfield breached, the Glass Steppe alien, and Site Null and Null Below uncanny. It adds nothing by itself; show it with what you place, such as barricades, rubble, sandbags and toppled furniture. An `uncanny` pocket mirrors its original strictly and gets it quietly wrong, with benches facing the wall and bookcases turned around.
7. **Ids are forever.** Do not rename an area, an instance id or a district: saves, quests and flags refer to them.
7a. **Land is drawn, never typed.** Overworld ground beyond the districts is a land plan, `content/land/<id>.json`, drawn in the editor's land layer (`/editor.html?land=<id>`, tool L) and saved from there. Never type tiles or heights into a plan, and never hand-edit its coordinates in bulk; the save writes the canonical form and refuses a plan that breaks a square cut from it.
    - **Close every edge of the plan with land that matches what lies beyond it.** Past each edge the game repeats the edge tile and its height for one chunk, so sea at the edge reads as open sea, and fells or mountains at the edge read as fells or mountains going on. Walkable land never touches the plan's edge (**checked**, `findLandPlanIssues`).
    - **Land has relief.** Besides `fill`, `rise`, `line` and `ramp`, a plan has three steps for height. `relief` sets heights inside a shape from deterministic fractal noise, between a `low` and a `high` step at a noise `scale`. `soften` lowers walkable ground inside a shape just enough that no walkable tile stands more than one step above a neighbour; water pulls the land beside it down into beaches, and rock and walls are left alone. Put `soften` after the relief and the set heights it should blend, and before anything that should keep a hard edge, such as towers, the hull and the Massif. Settlements and Sites stand on flat pads at the lowest ground under them, so the land slopes down into every town.
    - **Grow the map in any direction.** A plan's `origin` (`{ column, row }`, in squares) gives it world coordinates: every step, gate and district `square` is in world coordinates, and the plan covers `columns` × `rows` squares from its origin. To add land to the west or north, lower `origin` and widen `columns` or `rows` by the same amount; to add it to the east or south, just widen the plan. No step, no gate and no district moves, so saves and layouts stay valid. Then draw the new coast, give the new squares a ward, and close the plan's new edges with sea.
    - **Land in no ward is scenery.** Sea, rock and anything no district is cut from are drawn but never walked on; land whose ward matches neither half of a split square is reported if it is walkable (**checked**, `findLandIssues`).

### Terrain

Ground rises in whole steps, from step 0 (sea level, and every level below ground) to step 15. One step is half a tile; a four-step cliff stands as tall as a building wall. Height shapes where you can walk and what you can see past; it adds nothing in combat.

- **Raise ground with steps.** `rise` (a rect, round or octagon at one height) and `ramp` (a rect that climbs one step at a time towards a side) go after the ground room and before roads and buildings, and later steps win. The editor's height brush (H) raises, lowers, levels or resets single tiles and writes the layout's `heights`. Never type a height map.
- **Never draw cliffs.** Walkable ground two or more steps above a walkable neighbour, diagonals included, becomes `cliff`: not walkable, a wall for line of sight, drawn as bare rock down to the ground below. So two walkable tiles that touch never differ by more than one step.
- **Plan the way up.** Every raised area people should reach needs a ramp or a run of one-step terraces from the ground around it. Use cliffs on purpose, to wall off a plateau, frame a view or hold back the next area.
- **Doorways never become cliff.** A door, exit or link tile with a drop of two steps beside it stops the blueprint drawing and names the tile. **Checked.**
- **Buildings stand level.** Every interior tile of a `building` step has one height. **Checked.**
- **Seams match.** Across a seam between districts, walkable ground that touches differs by at most one step (`findTerrainSeamIssues`). **Checked.**

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
   **Land squares** are the exception. Their edges come from the land plan, so they have no exit steps and no two-ways-in rule. A square crossed by a ward border is split, with one district per ward. Where land meets a square with no district, the sea or rock is scenery, not a seam; land the plan never painted is void, and is a seam.
9. **Open exits are at least 9 tiles wide.** Only an exit that is a door, bulkhead or gate may be narrower, and it is marked `gate: true`. **Checked.**
10. **No floor opens onto the void.** Every exit must meet the floor of a neighbouring district. When a loop of districts has to close, the sizes are yours to get right; the check tells you when they are not. **Checked.**
11. **Two ways in.** On a level with more than one district, a district has at least two exits, so the world has loops. A boss room, vault or other deliberate cul-de-sac sets `deadEnd: true`. **Checked.**
12. **Walk first.** Every district on the overworld is reachable on foot from the spawn (`findOverworldIssues`). Trams and lifts are shortcuts.
12a. **Wards are sealed.** Flooding a ward's walkable ground with every door shut never reaches another ward. Every walkable tile of a land plan lies in a district of its ward, and every land gate holds a door. **Checked** (`findSealedWardIssues`, `findLandIssues`).

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
    - **The Span Transit.** Track on the Span is drawn into the land plan as `track` tiles, so it is part of the world: a rail line you see, follow and cross. Every station is a walled, safe `tram-terminal` building in its hub square, on the south side of the pad, with the track running through it, one `tram-car` on the platform and a departure board. The **Ring Line** runs Kestrel Commons, Harrowgate, Neon Row, Rustwater and the Choir; the **Spindle Funicular** runs from the Choir up to Last Post. Kestrel Commons is known from the start; every other station is found by walking into it. Track blocks walking, so `bridge` assemblies cross it every 24 tiles or so, at least once in every square it passes through. The rail line is `RAIL` in `scripts/span/atlas.ts`; walking stays the main way around.
18. **A terminal is a room of its own.** Every tram station stands in a safe room called `tram-terminal`. No NPC stands in it, and nothing in it offers storage, a shop, the market, contracts, crafting or a teleport: benches, a departure board, a directory kiosk and the tram map only. No district exit touches it, and it is walled apart from its own doors, each at most 3 tiles wide; track beside it does not count. **Checked** (`findTerminalIssues`).

## Shape language

| Place | Shapes and floors | Landmark |
| ----- | ----------------- | -------- |
| Overworld squares | 64×64 open ground, `paving` base, `asphalt` roads, `gravel` yards, `grass` parks | One per square, such as the station clock |
| Land squares | Cut from the land plan: its cover (`grass`, `dirt`, `trees`, `water`, `soil`, `rust`, `gravel`) under the square's own roads, yards and buildings | One per square, as a `focal` set-piece: the town's, Site's or outpost's own, or the wild square's (`content/span/wilds.ts`) |
| City buildings | Small walled interiors in `brick`, `blockwork` or `cladding`; `boards` for homes, shops and pubs, `terrazzo` for public halls | Shop signs and awnings outside |
| Directorate buildings | Directorate panel walls (`wall`), `plating` floors, an orange band outside | The Directorate sign |
| Directorate compounds | A `building` with an outdoor floor and `edge: "barrier"`: a walled yard with a gate, Directorate buildings standing inside it | The Site Meridian headframe |
| Facility levels below ground | Rooms joined by links, one district per level, getting tighter and colder with depth; amber for low security (B1), red for high (B2), cold blue for the Vault (B3) | The Heart of the Vault |
| Lifts | A wall-mounted lift per landing whose interaction teleports to an `arrival` anchor on the next level | The headhouse headframe |

**Tiers follow the level ladder.** A district's tier is the tier of the highest level it serves (`TIER_LEVEL_FLOORS`): home squares 1, the Canal Basin and the Cut 3, the Scrapyards and B1 6, the Fringe 8, the Cordon and B2 10, the Vault 12. A gathering spot only stands where the tier covers its level.

**Safe ground.** The innermost area decides whether a tile is safe, so a fenced yard (a `building` with an outdoor floor and `"safe": false`) can hold critters inside a safe square, like Site Kestrel's Training Yard. Settlement squares are otherwise safe all over. Wild and Site squares are hostile and only the buildings people work in are safe, so creatures and gathering spots go on the ground and people stay indoors.

**Rooms.** A tile inside a building belongs to the building, not to the ground around it: placement checks and the editor use the smallest room that contains the tile.

**Floors.** `ceramic` is for medical, ward, lab, cold and canteen rooms; `boards` for homes, shops, offices, canteens and the like. Wall materials say who built a place: brick and blockwork for the old city, corrugated cladding for what went up after the anomalies, and the Directorate panel for the Directorate.

## Regions

The Span is six regions in one land plan, set clockwise round the Quiet Massif (`GRID` and `REGIONS` in `scripts/span/atlas.ts`). Each region is a ward of the plan, sealed from every neighbouring region by a Seam: a rock bulkhead at the top step, three tiles either side of the border, with three `gate` steps through it (`SEAMS`). The five Seams are Kestrel–Harrow, Harrow–Halcyon, Halcyon–Wreckfield, Wreckfield–Steppe and Steppe–Spindle. The Massif's bare rock and the sea are scenery, and the Drop keeps Kestrel and the Steppe apart. Tier rises with walking distance from Site Kestrel (`squareTiers`); Sites pin their own tier.

| Region | Where | Tiers | Relief | Outpost (hub) | Site |
| - | - | - | - | - | - |
| Kestrel Reach | the south coast, round a lake | 1–2 | 1–11 | Commons Stores, `kestrel-commons` (the exchange) | `site-kestrel` (SC-V, Secure), lift to `kestrel-intake` |
| Harrow Terraces | the west flank of the Massif | 3–5 | 2–15 | Co-op Stores, `harrowgate` | `site-orchard` (SC-II, Strained) |
| Halcyon | the north-west, a tower skyline | 6–7 | 3–10, towers to 15 | Juno's, `neon-row` | `site-gallowglass` (SC-III, Breached), lift to `gallowglass-undercity` |
| the Wreckfield | the north-east coast, round a crater lake and the hull | 8–9 | 0–9 | Mags' Post, `rustwater` | `site-tallow` (SC-IV, Overrun), lift to `tallow-holding` |
| the Glass Steppe | the east, a high plateau | 10–11 | 5–15 | Pilgrims' Rest, `the-choir` | `site-vesper` (SC-IV, Lost), lift to `vesper-deep` |
| the Spindle | the Massif's summit, reached only from the Steppe | 12–13 | 9–15 | Last Post HQ, `last-post` | `site-null` (SC-V, Inverted), lift to `null-below` |

- **A region is a ward.** Seams run along square edges, so no square is split.
- **Every gate stands open.** Each leaf is a door object with no conditions. The seal is still **checked** (`findSealedWardIssues`), so the gates stay the only ways between regions.
- **Safe and hostile ground.** Settlement and outpost squares are safe all over. Site squares and wild squares are hostile, and their buildings are safe only where people work in them. Boss arenas are fenced yards with `multiCombat`.

**Where per-square rules change for land squares:** a land square has no `exit` steps and no two-ways-in rule. Its edges are the land's, and its landmark is a `focal` set-piece named in `furnish.landmarks`.

## Reserved ground

- **The other Site level:** Site Orchard has no level below ground yet. Site Tallow's forward post lifts down to Tallow Holding (B1, T9) and Site Vesper's headhouse down to Vesper Deep (B1, T11); neither lift needs clearance.

## Adding a district

1. Decide where it attaches on the level's plan, and which exits it needs. Check its tier against rule 13. A land square instead names its `square` and draws on the land cut from it, with no exits; change the land itself in the land layer, never by typing it.
2. Write its layout file, `content/districts/layouts/<district-id>.json`, and a `content/districts/<name>.ts` that loads it with `buildDistrict`.
3. Give it at least one landmark, at least one filler room, and props in every room.
4. Attach it in the level file with `joinDistricts`, and attach filler districts so it has two ways in.
5. Register it in `gameContent.ts`. Run `npm run typecheck` and `npm test` and fix what `findContentIssues` reports.
6. Build it in the editor (`npm run dev`, then `/editor.html?district=<district-id>`, Edit): place and tune everything there, orbit the 3D view, open its level to check the seams, and save with the issues panel clear. Then run the game and walk it end to end.
