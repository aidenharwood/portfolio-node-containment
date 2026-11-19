# The Hinterland atlas

This is step 2 of the build order in `2026-11-19-hinterland-and-terrain-design.md`. It replaces the ward layout of `2026-11-18-hollow-bay-atlas.md`. That atlas's Sites, tier table, chapters and gate flags carry over unless this document says otherwise. The approved map is `2026-11-19-hinterland-atlas.svg`. Every name in it is a placeholder the owner can replace.

## Why

The owner said the assembled block-out reads as "a grid of square areas with different tiers" with "no real flow or wonder factor". OSRS was the reference. Its map is also stored as 64×64 squares, but nobody sees them: the coast, the rivers, the roads and the towns are drawn across them. Towns are destinations with land between them. You see a place before you can reach it, and the ground itself (rivers, cliffs, mountains) decides where you can go. Terraced ground is now built, so the land can do that job.

## The owner's decisions

1. **Size: about 12 × 10 squares** (768 × 640 tiles; 640 × 512 today). Neighbouring towns are one to two minutes' walk apart. A character walks one tile per 300 ms tick, which is OSRS running speed, so one square takes about 19 seconds to cross and OSRS distances carry over directly.
2. **Placement as drawn** in the map: sketch B, with the calls listed under "The land" below.
3. **The Low Ward does not change.** It keeps its only two ways out, the Cordon gate (east) and the sluice gate (south). The Old Shipyards are reached by the road round the moor, about two and a half minutes from Terminus Square, and no gate is added to the Low Ward's north fence.
4. **One land plan for the whole overworld, with each square cut from it** (approach A below).

## Goals

- The land reads as one continuous place. Coast, river, ridges and roads cross square edges, and the squares cannot be seen.
- Towns of very different sizes stand in wild land: overgrown suburbs, moor, woods, marsh, a gorge, mountains and the Blight.
- Wards are kept apart by the land itself (the river, cliffs, Old Town's wall, the gorge, the Blight's edge, the sea). Each way through is a crossing you remember, and it is the ward's gate.
- Tier rises with distance from the Low Ward, and the chapter order and flags stay as they are.
- Squares stay 64 × 64, so saving, chunks, the server, the editor's level view and the per-square layout files keep working as they do.

## Non-goals

- People, quests, creatures, gathering spots, Site levels and gear. They come ward by ward afterwards, as the atlas spec already plans.
- Hand-dressing the wild land. This step blocks the Hinterland out, as the last one did. Each ward is dressed by hand when its content lands.
- The far view (seeing distant towns and landmarks beyond the built chunks). It is the next engine step after this one and gets its own plan (see Build order).
- Trams. The Bay Line in the atlas spec is replaced by whatever transit the Hinterland needs, decided later.

## Anti-goals

- **Square-shaped land.** If a ward, a wood or a coastline ends up following square edges, the work has failed, even when every check passes.
- **A ward you can walk into without its gate.** Every way into a ward is a gate.
- **Hand-typed tiles or height rows.** The land plan is made of steps and shapes, as blueprints are, and the editor writes it.
- **Changing the Low Ward's people, quests or layout.** The one exception is the Cut's east edge, where the river comes in (see Calls I made).

## Constraints

- `CLAUDE.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` and `WORLD_DESIGN.md` hold: blueprint-drawn maps, server-authoritative movement, no code comments, erasable TypeScript, and `npm run typecheck` and `npm test` green at the end of every batch.
- Terrain works as built: heights 0–15, one step is a walkable rise, and two or more steps is a generated cliff.
- District overlap is checked per tile, not per rectangle (`findLevelIssues`), so two districts may share a square as long as their tiles do not overlap.
- A saved position in a district that no longer exists returns the character to the main-floor spawn (`restoreLocation`). Players who finished The Heart may be standing beyond the Cordon in `gatehouse-yard`, so that id is kept.
- The client builds chunks only within one chunk (32 tiles) of the camera (`BUILD_RADIUS`). Nothing far away is drawn today.

## Approaches

