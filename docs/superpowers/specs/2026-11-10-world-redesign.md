# World Redesign: A Sprawling, Open Site Meridian

## Intent

Every level today is a row of walled boxes joined by seven-tile corridors, with void everywhere else. The main floor is a 454 × 106 strip. This redesign rebuilds **every level and every district** so Meridian reads as one large, coherent facility: open halls, wide boulevards, plazas, yards and back-of-house filler between the places that matter, as in the overworld of a large MMO.

Agreed with the owner:

- **Depth:** rebuild the districts too, not only their arrangement.
- **Scope:** every level: the main floor, the Deep, the dungeon floors and the pockets.
- **Authoring:** blueprints, not hand-typed ASCII maps.
- **Guidelines:** a written guide plus automated checks, so later contributors (human or model) keep to the same rules.

What does **not** change: story, quests, dialogue, items, creatures' definitions, gating, tram lines, and the id of every area, NPC, object and creature instance. Only where things stand changes. Larger hostile areas gain more of their existing creatures and nodes so they are not empty.

## 1. World shape

### Main floor (about 760 × 520)

```
 Pharmacy            [sealed: Tallow]
    |                      :
 Porter's Lodge       Sector Two ---- Waterworks ----.
    |                      |              |          |
 Vesper Wards -- Hydroponics -- ATRIUM -- Service Yards   Brine Galleries
                           :                              |
                      Intake Wing                    Calder Gatehouse
                           :                              |
                     [sealed: Lattice]               Salt Cathedral
```

- The **Atrium** is the centre. **The Circuit**, a ring boulevard, runs around it and joins Hydroponics (west), Sector Two (north), the Service Yards (east) and each other, so travel is not hub-and-spoke.
- The **Intake Wing** sits south across a chasm: visible, never walkable, still tram-only.
- The **Vesper Wing** climbs north along the west edge (Wards, Lodge, Pharmacy). The **Calder Wing** descends south along the east edge from the Waterworks (Brine Galleries, Gatehouse, Salt Cathedral).
- **Sealed stubs** north of Sector Two and south of the Intake chasm mark where the Tallow and Lattice wings of the level-100 plan attach.
- **Filler** between districts is real, walkable space in districts of its own: boulevards 9–15 tiles wide with colonnades, junction plazas with a landmark each, dormitory and canteen blocks, storage bays, freight yards, coolant canals with bridges, and chasms as negative space.
- The **Meridian Line** track is drawn through the world between its stations.
- Each existing district grows to roughly 2–4 times its area, with an irregular footprint and more than one way in.

### The Deep (about 420 × 340)

A cavern ring. Deepwatch and its lift stand on a central island; a ring causeway circles a chasm; the Cryovault, Signal Array and Drowned Archive sit around it behind their existing pressure doors; the Furnace is furthest out across a long causeway. The Abyssal Circuit track follows the ring.

### Dungeon floors (about 110 × 80 each)

The Undercroft, Calder Deeps and Cold Ward gain loops and side chambers, with the boss room furthest from the lift.

### Pockets

Deliberately compact and strange, about twice today's size. Meridian Below is rebuilt as a warped mirror of the new Atrium.

## 2. Blueprints

`shared/src/world/blueprint.ts` is a pure builder. A district declares steps and `drawBlueprint` produces the tile map plus named geometry.

| Step | Meaning |
| ---- | ------- |
| `room(id, x, y, w, h, floor, shape?)` | Carve a named space. Shapes: `rect`, `octagon`, `round`. A room drawn inside another is a named zone of it. |
| `link(from, to, width, floor?, offset?)` | Carve a passage across the gap between two rooms. `floor: 'door'` makes a doorway. |
| `exit(id, room, side, width, offset?, gate?)` | Carve from a room to the district edge. Exits are how districts join. |
| `patch(x, y, w, h, tile)` | Paint any tile: pools, track, partitions, glass, floor strips. |
| `pillars(room, everyX, everyY, inset?)` | A colonnade grid. |

Walls are never drawn by hand: every void tile touching floor becomes wall.

The result exposes `map`, `rooms`, `exits`, and:

- `at(room, dx, dy)`: a point in a room, checked walkable at load.
- `center(room)`, `linkTile(from, to, index)`.
- `area(room, name, options)`: the `AreaDefinition` for a room.
- `scatter(room, count, seed, avoid)`: deterministic free floor tiles, for litter, props, extra nodes and creature packs. No runtime randomness.

`DistrictDefinition` gains `rooms`, `exits`, `anchors` (named points other content and tests refer to: tram platforms, teleport landings, spawns, recovery points) and `deadEnd`.

