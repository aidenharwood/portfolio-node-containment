# World furnishing: set-pieces, compositions, floor art and condition

## Why

Every room is dressed by `furnish()` (`content/districts/furnish.ts`) from a single theme. The theme picks one wall prefab, repeated at an even pitch along the walls, and one floor prefab, repeated on a symmetric grid either side of a walking cross. The 50 prefabs in `content/prefabs.ts` are one to four tile rows of 1×1 props. The result reads as generated: the Atrium plaza, the hub of the whole game, is a 62×50 octagon tiled with `planter, bench, bench, planter`, and any two rooms of the same theme look alike. There is no focal point, no hierarchy, nothing larger than one tile except assemblies, and nothing on the floor itself.

## Goal

Every room in the game looks composed by a person: a thing you look at, things arranged around it, paths that lead somewhere, and a state of repair that tells you how deep into the facility you are. The core is grand and clean; the wings decay, flood, overgrow and turn alien with depth and tier.

Success, judged in the running game:

- Standing anywhere in the Atrium plaza you see a centrepiece, framed seating and routes to each wing, not a grid.
- Two rooms with the same theme are visibly different.
- You can tell which region you are in from the dressing and the floor alone.
- Every landmark in `WORLD_DESIGN.md` is a composed set-piece you can see from a distance.

## Constraints

- Shared stays deterministic and data-driven: no `Math.random()`, everything seeded from district and room ids.
- Gameplay does not change. Walkability may shrink only where dressing stands, and every walkable tile of a room must stay reachable (checked). Safe areas, quest props, anchors, exits, track and doors are untouched.
- Dressing objects are non-interactive scenery. Their instance ids are generated and may change between builds; nothing (quests, flags, saves, tests) may refer to one. Hand-placed set-pieces that a quest or test needs get a fixed instance id like any fixture.
- No code comments, erasable TypeScript, `.ts` imports, as per `CONTRIBUTING.md`.
- `npm run typecheck` and `npm test` pass at the end of every wave.

## Approach

Rooms are dressed in four layers, in this order:

1. **Set-pieces**: large prefabs placed by hand in district files on landmark and feature rooms.
2. **Compositions**: the rest of each room is filled by a zoned composition drawing from tagged prefab libraries, with variety rules instead of a fixed pitch.
3. **Floor decals**: inlays, rugs, runners, lane paint and wear stamped onto the floor by set-pieces, compositions and conditions.
4. **Condition**: a per-district overlay (pristine, worn, breached, overgrown, flooded, alien, uncanny) that swaps props for wrecked variants and adds debris and decals.

Hand-authoring every room (189 rooms) was rejected as too large and too brittle when blueprints change; a smarter generator alone was rejected because without focal set-pieces it still reads as generated.

## Data model

### 1. Multi-tile objects

`WorldObjectDefinition` gains `footprint?: { readonly width: number; readonly height: number }`, default 1×1. An `ObjectPlacement`'s `position` is the footprint's top-left tile after rotation; `facing: 'east' | 'west'` swaps width and height.

- `world/footprint.ts` gains `objectFootprintTiles(definition, placement)`, generalising the 2×2 creature helpers to rectangles.
- Blocking (`district.ts` walkability), `mapScenery`, fixture checks, `positionsOf`, interaction reach and client picking use every footprint tile.
- Client: one voxel model spans the whole rectangle (16 voxels per tile). A large object belongs to the chunk containing its top-left tile; chunk culling bounds include its extent, and `fadeBatch` fades it as one unit.
- `ObjectLight` already exists; fountains, braziers and growths carry their own light.

### 2. Prefab library v2

`content/prefabs.ts` becomes `content/prefabs/`:

```
prefabs/
  types.ts        Prefab, PrefabPiece, PrefabDecal, PrefabRole
  civic.ts  office.ts  canteen.ts  dormitory.ts  industrial.ts  freight.ts
  garden.ts  wet.ts  medical.ts  lab.ts  ritual.ts  transit.ts  archive.ts
  post.ts  camp.ts  cold.ts  ruin.ts
  index.ts        PREFABS (merged record), prefabsWithRole(theme, role)
```

```ts
export type PrefabRole = 'focal' | 'bay' | 'corner' | 'edge' | 'island' | 'wall';

export interface Prefab {
  readonly id: string;
  readonly themes: readonly DressingTheme[];
  readonly roles: readonly PrefabRole[];
  readonly pieces: readonly PrefabPiece[];
  readonly decals?: readonly PrefabDecal[];
  readonly clearance?: number;
  readonly symmetric?: boolean;
  readonly minRoom?: { readonly width: number; readonly height: number };
}
```