| | How | Gains | Costs |
| - | - | - | - |
| **A. One land plan (chosen)** | A data file describes the land at overworld scale. Each 64 × 64 square starts from its window of it, then adds its own buildings and dressing. | Seams match by construction, so a river or cliff crossing an edge is drawn once. Squares stay 64 × 64, so most of the engine stays as it is. This is how OSRS hides its squares. | New shared data and cutting code, edges that follow the land, an editor land layer, and a way for a square crossed by a ward border to belong to two wards. |
| B. Varied-size squares | Each place is a district sized to fit, joined with `joinDistricts`. | No new engine. | Tiling the plane with odd rectangles is a jigsaw. Every river, coast and cliff is lined up by hand at every seam, which is how the block-out came to read as boxes. |
| C. One district per ward | Each ward is one large blueprint. | Continuity inside a ward is free. | Very large layout files that are slow to edit. The long borders between wards are still seams drawn from both sides. |

The owner chose A.

## The land

**In one sentence:** the Low Ward is a port where a river meets a small bay on the west coast. Behind it the river climbs east through a walled town to the falls under the mountains, a ridge with the city's uptown stands to the north, a delta and a great wood run along the south coast, and in the far east the land goes wrong around a crater lake.

Square coordinates below are `(column, row)` on the 12 × 10 grid, west to east and north to south. The Low Ward's nine squares sit at columns 2–5, rows 4–6, with Terminus Square at (2, 5). Positions are approximate. The land plan is drawn freely, and only the Low Ward is fixed to the grid.

### Features

- **The sea** lies past the west and south edges. **The bay** (columns 0–1, rows 4–6) lies against the Low Ward's west fence, which becomes the harbour wall.
- **The river** drops off the north-east mountains at **the falls** (about (9, 0)), runs through Ironside, down **the gorge** (column 8, rows 2–4), through walled Old Town, then west along row 6 to the Cut's canal. The Cut's sluice lets it out south into **the delta**, which fans to the south coast across columns 1–4, rows 7–8.
- **The ridge** runs along rows 0–2 from column 4 to column 7. It is cliff-bound on its west and south faces, and its east end drops as a spur to the gorge. The Heights stand on top.
- **The north-east mountains** (columns 8–11, rows 0–1) are impassable rock. Ironside sits at their foot.
- **The moor** covers the north-west (columns 0–3, rows 0–3), and **overgrown suburbs** fill the valley north of the river between the Low Ward and Old Town (columns 4–7, rows 2–5).
- **The Great Wood** lies along the river's south bank and the south coast (columns 4–7, rows 6–8). A **second moor** lies between Old Town and the south-east coast (columns 8–9, rows 6–7).
- **The Blight** takes the east (columns 10–11, rows 2–7), with **the crater lake** at about (11, 4). The Hollow lies beneath the lake.
- **The spit** runs out south-east from (10, 8) to the lighthouse at about (11, 9).
- **The creek** drains Old Town's south moat to the sea. It winds south from the wall at about (8, 6) to the coast at about (7, 9), never along a square edge. It divides the Great Wood (Tidemarsh) from the south-east moor and the Drowned Quarter. The causeway reaches Old Town's water gate west of it, and the floodgate opens east of it.
- **Gallows Hill** is a raised hill outside Old Town's east wall, cliff-bound on every side except a ramp up from a postern in that wall. It is part of Old Town and touches neither the south-east moor nor the Blight road.
- **The Blight road** runs on a ledge: a cliff drops on its west side to Gallows Hill and the moor, and the Blight's edge closes its east side. You get onto it only by Ironside's south gate, the hamlet at the root of the spit, or the crater rim.
- **The map's edges.** Walkable land never meets the edge of the plan. Each edge is closed by land that follows the ground, not a straight band along the grid:
    - in the north-west, sea cliffs above the moor, with sea beyond;
    - along the ridge, its north cliff, with fells beyond;
    - in the north-east, the mountains;
    - in the east, ash fells beyond the Blight;
    - in the west and south, the sea.

  The inner line of each closing band wanders by several tiles, so no edge reads as a ruler line.

### Wards

