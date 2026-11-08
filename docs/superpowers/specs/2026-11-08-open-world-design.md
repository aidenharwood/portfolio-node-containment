# Open World: Seamless Levels, Trams and Pocket Dimensions

## Intent

Site Meridian should feel like one huge, sprawling facility. You walk it end to end with no loading seams, ride a tram between the stations you have discovered, take lifts down to stacked lower levels (the Undercroft is the basement), and occasionally slip through an anomaly into a pocket dimension.

Decisions taken during brainstorming:

- The main floor is **fully seamless**: one continuous walkable level.
- The tram is **discover-then-ride**. Walking into a station discovers it. From any station platform you pick a known destination on the world map and ride for a few seconds.
- The 12 existing zones keep their content and become **districts** placed onto levels. Quests, NPCs, objects and creatures keep working.
- The approach is **levels assembled from districts, with chunked interest management**. Edge-stitched zones and a single unmanaged giant map were both rejected.

Success means:

- a player walks from the Atrium into Hydroponics without a teleport;
- the server sends each player only nearby activity;
- every existing quest can still be completed;
- `npm run typecheck` and `npm test` pass.

## Decomposition

Each sub-project gets its own plan and leaves the game playable.

1. **World model and server** (this spec's implementation scope). Levels and districts, assembly, chunked interest management on the server, the persistence migration, porting content, and the minimal client changes needed to keep playing.
2. **Client streaming.** Per-chunk meshing, ambience blending between districts, and a minimap for large levels.
3. **Tram network and world map.**
4. **Pocket dimensions.** Anomaly entrances and visited-pocket tracking.

Sections 1 and 2 are the binding design for sub-project 1. Sections 3 to 5 set direction for the later sub-projects, which will each be refined in their own plan.

## 1. Content model

### Districts

`ZoneDefinition` is renamed `DistrictDefinition`, and `ZoneId` becomes `DistrictId`.

- **Keeps:** `id`, `name`, `subtitle`, `tier`, `map`, `ambience`, `areas`, `npcs`, `objects`, `creatures` and `lights`.
- **Recovery:** the optional `recovery`, now written as `{ districtId, position }` in district-local coordinates, stays per district. The Intake Wing gains `recovery` at its old spawn, so an incapacitated recruit never skips the tutorial gate.
- **Loses:** `spawn` and `capacity`, which move to the level.
- **Coordinates:** every position in a district is **district-local**, so existing zone files keep their numbers.

### Levels

```ts
interface DistrictPlacement { readonly districtId: DistrictId; readonly origin: TilePoint }

interface ConnectorDefinition {
  readonly id: ConnectorId;
  readonly name: string;
  readonly origin: TilePoint;
  readonly map: readonly string[];
  readonly ambience: ZoneAmbience;
  readonly lights: readonly ZoneLight[];
}

interface LevelDefinition {
  readonly id: LevelId;
  readonly name: string;
  readonly kind: 'floor' | 'pocket';
  readonly depth: number;
  readonly districts: readonly DistrictPlacement[];
  readonly connectors: readonly ConnectorDefinition[];
  readonly spawn: { readonly districtId: DistrictId; readonly position: TilePoint };
  readonly capacity?: number;
}
```

Levels live in `content/levels/`, one file per level. Connector maps are authored in the level file and use the existing `MAP_LEGEND`. Lights in a connector map are connector-local.

| Level | Kind | Depth | Districts |
| ----- | ---- | ----- | --------- |
| `main-floor` | floor | 0 | Meridian Atrium (centre), Intake Wing, Hydroponics, Sector Two |
| `b1-undercroft` | floor | -1 | Undercroft |
| `the-deep` | floor | -2 | Deepwatch (centre), Cryovault, Signal Array, Drowned Archive, Furnace |
| `the-threshold` | pocket | -2 | Sector Three |
| `meridian-below` | pocket | -4 | Meridian Below |

This mapping follows the existing progression gates: the Deep Line Tram needs `clearance.deepwatch`, and each Deepwatch lift needs its own `clearance.*` flag.

**Gated links.** Some links between districts on the same level have conditions:

- the Intake transit lift (`clearance.atrium-transit`);
- the Sector Two bulkhead;
- the four Deepwatch lifts.

These stay as gated same-level teleports with unchanged conditions. The districts on either side are separated by void or sealed wall, because the engine has no per-character door.

**Ungated links.** The Atrium ↔ Hydroponics tram is the only ungated same-level link. It becomes a walkable connector, the "Verdance Concourse".

**Tram network seed.** The Deep Line Tram (Atrium ↔ Deepwatch) stays a gated cross-level passage. It becomes the first line of the sub-project 3 tram network.

**Out of scope.** A per-character passable door, which would let the gated links become walkable, is out of scope for this spec.

### Assembly

`shared/src/world/levelLayout.ts` exports `assembleLevel(level, districts): LevelLayout`. It is pure and is built once per level at startup, on the server and on the client.

```ts
interface LevelLayout extends ZoneLayout {
  readonly level: LevelDefinition;
  districtAt(point: TilePoint): DistrictId | undefined;
  connectorAt(point: TilePoint): ConnectorId | undefined;
  toLevelPoint(districtId: DistrictId, local: TilePoint): TilePoint;
  toLocalPoint(point: TilePoint): { readonly districtId: DistrictId; readonly position: TilePoint } | undefined;
}
```

- Each district map and each connector map is stamped at its origin.
- Every unstamped tile is `void`.
- `width` and `height` are the bounding box of all placements.
- `ZoneLayout` is renamed `TileLayout`, keeping `width`, `height` and `tileAt`.

`levelOfDistrict(districtId)` comes from a map built in `gameContent.ts`. Every district belongs to exactly one level.

### Teleports and level transitions

- **Teleport effect:** becomes `{ type: 'teleport'; districtId: DistrictId; position: TilePoint }`, where the position is district-local. The server resolves the district to its level and a level point.
- **Lifts between levels:** keep their teleports. This covers the Atrium↔Undercroft service lift, the Deep Line Tram, the Sector Three seals and the Knock.
- **Links within one level:** `atrium-hydroponics-tram` and `hydroponics-tram` are removed. The Verdance Concourse connector replaces them, and their tiles become doors in the district walls. Every gated same-level link stays as a teleport.
- **Quests and events:** the quest objective `enterArea.zoneId` and the event `enteredArea.zoneId` are renamed to `districtId`.

### Character location

`ZoneLocation` becomes:

```ts
interface WorldLocation { readonly levelId: LevelId; readonly position: TilePoint }
```

The position is in level coordinates. `CharacterSummary.zoneId` becomes `districtId`, resolved through `toLocalPoint` for roster display.

### Integrity

`findContentIssues` gains these checks:

- No two placements on a level overlap on a non-void tile.
- Every walkable tile on a level is reachable from the level spawn. A teleport destination counts as reachable from the tiles next to its source object.
- Every district appears in exactly one level.
- Teleport destinations, spawn and recovery positions are walkable in the assembled level.
- Placement instance ids (NPC, object and creature placements) are unique within a level. An area is identified by its district id and area id together, so area ids may repeat across districts.

`findCraftingIssues` keeps using district `tier`. The zone placements it walks become the districts of each level.

## 2. Server

### Level instances and layers

- `ZoneInstance` becomes `LevelInstance`. It holds the `LevelLayout`, the walkability grid, NPCs, creatures, ground items and depletion state, all in level coordinates.
- `World` keeps layers per level using the existing capacity rules. The default capacity is unchanged, and `main-floor` sets 300.
- `world.levelOf(player)` replaces `zoneOf`.
- `world.instances()` keeps its meaning.

### Chunks and interest

- `CHUNK_SIZE = 32` and `INTEREST_RADIUS = 1`. A player's interest set is the 3 × 3 block of chunks around their chunk.
- Pure helpers in `shared/src/world/chunks.ts`:
  - `chunkOf(point)`;
  - `interestSet(chunk)`;
  - `interestDelta(fromChunk, toChunk)` → `{ entered, left }`.
- `LevelInstance` keeps a `ChunkIndex` that maps each chunk to the entity ids, ground-item ids and depleted object ids inside it. It is updated whenever an entity moves, spawns or despawns.
- `LevelInstance.broadcastNear(point, message, exceptEntityId?)` sends to the players whose interest set includes `chunkOf(point)`. It replaces every `zone.broadcast` call in the world, combat, gathering, gear, chat and ground-item controllers.
- `world.tick`: movements are grouped per chunk, and each player receives one `world.tick` with the movements from their interest set. Players with nothing in range get no message.
- **When a player changes chunk:**
  - `world.chunksEntered { chunks, entities, groundItems, depletedObjects }` covers the newly interesting chunks, with ground-item visibility rules unchanged;
  - `world.chunksLeft { chunks }` lets the client drop everything in those chunks.
- **When an entity crosses chunks**, observers who could see only the old chunk get `world.entityDespawned`, and observers who can see only the new chunk get `world.entitySpawned`.
- **Ground-item announcements** (going public, and removal) use `broadcastNear` combined with the existing visibility filter.
- **Local chat and speech** use `broadcastNear` at the speaker's position.

### Dormancy

A chunk is **watched** when it falls inside some player's interest set.

- **Unwatched:** NPC wander, creature aggro and leash checks are skipped for entities in unwatched chunks.
- **Still running:** respawn timers, depletion timers and ground-item expiry.
- **Waking:** a creature whose chunk becomes watched resumes from its current state.

### Movement and pathfinding

- `world.walk` and interaction targets must lie inside the player's interest set, or the server rejects them.
- The pathfinding node cap stays at 6000.
- Area entry is resolved against district areas offset into level coordinates, and `onAreaEntered(player, districtId, areaId)` fires as before.
- Combat, line of sight, leash and the single-way rules are unchanged, and run in level coordinates.

### Entering and leaving

- `world.entered` carries `{ levelId, position, layer, entities, groundItems, depletedObjects }`. The payload covers the initial interest set only. The client assembles the layout from shared content.
- A teleport within the same level moves the player and sends a chunk delta.
- A teleport to a different level runs leave and spawn.
- **Recovery** goes to the `recovery` of the district the player fell in, which may be on another level. Without one, it goes to the level spawn.

### Persistence

Character records are converted from `{ zoneId, position }` to `{ levelId, position }`:

- the level comes from `levelOfDistrict`;
- the position becomes `origin + position`;
- if the old zone no longer exists, the location becomes the main-floor spawn.

The conversion needs content, and SQL migrations are plain strings, so it is not a `MIGRATIONS` entry. Instead, `CharacterRepository` applies it as a record transform whenever it loads a record that still has `location.zoneId`, and the next autosave writes the converted record back.

### Sub-project 1 client changes

These are the minimum needed to stay playable before streaming lands:

- `zoneScene` meshes the whole assembled level once, using the existing code path with a level-sized `DenseVolume`. Each object takes the ambience of the district it sits in.
- `worldState` handles `world.chunksEntered` and `world.chunksLeft` by adding and removing entities, ground items and depleted flags.
- The minimap draws a 64 × 64 window centred on the player instead of the whole map.
- The HUD area and location labels read the district under the player.

## 3. Client streaming (sub-project 2, direction)

- `levelScene` meshes per chunk and keeps the camera's chunk plus its neighbours built. The camera's chunk is built synchronously; neighbours are built a few per frame. Chunks that fall out of range are disposed.
- Cutaway, ceiling fixtures and object animation operate per chunk.
- Ambience (darkness, tint and fog) blends over about 6 tiles when crossing district and connector boundaries.
- The minimap shows district names at its border.

## 4. Tram network and world map (sub-project 3, direction)

- **Content:** `content/tramNetwork.ts` defines `TramLine { id, name, stations }` and `TramStation { id, name, districtId, platform, areaId }`. A station object has the `openTramMap` effect.
- **Discovery:** entering a station's area sets the flag `tram:<stationId>`. A `discoverStation` effect does the same from quests and dialogue.
- **Riding:** `tram.board { destinationStationId }` is valid only while the player stands on a known station's platform, the destination is known, and both stations are on the same level.
  - The ride is a `player.activity` lasting `max(3 s, 2 ticks per stop)`. The client shows an in-car view.
  - On arrival the player is teleported to the destination platform.
  - Walking, interacting or taking damage before departure cancels the ride.
- **World map** (opens with M):
  - one tab per floor level, plus visited pockets;
  - districts drawn from the assembled layouts with names and tiers;
  - tram lines and station dots, with known stations clickable while the player is on a platform;
  - the tracked quest's target district highlighted.

## 5. Pocket dimensions (sub-project 4, direction)

- Pocket levels are ordinary shared, layered levels with `kind: 'pocket'`.
- They are entered through gated anomaly objects using `teleport` plus conditions.
- A visit sets the flag `visited:<levelId>`, which reveals the pocket on the world map.
- Party instancing is deliberately left out until a party system exists.

## Error handling

- A saved location whose level is unknown, or whose tile is unwalkable, falls back through `safeSpawnPoint` to the level spawn or the main-floor spawn.
- A runtime teleport to an unknown district is refused with a warning notice and logged. `findContentIssues` catches this at test time.
- Out-of-interest walk or interaction targets are rejected silently, the same way invalid paths are today.

## Testing

- **Shared:**
  - `assembleLevel`: stamping, void fill, coordinate round-trips and overlap detection;
  - `chunks`: `chunkOf`, `interestSet` and `interestDelta` at edges and corners;
  - integrity checks for overlap, reachability and unique instance ids.
- **Server:**
  - chunk enter and leave on walk and same-level teleport;
  - filtered `world.tick` (a far player receives nothing);
  - spawn and despawn when an entity crosses a boundary;
  - dormancy (an unwatched creature doesn't aggro, but still respawns);
  - out-of-interest walk rejected;
  - the legacy-location record transform.
- **Regression:** the existing `hub`, `combat`, `actTwo`, `crafting`, `groundItems`, `scaling` and `storage` suites are ported to level coordinates and districts, and must pass unchanged in intent. The Atrium→Hydroponics journey becomes a walk.
- **Manual:** run `npm run dev`. Walk from the Atrium into Hydroponics and back, take the service lift to the Undercroft, and complete Orientation Protocol.