Levels place districts with `joinDistricts` (`world/levelPlan.ts`): each district names the exit it attaches by, and origins are computed, so nobody does origin arithmetic by hand.

## 3. Guidelines and checks

`WORLD_DESIGN.md` at the repo root, linked from `CLAUDE.md` and `CONTRIBUTING.md`, holds the rules and the reasoning. `findWorldDesignIssues` (`content/worldDesignIntegrity.ts`) runs inside `findContentIssues`, so the server will not boot and `npm test` fails when a rule is broken.

| Rule | Enforced |
| ---- | -------- |
| A district's map comes from a blueprint (it has `rooms`) | Check |
| Every NPC, object and creature stands inside a named room or a link | Check |
| Every area matches a room | Check |
| Every exit meets walkable floor of a neighbouring district; no floor opens onto the void | Check |
| Exits are at least 9 tiles wide unless marked `gate` | Check |
| On a multi-district level a district has two exits or more unless `deadEnd` | Check |
| Creatures per walkable hostile tile stay inside a band | Check |
| A tram platform is within a few tiles of drawn track | Check |
| Tier never falls along the shortest route out from the level spawn | Check |
| What filler is, shape language per region, landmarks, reserved stubs, how to add a district or wing | Guide |

Districts not yet rebuilt are listed in `LEGACY_DISTRICTS` and skipped. The list shrinks each phase and is deleted in the last one.

## 4. Engine and saves

- **Saves:** a stored position that is no longer walkable returns the character to that district's `recovery` point, and only then to the level spawn.
- **Scale:** confirm long-route planning (`GuidanceRoute`, `planTransit`) and the world map cope with the larger floors; re-run `npm run bench:tick` before any capacity change.
- **Tests:** coordinates in tests move to named rooms and anchors (`inRoom(districtId, roomId)` in the test harness).

## 5. Migration method

The 1,041 existing placements are carried over mechanically: each sits in an old area, and is mapped into the room of the same id in the new blueprint, keeping its offset from the nearest walls when close to them and scaling otherwise. The result is written into the district file as `at(room, dx, dy)` and then tuned by hand. The migration script is a one-off and is not committed.

## 6. Build order

Each phase leaves `npm run typecheck` and `npm test` green.

1. Blueprint builder, `joinDistricts`, anchors, `WORLD_DESIGN.md`, `findWorldDesignIssues` with every district exempt.
2. Main floor core: Atrium, the Circuit and filler, Intake Wing, Hydroponics, Sector Two, Service Yards, Waterworks.
3. Calder and Vesper wings and their dungeon floors.
4. The Deep and the Undercroft.
5. Pockets.
6. Benchmark, world map polish, `ARCHITECTURE.md` and `CONTRIBUTING.md`, removal of `LEGACY_DISTRICTS`.

## Outcome

All six phases are done. Every district on every level is drawn from a blueprint and `LEGACY_DISTRICTS` is gone.

| Level | Before | After |
| ----- | ------ | ----- |
| Main floor | 454 × 106 | 1283 × 295 |
| The Deep | 188 × 59 | 340 × 342 |
| Undercroft | 40 × 26 | 110 × 80 |
| Calder Deeps, Cold Ward | 40 × 30 | 110 × 84 |
| Meridian Below | 46 × 34 | 100 × 75 |
| Dead Letter Office | 36 × 24 | 72 × 52 |
| Verdant Fold | 20 × 15 | 46 × 30 |
| The Threshold | 20 × 14 | 38 × 33 |

Where the result differs from section 1:

- The main floor is wider and flatter than planned. The wings still run mostly outward along the east–west axis before turning north (Vesper) and south (Calder).
- Sector Two sits inside the Circuit and is reached only through the Atrium bulkhead, so the ring does not join it or the Waterworks to their neighbours.
- The Meridian Line is a trunk through the chasm with a spur to each station, because most platforms back onto a room at one end. Trams reverse at stations.
- On the Deep, track is drawn at each platform, not around the ring.

`npm run bench:tick` on the rebuilt main floor (one layer, players wandering):

| Players | Tick mean | Tick p95 | Budget used at p95 | Per-player traffic |
| ------- | --------- | -------- | ------------------ | ------------------ |
| 100 | 27.6ms | 53.5ms | 18% | ~2.7 KB/s |
| 300 | 145.0ms | 175.9ms | 59% | ~6.0 KB/s |
| 600 | 317.8ms | 379.0ms | 126% | ~11.1 KB/s |

Traffic per player fell about sixfold, since players are spread far thinner. Tick time rose about threefold at 300 players against the old floor (54ms p95): more chunks are watched, so more creatures are awake, and paths cross larger open rooms. The cap stays at 300. The tick cost is worth profiling before the next wing lands.