| Ward | Levels (tiers) | Town | Wild land | Site | Outpost |
| - | - | - | - | - | - |
| Old Shipyards | 55–75 (14–15) | The yards on the north-west coast, about 4 squares, with slipways into the bay | The moor, the overgrown valley north of the river, and the crossroads outside the Cordon | Site Caisson, at Dry Dock Four on the bay | Forward Post Four at the crossroads |
| Tidemarsh | 75–95 (16–17) | A stilt village in the delta, about 1 square | The delta marshes and the Great Wood | The Brinehouse, on piles in the delta | Tide Station by the sluice |
| the Heights | 95–115 (18–19) | Uptown on the ridge, about 3 squares | The ridge top | The Spire | Upper Station at the top of the Incline |
| Old Town | 115–135 (20–21) | A walled city astride the river, about 3 squares inside the wall | Gallows Hill, outside the east wall | The Ossuary, under the cathedral | The Hostel, inside the west gate |
| Ironside | 135–155 (22–23) | Industry at the falls, about 3 squares | The gorge and the mountain foot | Bellows, the power station at the falls | Shift House at the viaduct end |
| Drowned Quarter | 155–175 (24–25) | Half-sunk streets on the south-east coast, about 2 squares | The moor between Old Town and the coast | Site Fathom, the diving-bell derrick | The Roost |
| the Lantern | 175–195 (26–27) | The keepers' hamlet at the root of the spit | The spit, and the Blight road from Ironside down the Blight's western edge | The Lantern, the lighthouse at the tip | Keepers' Row |
| the Blight | 195–200 (28) | None | The wild east and the crater lake | The Hollow, beneath the lake | A camp at the crater rim |

The region ids stay as they are (`old-shipyards`, `tidemarsh`, `the-heights`, `old-town`, `ironside`, `drowned-quarter`, `the-lantern`). The Blight is a new region, `the-blight`.

### Crossings

Each crossing is a gate in the land. It opens on the flag its ward already uses, and each flag is granted by the chapter before it, as in the atlas spec.

| Crossing | What it is | From → to | Opens on |
| - | - | - | - |
| Cordon gate (built) | The Directorate gate in the Cordon wall | Low Ward → the crossroads | The Heart complete |
| Sluice (built) | The sluice at the foot of the Cut | Low Ward → the delta | `ward-open:tidemarsh` |
| the Incline | A funicular up the ridge's south cliff | Valley → the Heights | `ward-open:the-heights` |
| West gate | Old Town's land gate | The crossroads → Old Town | `ward-open:old-town` |
| Causeway | A causeway through the Great Wood's marsh to Old Town's water gate | Great Wood → Old Town | `ward-open:old-town` |
| Viaduct | A railway viaduct from the ridge over the gorge | the Heights → Ironside | `ward-open:ironside` |
| Floodgate | Old Town's south gate | Old Town → the south-east moor | `ward-open:drowned-quarter` |
| Seawall | The seawall path onto the spit | Drowned Quarter → the Lantern | `ward-open:the-lantern` |
| Blight road | Ironside's south gate onto the road down the Blight's edge | Ironside → the Lantern | `ward-open:the-lantern` |
| Crater rim | A gap in the crater's rim, off the Blight road | the Lantern → the Blight | `ward-open:the-blight` (new) |

Old Town's two gates open together. The Lantern's two do too, so the land closes into loops once they open. The crossroads → Old Town → causeway → delta → sluice → Low Ward loop is one, and the big loop through the Heights, Ironside, the Blight road, the Lantern, the Drowned Quarter and Old Town is another.

### Walking time from Terminus Square

Roughly: the crossroads 1 minute, Tidemarsh 1, Old Town by the west gate 1½, the Heights 2½, the Old Shipyards 2½, the Drowned Quarter 2½, Ironside 3½, the Lantern 3½ and the crater 4. These are 19 seconds a square along the roads on the map. The tier rule (`findTierIssues`) is about chains of districts, not minutes, and it holds because each ward is entered only through its gate.

### Sightlines

These are what make the land feel big, so the land plan keeps them clear:

- From Forward Post Four you see Old Town's wall across the valley, the Spire on the ridge and Ironside's stacks under the mountains.
- From the ridge you see down onto the river and the walled town.
- From the Drowned Quarter and the spit you see the Lantern's beam turned inland onto the crater.

Nothing far away is drawn yet. The far view (Build order, step 6) is what lets players see them.

### Story changes

- **Gate Duty:** "hold the far yard" becomes holding the crossroads outside the Cordon, where Forward Post Four stands.
- **Last Light:** the Lantern's lens is turned inland. Its light keeps the crater asleep rather than the bay. The chapter's reward also opens the crater rim.
- **Hollow Bay (the finale):** the Hollow lies beneath the crater lake in the Blight rather than under the bay. How the finale enters it, whether through the Sites' lowest hatches, the lake, or both, is decided in the finale's own plan.

Every other chapter's outline and order is unchanged.

## The land plan

### Data

One typed data file in `packages/shared/src/content` describes the overworld land in overworld tile coordinates, anchored so that Terminus Square's origin is (128, 320). It is made of steps, painted in order with later ones winning, as a blueprint is:

- **Water:** the sea (shapes, including the coast), the bay, the river and the delta's channels (lines with a width), and the crater lake.
- **Height:** `rise` and `ramp` as blueprints have them, plus free shapes for ridges, spurs and hills, since rectangles and circles will not make a ridge.
- **Ground cover:** shapes that set a floor and an edge treatment: moor, woods (`trees` with clearings), marsh (grass with pools), overgrown suburb (cracked paving and grass), Blight, beach and rock. Rock is impassable high ground, for the mountains.
- **Roads:** lines with a width and a surface (asphalt, gravel, dirt).
- **Walls and gates:** Old Town's wall as a line, and each crossing as a named gate at a point on a border.
- **Wards:** shapes that say which ward each piece of land belongs to.

### Squares

- **Cutting a square.** A land square's layout names its square (`{ column, row }`) and, if the square is split, its ward. `buildDistrict` starts from that window of the land plan: floors, water, heights and cover. The layout's own steps (buildings, yards, patches, track) then draw on top, followed by placements and dressing as today.
- **Placing it.** Land squares are placed on the overworld by their square, not by `joinDistricts`. The Low Ward stays joined as it is, and the land plan is drawn to agree with its edges.
- **Edges come from the land.** Neighbouring land squares meet wherever the land is walkable on both sides, so exits are derived rather than declared. The per-exit checks (width, two ways in) are replaced for land squares by the ward and seam checks below.
- **Split squares.** A square crossed by a ward border (the river in row 6, the creek, Old Town's wall, the gorge, the Blight road's ledge) holds one district per side. Each has its own ward and tier, the border tiles belong to one of them, and neither grows walls against the other.
    - The server today finds a tile's areas, and whether it is safe, by rectangle across the whole level (`LevelInstance.areasAt` and `isSafe` in `packages/server/src/world/levelInstance.ts`). In a split square that would give a tile both districts' areas.
    - Area and safety lookup must go by the district that owns the tile (`LevelLayout.districtAt`), and so must anything else that maps a tile to a district by rectangle.
- **Land with no district.** Where a square has no walkable ground (open sea, the bay, the mountains, the fells and ash fells along the edges), there is no district. The client draws that land straight from the plan as scenery. Past the edges of the plan it draws open sea to the west, south and north-west, fells past the north, peaks past the north-east, and ash fells past the east.

### Checks

- **Wards are sealed.** Flood-filling a ward's walkable ground without opening any gate never reaches another ward. **Checked**, new.
- **Seams match** by construction, and `findTerrainSeamIssues` still runs.
- **Every walkable tile is reachable** from the spawn with the gates open (`findOverworldIssues`, `findLevelIssues`), and **tier never falls** along the way (`findTierIssues`, with land-square adjacency).
- **Every region has an outpost** (`findRegionIssues`), the Blight included.
- **No square-shaped land.** This is judgement, not a check: reviewers look at the assembled map with the grid hidden.

