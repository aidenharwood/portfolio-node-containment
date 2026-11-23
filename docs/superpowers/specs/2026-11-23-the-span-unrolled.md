# The Span, unrolled: an open 2D world with height and a tram

Written 2026-11-23. Amends `2026-11-20-the-span-design.md`. The story, the creatures, the quests, the Sites and the settlements stay. The shape of the world changes.

## Why

The first Span was a 16 × 6 strip that you walked from west to east. It played like a corridor: one direction, little height, and no room to grow. The goal now is a map you read like an old-school RuneScape world map: land in every direction, hills and plateaus, coasts and a skyline. It should be free to explore, and new land should be able to go onto any edge. Fast travel comes back as the tram.

## The shape

The Span is still a precursor ring-habitat arc, but the stretch the Directorate holds is a broad floor of the arc, not a thin strip: **the Reach**, an island of land in the Brim Sea. The **Quiet Massif** rises in the middle, and the Spindle stands on its summit, visible from everywhere. The six regions run clockwise around the Massif, and the tier rises as you go round:

```
row 0  ..................
row 1  ..CCCCCCCCWWWWWW..      C Halcyon        6–7   a neon city on a raised grid, tower skyline
row 2  .CCCCCCCCCWWWWWWW.      W the Wreckfield 8–9   rust coast, the Meridian's hull, a crater lake
row 3  .CCCCCCCCCWWWWWWW.      G the Glass Steppe 10–11 a high glass plateau
row 4  .HHHH#######GGGGG.      S the Spindle    12–13 the Massif's summit, reached only from the Steppe
row 5  .HHHH##SSSSS#GGGG.      H Harrow Terraces 3–5  terraced farmland climbing the Massif's west flank
row 6  .HHHH#SSSSSSGGGGG.      K Kestrel Reach  1–2   lawns, a lake and the coast; you start here
row 7  .HHHH#SSSSSS#GGGG.      # the Massif: bare rock at the top step
row 8  ..HHH##SSSS##GGGG.      ~ the Drop: a sea inlet between Kestrel and the Steppe
row 9  ..HHK#######~GGG..      . the Brim Sea
row 10 ..KKKKKKK~~~GGG...
row 11 ..KKKKKKK~~.GG....
row 12 ...KKKKK..........
row 13 ..................
```

- **Every square is a land square of 64**, as before, and every square of a region is that region's ward. There are about 140 land districts.
- **Tier follows distance, not column.** Inside a region, tier rises with walking distance from Site Kestrel, between the region's two tiers.
- **Borders.** Every pair of neighbouring regions meets at a **Seam**: a precursor bulkhead at the top step, crossed at its three gates. There are five: Kestrel–Harrow (beside the Spill), Harrow–Halcyon, Halcyon–Wreckfield, Wreckfield–Steppe, and the Spindle Seam, where the Steppe climbs onto the Spindle through the one pass in the Massif's ring. The Drop keeps Kestrel and the Steppe apart, and nothing crosses it.

## Height

The plan has three new step kinds:

- **`relief`** sets heights inside a shape from deterministic fractal noise, between a low and a high step.
- **`soften`** lowers walkable ground just enough that no walkable tile stands more than one step above any neighbour. Water pulls the land beside it down into beaches; rock and walls are left alone.
- **`origin`** gives the plan world coordinates. Every step and every district square is in world coordinates, so growing the map west or north means lowering `origin` and widening the plan. No step and no district moves. That is how the Reach expands in any direction.

Each region has its own relief band (`REGIONS` in `scripts/span/atlas.ts`; squares beside the Massif are lifted a little more):

| Region | Relief |
| - | - |
| Kestrel | 1–11, rolling down to beaches and a lake |
| Harrow | 2–15, climbing in terraces toward the Massif |
| Halcyon | 3–10, with tower blocks rising to the top step |
| Wreckfield | 0–9, around a crater lake and the hull |
| Steppe | 5–15 |
| Spindle | 9–15 under rock peaks |

Settlements and Sites stand on flat pads set at the lowest ground under them, so the land slopes down into every town.

## Transit

The **Span Transit** maglev comes back on the existing tram engine (stations, lines, discovery and boarding from the car). The track is drawn as land, so it is part of the world: a rail line you see, follow and cross on bridges.

- **The Ring Line** runs through Kestrel Commons, Harrowgate, Neon Row, Rustwater and the Choir. It does not close over the Drop; the line ends at the Choir.
- **The Spindle Funicular** runs from the Choir up to Last Post.
- Every station is a walled, safe **terminal** building in its hub square, with the track running through it, one car on the platform and a departure board. Kestrel Commons is known from the start. Every other station is found by walking into it.
- The track blocks walking. Bridges (deck assemblies) cross it at least once in every square it passes through.
- The track is graded, not laid on the raw ground. `scripts/span/grade.ts` gives each line a height profile that follows the smoothed land, changes by at most one step at a time and holds each height for at least six tiles. It stays flat through every terminal, around every bend and under every bridge. Where the land is higher the track runs in a cutting, and where it is lower the track runs on an embankment; `soften` then slopes the land down to it.
- The renderer draws each step in the grade as a smooth slope over the four tiles around it, and each bend of the double track as two curved lanes around the bend's inner corner. Where the Funicular leaves the Ring Line, the junction draws the straight through and both bends (`packages/client/src/render/world/trackPieces.ts`).

## Quests across the island

The story (Acts I–VI) is unchanged. Side content is spread round the Massif so every region has errands in its wild squares, not only in its hub. There are 71 quests in 16 questlines.

- **Directions.** "Spinward" is the way the Span turns round the Massif: Kestrel, Harrowgate, Halcyon, Rustwater, the Choir, Last Post. Site Tallow is three squares from Rustwater, past the Reactor Scar, not "two hours".
- **Regional errands.** Kestrel Reach, Harrow Terraces and Halcyon each gained errands for their idle shopkeepers, including the first Marksmanship (`range-day`), Refining (`first-melt`) and Psionics (`the-smile-clinic`) quests. Rustwater Jobs and Last Post Errands gained `salvage-rights` and `door-duty`.
- **Chains in the wild.** `meridian-manifest` (the Bow, Keel Road, Engine Field, Boiler Bay, the Reactor Scar, the Crater Shore) and `pylon-line` (Hollow Pylons, the Pylon Walk, Vigil Fields, the Lens, Drop Edge) run through squares that had no quest. Each chain is joined by `followUpQuestId`.
- **Cohort 41.** A side questline round the whole island: Okonkwo's returns board, then the reprints Adebayo (Harrowgate), Sola (Glasshouse Alley), Marek (Rustwater), Yusuf (the Choir) and Moreno (Last Post), each offering the next once the story has reached their region, ending at the Cohort Bell in the Recruit Lines.
- **Choices.** `the-lift-book`, `last-word-at-the-plough`, `no-screens` and `crater-lake` end on a choice that sets a flag, pays differently and changes what the NPC says afterwards.
- **After the file.** `the-next-cohort` is offered only with `ending:resealed` and `off-the-books` only with `ending:signed-out`. `directorate-commendation` refights three bosses and is the first offer gated on quest points (50).
- **Gates.** Every side quest offered in dialogue waits on a story quest (`offerRequires`), and every gather step is gated on the skill its nodes need, either by an offer condition with a `notReady` line or by an earlier `reach` step (`test/questCoverage.test.ts`).
- **Placement.** Quest NPCs added for these lines (`span/questFolk.ts`) stand in the safe ground of the hubs. Quest objects in wild squares stand in the `ground` room and are listed in each square's layout as `<district>-quest-<object>`.