- `pieces` may name large objects; the prefab's bounds come from piece footprints.
- `roles` replace `placement: 'floor' | 'wall'`. `wall` and `bay` prefabs need a wall behind their back row (existing back-check).
- `clearance` is the free ring kept around the prefab (default 1).
- `symmetric` prefabs may be mirrored by the composer; others only rotate.
- Every existing prefab is migrated into a library with roles, so current themes keep working.

### 3. Set-pieces

```ts
setPiece(plan, roomId, prefabName, dx, dy, facing?, instanceId?)
```

returns placements (objects and decals) at `plan.at(roomId, dx, dy)`, checked like any `plan.at`. A district passes them to `furnish` via a new `setPieces` option. They are placed first, after fixtures, NPCs and assemblies; the composer works around them. A set-piece with an `instanceId` keeps fixed ids for its pieces (`<instanceId>/<n>`), so quests can point at it.

### 4. Compositions

`RoomDressing` gains `composition?: CompositionName` and `condition?: Condition`. `THEME_LAYOUTS` is replaced by `COMPOSITIONS` in `content/compositions.ts`:

```ts
export interface RoomComposition {
  readonly zones: readonly CompositionZone[];
  readonly formal: boolean;
  readonly lane: 'cross' | 'spine' | 'ring' | 'none';
}

export interface CompositionZone {
  readonly kind: 'focal' | 'bays' | 'corners' | 'edges' | 'field';
  readonly role: PrefabRole;
  readonly spacing: { readonly sparse: number; readonly normal: number; readonly dense: number };
  readonly max?: number;
}
```

Compositions (initial set):

| Name | Use | Shape |
| ---- | --- | ----- |
| `court` | square civic rooms, junction plazas | focal centre, corner vignettes, bays on all walls, cross lane |
| `radial` | octagons and rounds | focal centre, ring lane, islands on the diagonals, bays between openings |
| `concourse` | long boulevards and corridors | spine lane, edge islands alternating sides, occasional bays, no centre |
| `hall` | large rectangular work and ward rooms | rows of islands in aisles, bays along long walls, focal at one end |
| `workroom` | small offices, stores, labs | bays on walls, one island, corner accents |
| `yard` | freight and outdoor-feeling rooms | clustered islands with irregular gaps, edges along walls |
| `nave` | chapel, ritual and grand ceremonial rooms | formal, focal at the far end from the main entrance, island rows facing it |

When a room names no composition, one is inferred from its shape and theme: `octagon` or `round` gives `radial`; aspect ratio of 2.5 or more gives `concourse`; area under 500 tiles gives `workroom`; `chapel` gives `nave`; `freight` or `wet` gives `yard`; otherwise `court`.

**Composer rules** (replacing the grid in `furnish.ts`):

- Zones fill in order: focal, corners, bays, edges, field. A focal zone is skipped when a set-piece already stands within the room's centre third.
- Each slot draws a prefab from `prefabsWithRole(theme, role)` using the room's seeded random. It never places the same prefab in two neighbouring slots, and no prefab appears more than three times in a room unless the composition is `formal`.
- `formal` compositions mirror across the room's main axis: what is placed on one side is placed, mirrored, on the other.
- Spacing is jittered by up to one tile per slot in non-formal compositions so rows do not run on a fixed pitch.
- Clearances, opening clearance, lanes, anchors, exits and link tiles are kept clear as today.
- Generic NPCs are placed as today, but prefer tiles next to seating and counters.
- Litter under furniture is still cleared.

### 5. Floor decals

`DistrictDefinition` gains `decals?: readonly FloorDecal[]`:

```ts
export type FloorDecalKind =
  | 'inlay' | 'mosaic' | 'rug' | 'runner' | 'lane-paint' | 'hazard-paint'
  | 'wear' | 'scorch' | 'moss' | 'water-stain' | 'salt-crust' | 'alien-vein' | 'cracks';

export interface FloorDecal {
  readonly kind: FloorDecalKind;
  readonly rect: TileRect;
  readonly pattern?: 'solid' | 'border' | 'checker' | 'compass' | 'stripe';
  readonly tint?: string;
}
```