### Editor

The level view gains a land layer for drawing the coast, the river, rises, ramps and ridges, cover, roads, walls, gates and ward shapes across squares. A change re-cuts every square it touches and saves to the land plan file. Editing inside a square works as it does now.

## What happens to the block-out

- The 42 squares beyond the Cordon, their layout files and their entries in `hollowBay.ts` and the overworld recipe are replaced.
- Ids are reused where the place survives: `gatehouse-yard` for the crossroads square (required, see Constraints), and `dry-dock-four`, `brinehouse`, `the-spire`, `cathedral-close`, `bellows`, `site-fathom` and `the-lantern` for the Site squares.
- The quartermasters, outpost services, Site landmarks, prefabs and kit in `seed/hollowBay.ts` move to their new squares.

## Docs to update

- **`WORLD_DESIGN.md`:**
    - Rewrite "What the world should feel like" for towns in a reclaimed landscape.
    - Rewrite the Wards section for the Hinterland.
    - Add land squares and the land plan to Authoring and Joining.
    - Note where the per-square rules (one landmark per square, whole-side exits, wards keeping their edges) change for land squares.
- **`ARCHITECTURE.md`:** the land plan, land squares and scenery without districts.
- **`2026-11-18-hollow-bay-atlas.md`:** mark its city diagram, ward tables and gate table as replaced by this document, and keep its Sites, tiers and chapters.

## Build order

1. **Land plan engine (shared).** Data types, cutting a square, grid placement, derived edges, split squares, the sealed-ward check, and tests on the fixture world.
2. **Client scenery.** Land without districts (sea, bay, mountains, fells), the scenery past each map edge, and the maps showing the whole land.
3. **Editor land layer.**
4. **Draw the Hinterland.**
    - Draw the land plan to the approved map.
    - Cut the squares, about 90 beyond the Low Ward.
    - Block out each town, Site compound, outpost and crossing: ground, roads, building shells and gates.
    - Move the regions, quartermasters and flags across.
    - Re-run `npm run bench:tick` on 768 × 640 before touching `capacity`.
5. **Docs and the walk.** Update the docs, then walk the land in a live game, including the terrain checks the last handoff left open: climbing a ramp, the camera following, clicking a cliff top, creatures pathing round a plateau, and ranged attacks across a cliff rim.
6. **Far view** (own plan). Low-detail land and landmark silhouettes beyond the built chunks, so the sightlines above work.
7. **Wards in order**, as in the atlas spec, starting with the Old Shipyards.

## Left to the builder

- The land plan's exact file format and shape primitives, and how steps are expressed in JSON or TypeScript.
- How derived edges are stored, and how split-square districts share the border tiles.
- Which square owns a sliver of land under a few tiles wide. Fold it into a neighbour or leave it as sea or rock.
- Place names for the new land squares.
- The exact courses, widths and heights, within the approved map.
- How much dressing the block-out gets: the same plain first pass as last time, passing every placement check.

## Calls I made (not the owner's)

- **The Cut's east edge.** It opens to the river's water where the canal meets it. This is the only change to a Low Ward square.
- **Split squares.** A square crossed by a ward border becomes one district per side, not one district with a ward per area. Every district-level rule (region, tier, outpost) then stays as it is.
- **Land with no district.** Sea and mountains are scenery drawn from the land plan, not districts nobody can walk.
- **The Blight is a region of its own** (tier 28), entered at the crater rim from the Lantern's Blight road, with a camp at the rim as its outpost.
- **Two gates open on one flag** for Old Town (west gate and causeway) and for the Lantern (seawall and Blight road).
- **The far view is its own plan**, straight after this one, rather than part of it.
- **The creek, Gallows Hill's cliffs and the Blight road's ledge** were added after the review. The approved map had no barrier between the Great Wood and the Drowned Quarter, or on the Blight road's west side, so Tidemarsh players could have walked to the Lantern without a gate.
- **Closing the north and east edges with land** (sea cliffs, fells, ash fells) rather than growing the plan past 12 × 10.
- **Reused ids** for the crossroads and the Site squares.