- Decals come from set-pieces (`PrefabDecal` offsets), compositions (a runner along the lane between two openings, a rug under a waiting island) and conditions.
- They must lie on walkable floor tiles (checked).
- Client: `levelVoxels.ts` `paintFloor` reads a per-tile decal lookup and recolours the top floor voxels by kind and pattern; `floorScatter.ts` adds matching debris (leaves for moss, flakes for scorch). Decals have no gameplay effect and are not sent per tick; they ship with the district definition.

### 6. Condition overlay

`DistrictDefinition` gains `condition: Condition`. `RoomDressing.condition` overrides it per room.

```ts
export type Condition = 'pristine' | 'worn' | 'breached' | 'overgrown' | 'flooded' | 'alien' | 'uncanny';
```

After composition, `applyCondition` runs a seeded pass over the dressing, never over fixtures or set-pieces with fixed ids:

| Condition | Swaps | Adds | Decals |
| --------- | ----- | ---- | ------ |
| pristine | none | none | inlays and rugs kept crisp |
| worn | about 10% of seating and planters to worn variants | stray crates, mop buckets | `wear` along lanes |
| breached | about 30% of props to toppled or burnt variants | barricade lines across bays, collapsed slabs, debris | `scorch`, `cracks` |
| overgrown | planters to overgrown, some props to vine-wrapped | vine masses, moss beds | `moss` spreading from soil |
| flooded | low props to waterlogged | flood debris, sandbags | `water-stain` near coolant |
| alien | some props to fused or crystal-grown | alien growths 2×2/3×3 | `alien-vein` radiating from the focal |
| uncanny | none; the composition is mirrored and made strictly formal, and one prop per room is doubled or displaced | none | inlays reversed in tint |

Every swap target is a real object; `findFurnishingIssues` checks that each condition rule's variants exist.

## Content

### Libraries

About 150 prefabs, each tagged with themes and roles.

| Library | Large features (new multi-tile models) | Clusters |
| ------- | -------------------------------------- | -------- |
| civic | fountain basin 3×3 and 5×5, monument statue 2×2, directory pylon, curved bench ring segment 3×1, banner mast, glass kiosk 3×2 | conversation pits, waiting islands, planter bays, info stands |
| office and archive | reading table 4×2, reception desk 4×2, map table 3×2, records vault wall 4×1 | desk pods, carrels, stacks with ladders |
| canteen and dormitory | serving counter 5×1, booth 2×2, bunk alcove 3×2 | dining islands, lockers with benches |
| industrial and freight | gantry crane 6×3, press 3×3, tank 3×3, container stack 2×1 | workcells, pallet yards, forklift bays |
| garden and wet | raised grow bed 4×2, settling tank 4×4, pump house 3×2 | irrigation runs, potting yards, grate walkways |
| medical and lab | triage station 3×2, cryo bank 4×1, specimen column 2×2 | bed bays with screens, lab benches |
| ritual | salt altar 3×2, reliquary 2×2, brazier, salt pillar 2×2 | pew blocks, candle walks |
| transit | timetable board 3×1, ticket barrier run, shelter 3×2 | platform benches, luggage piles |
| ruin | collapsed slab 3×3, barricade line, burnt kiosk 2×1, toppled statue 2×2, vine mass 2×2, flood debris, alien growth 2×2 and 3×3 | used by conditions |

New models: about 45 large, about 35 small props, about 25 wrecked, overgrown, waterlogged or fused variants. Each has a `WorldObjectDefinition` in a content file and a voxel model in `client/src/render/models` (a new `setPieceModels.ts` and `ruinModels.ts`, plus additions to existing files by theme).

### Condition by district

| Condition | Districts |
| --------- | --------- |
| pristine | Meridian Atrium, Porter's Lodge |
| worn | The Circuit, Service Concourse, Service Yards, Verdance Concourse, Calder Gatehouse, Deepwatch Station |
| breached | Intake Wing, Sector 2, Vesper Wards, Vesper Pharmacy, Sanatorium Walk, Calder Causeway, The Cold Ward |
| overgrown | Verdance Hydroponics |
| flooded | Meridian Waterworks, The Drowned Archive, The Undercroft, Brine Galleries |
| alien | Deep Concourse, The Cryovault, The Signal Array, The Furnace, Furnace Causeway, Sector 3, Salt Cathedral and Calder Deeps (with `salt-crust` in place of `alien-vein`) |
| uncanny | Meridian Below, The Dead Letter Office, The Verdant Fold |

Rooms override where the story wants it: the Atrium's quarantine gate is `breached` at its north end; Hydroponics' seed vault stays `pristine`.

### Set-pieces by district

Every landmark and every junction plaza gets a set-piece. Rooms not listed get a composition.

| District | Room | Set-piece |
| -------- | ---- | --------- |
| Meridian Atrium | plaza | The central shaft inside a compass mosaic; four fountain basins (3×3) on the diagonals; curved bench rings facing the shaft; banner masts flanking the quarantine-gate axis; runners to each wing door |
| | quarantine-gate | Security checkpoint line: ticket barriers, two guard kiosks, hazard-paint apron before the bulkhead, barricade at the north end |
| | lift-bay | Transit shelter, timetable board and platform benches along the tram edge |
| | medbay | Triage station at the centre, bed bays with screens down both long walls |
| | requisitions, response-office, archives | Reception desk facing the main door, rug, desk pods behind |
| | workshop, engineering | Workcells around the installations, cable runs to a central press |
| | west-gate, east-gate | Gate arches: directory pylon and planter bays (west), freight scales and pallet yard (east) |
| The Circuit | signal, pump, lantern and ledger courts | One monument each, the plaza's landmark: relay mast, pump fountain, lantern tree, ledger obelisk; circular inlay |
| | canteen, mess-hall | Serving counter with booths and dining islands |
| | west-dormitory, east-barracks | Bunk alcoves, lockers with benches |
| | reading-room | Reading tables under lamps, stacks with ladders |
| Service Yards | gantry-yard | Gantry crane over a container stack and a hazard-painted bay |
| | scrap-yard | Scrap mountain with a crane magnet and sorting bins |
| | laundry | Washer bank, folding tables, hanging lines |
| Service Concourse | container-stacks | Container canyon |
| | drivers-rest | Diner counter and booths |
| Verdance Concourse | seed-exchange | Market stalls around a seed obelisk |
| Intake Wing | arrival | Arrivals desk and welcome statue |
| | observation | Observation window bench row and console island |
| | range | Firing lanes with targets and a range master's booth |
| | transit-bay | Transit shelter and timetable board |
| Sector 2 | inner-chamber | Containment cell ring around a breached core, barricade lines |
| | research-lab | Lab benches around a specimen column |
| Verdance Hydroponics | heart-bed | The Heart Bed ringed by raised grow beds and irrigation runs |
| | grow-hall | Rows of raised grow beds with a gantry walkway |
| | seed-vault | Vault doors and a pristine reception desk |
| Meridian Waterworks | settling-tanks | Settling tanks 4×4 with grate walkways |
| | pump-house | Pump house with valve wall |
| | filtration-beds | Filter bed rows with a control kiosk |
| The Undercroft | camp | Survivor camp: tarp shelter, brazier, cots |
| | pump-hall | Flooded pumps with sandbag walls |
| Deepwatch Station | platform-hall | Transit shelter, timetable board, departure benches |
| | command-post | Map table with monitors |
| Deep Concourse | the four turns | Observation platform over the chasm with a beacon mast |
| | ring-hub | Station monument and alien growth at its foot |
| The Cryovault | pod-hall | Cryo banks in formal rows with a frosted central column |
| The Drowned Archive | reading-rooms | Reading tables half underwater, floating ledgers |
| | stacks | Collapsed shelving canyon |
| The Signal Array | dish-gantry | Dish base with cable trunks |
| | operator-pit | Console horseshoe |
| The Furnace | reactor-heart | Reactor core ring with coolant pipes and control island |
| | foundry | Crucible and casting line |
| Furnace Causeway | ember-landing | Forward camp with brazier and supply pile |
| Sector 3 | threshold | Reflecting pool inlay with a single monument |
| Calder Gatehouse | gatehouse | Outpost hall: brazier ring, supply tables, gate arch |
| Calder Causeway | weighbridge | Weighbridge platform and toll booth |
| Brine Galleries | brine-pans | Evaporation pans in rows with rakes and salt piles |
| | tally-house | Tally counter and ledgers |
| Calder Deeps | old-workings | Headframe and mine-cart line |
| | foremans-office | Foreman's desk and map table |
| Salt Cathedral | the-nave | Salt altar at the far end, salt pillars, pew blocks facing it, candle walk runner |
| | reliquary | Reliquaries in formal rows |
| Porter's Lodge | lodge | Lodge hall: fireplace, booths, notice wall |
| Sanatorium Walk | walk | Covered walk with benches and planters every bay |
| Vesper Wards | north-ward, south-ward | Bed bays with screens, nurses' station at the centre |
| | admissions | Admissions desk and waiting island |
| Vesper Pharmacy | dispensary | The Pharmacy rotunda: dispensary ring counter around a specimen column |
| | surgery | Operating theatre under a lamp with an observation rail |
| The Cold Ward | mortuary | Cold-drawer walls and slab rows |
| | almoners-office | Almoner's desk and ledgers |
| Meridian Below | inverted-plaza | The Atrium plaza set-piece mirrored, fountains dry, one statue facing the wrong way |
| | the-well | Well head with offerings |
| The Dead Letter Office | sorting-floor | Sorting cases in a perfect grid around a franking machine |
| | dispatch | Dispatch counter ring |
| The Verdant Fold | grove | A single tree in a mosaic circle |

That is 60 hand-placed set-pieces. The other rooms get compositions; rooms already dressed by theme keep their theme and gain a composition and condition.

## Rules and checks

`WORLD_DESIGN.md` rule 6 ("Dress every room") is rewritten to describe set-pieces, compositions, decals and conditions, and a new subsection lists the checked rules. `findFurnishingIssues` (new, in `content/furnishingIntegrity.ts`, run by `findContentIssues`) checks:

1. No piece of a set-piece or composition covers a door, an exit tile, an anchor, a link tile or track, or stands within 2 tiles of an opening.
2. **Reachability:** after dressing, every walkable tile of each room is reachable from the room's openings (a flood fill per room on the final walkability grid).
3. Each district names its landmark rooms in a new `landmarks` option to `furnish` (at least one per district, matching the set-piece table). Each landmark room has at least one hand-placed set-piece whose prefab has the `focal` role.
4. A room with more than 150 walkable tiles uses at least three distinct prefabs. No prefab is used more than three times in a room unless its composition is `formal`.
5. Every decal lies on walkable floor.
6. Every condition swap target exists, and every swap keeps footprint size.
7. Fixtures on walls still stand against a wall (`findFixtureIssues`, extended to footprints).
8. Prefab definitions are valid: pieces name real objects, pieces do not overlap once footprints are counted, roles are non-empty and `wall`/`bay` prefabs have a back row.

## Testing

- `furnish.test.ts`: determinism (same input, same output); footprint blocking; set-pieces placed before compositions and never overlapped; each composition's zones fill; formal mirroring; repetition and variety limits; condition swaps and decals; reachability failure is reported.
- `footprint` tests for rectangles and rotation.
- The world audit test runs `findFurnishingIssues` on every district.
- Client: a unit test for decal painting on a small tile volume; large-object chunk ownership.
- Every wave ends with an in-game screenshot pass of each changed district, attached to the PR.

## Phasing

One implementation plan, executed in waves. Each wave leaves `typecheck` and `test` green.

1. **Engine.** Object footprints (shared, server, client picking and chunking); prefab library v2 and migration of the existing prefabs; set-pieces; compositions and the composer; floor decals (data and client painting); the condition overlay; `findFurnishingIssues`; the `WORLD_DESIGN.md` rewrite. Existing themes map onto inferred compositions so nothing regresses.
2. **Atrium flagship.** About 15 large models (fountains, statue, bench ring, banner mast, kiosk, directory pylon, reception desk, triage station, transit shelter, timetable board, ticket barrier, press); civic, office, transit and medical libraries; every Atrium room hand-composed. The user reviews it in-game before wave 3 starts.
3. **Main floor.** The Circuit, Service Yards, Service Concourse, Verdance Concourse, Intake Wing, Sector 2, Sector 3, Hydroponics, Waterworks, Undercroft.
4. **Wings.** Vesper (Lodge, Walk, Wards, Pharmacy, Cold Ward) and Calder (Gatehouse, Causeway, Brine Galleries, Deeps, Salt Cathedral).
5. **The Deep line and pockets.** Deepwatch, Deep Concourse, Cryovault, Drowned Archive, Signal Array, Furnace and Causeway, Meridian Below, Dead Letter Office, Verdant Fold.

Waves 3 to 5 touch separate district files and model files by region, so they can run in parallel sessions once waves 1 and 2 land.

## Out of scope

- Changing room shapes, exits or blueprints.
- Interactive furniture (sitting, opening drawers).
- Destructible or state-changing dressing at runtime.
- Lighting changes beyond lights carried by new objects.
