# Architecture

## Principles

1. **The server is authoritative.** Clients send intents (`world.walk`, `world.interact`, `inventory.equip`). The server validates them, simulates, and broadcasts the outcome. A client never decides what it owns or where it stands.
2. **Rules live in `shared`, as pure functions.** Equipping, inventory maths, quest progression, condition checks, pathfinding and character validation take plain data and return new data. The server applies them authoritatively. The client uses the same functions for previews and UI hints (requirement tooltips, quest markers, the derived combat profile) without trusting them.
3. **Content is data, not code.** Items, the new-character kit, NPCs, objects, dialogue, quests, districts and levels are typed records in `packages/shared/src/content`. Behaviour comes from a small vocabulary of **conditions** and **effects**, so most new gameplay needs no new engine code.
4. **One concept per file. Names do the explaining.** The code carries no comments by design. When something needs explaining, rename it or extract a function.

## Data flow

```
 Browser                                   Node server
 ───────                                   ───────────
 input/worldActions ──ClientMessage──▶ net/webSocketGateway (zod-validated)
                                          └─▶ net/messageRouter
                                                ├─ auth/authService
                                                ├─ characters/characterService
                                                └─ gameplay/gameplay ─┬─ dialogueController
                                                                      ├─ interactionController
                                                                      ├─ gearController
                                                                      ├─ chatController
                                                                      ├─ questTracker
                                                                      └─ effectRunner
                                                world/world  (300ms tick: movement, NPC wander, area entry)
 state/worldState ◀──ServerMessage──  world.tick / player.state / dialogue.* / notice
 render/zoneRenderer, hud/*
```

### Protocol (`shared/src/protocol`)

- `clientMessages.ts` holds the **zod schemas**. They are the single source of truth for client-to-server shapes, and the gateway rejects anything that fails to parse.
- `serverMessages.ts` holds a TypeScript discriminated union. Server output is trusted, so it needs no runtime validation.
- Add a message: extend the schema or union, handle it in `messageRouter` (account or roster messages) or `Gameplay.handle` (in-world messages), then listen with `connection.on('<type>', …)` on the client.

### Levels and districts

The world is a handful of continuous **levels** (`content/levels/`): the main floor, the Undercroft, the Deep and three pocket dimensions. A level is assembled from **districts** (`content/districts/`, one hand-built map each) placed at an `origin`. Wide corridors between districts are districts too (`concourses.ts`, `deepCorridors.ts`), so they can carry areas, litter, bridges and names on the map. `LevelDefinition.connectors` still exists for bare corridor maps with no objects.

- District content (map, areas, NPCs, objects, creatures, lights) is authored in **district-local** coordinates. `resolveLevel` (`world/levelLayout.ts`) stamps everything onto one `LevelLayout` and offsets every placement into level coordinates. The result, a `ResolvedLevel`, is what the server and client run on. `GAME_CONTENT.levels` holds them.
- `LevelLayout.districtAt(point)` says which district a tile belongs to, and `toLevelPoint` and `toLocalPoint` convert positions.
- Positions in effects and quests stay district-local (`{ districtId, position }`). `locate(content, districtId, local)` turns one into a `WorldLocation` (`{ levelId, position }`), which is what a character record stores.
- A teleport within the same level moves the player in place without re-entering. A teleport to another level leaves and re-enters.
- An area is identified by its district and area id together, so area ids may repeat across districts.
- `findLevelIssues` (`content/levelIntegrity.ts`) rejects overlapping placements, walkable tiles that cannot be reached from the level spawn (walking, through a same-level teleport, or by tram between platforms on the same level), duplicate instance ids on a level, and spawns, teleports or recoveries that land on an unwalkable tile.
- Legacy character records saved with `{ zoneId, position }` are upgraded on load by `upgradeLegacyLocation`.

### World structure

- **Intake Wing** (tutorial, tier 1) is self-contained and reached only by tram (the Intake Shuttle). Its quests teach every system in order, each step marked in the world: Orientation Protocol (gear, area travel, dialogue), Field Fabrication (gathering, refining, assembly, storage), Live Fire (combat, consumables, resting) and Cleared for Transit (trading, trams). The last one ends on the tram to the Atrium and hands over to The Knocking.
- **Meridian Atrium** is the hub: Requisitions and storage, a Fabrication Hall (stations only, no nodes), the medbay, storyline quest givers, the transit hall and the gates out. Every area is safe and nothing hostile lives there.
- **Beyond the Atrium**, wide concourses lead west to Hydroponics and east to the Service Yards, and the quarantine bulkhead opens north straight into the Sector 2 airlock. On the Deep, the Deep Concourse and Furnace Causeway join Deepwatch to every district on foot; story clearance gates the pressure doors at the far end of each corridor, and each door opens directly into its district. Only the Undercroft (a lift) and the pockets sit off the walking and tram network.
- **Outposts and hostile ground:** each district beyond the hub keeps its friendly NPCs and tram stop in a safe area, and its gathering nodes and creatures outside it.
- **Returning trainees:** `returnUnfinishedTrainee` (`server/src/characters/traineePlacement.ts`) puts anyone with an unfinished tutorial quest back at the Intake start on login, unless their current step is heading to where they already are. The Intake station is `alwaysKnown`, so anyone can ride back to it.

### Doors

A world object with `door: { conditions }` (`shared/src/world/doors.ts`) is a player-bound door set into a doorway between two areas on the same level. Use one instead of a teleport whenever both sides are on one level.

- The shared walkability grid always treats a door as shut, so creatures and anyone without access are blocked.
- A door is open for a player who meets its conditions, or who has opened it before (the `door-opened:<objectId>` flag), so losing a key never traps anyone. `openDoorsOf` lists them, `World.walk` and `approach` path through them, and `SelfState.openDoors` tells the client.
- Interacting with a door walks the player through it (`pathThroughDoor`). The interaction's effects run only on the first opening, and its `failureText` is the locked message.
- The client slides a door into the floor while you stand near one that is open for you. Other players see it shut.
- `findLevelIssues` counts every door as open when checking reachability.

### Safe areas

An area with `safe: true` is non-hostile ground.

- Creatures path, wander and walk home on `LevelInstance.creatureGrid`, which treats safe tiles as walls, so they never enter one.
- A creature never aggroes a player in a safe area, and a creature whose target steps into one gives up and walks home, healing as it would past its leash.
- A player standing in a safe area must step out before they can attack, so nothing is sniped from safety.
- `findSafetyIssues` (`content/safetyIntegrity.ts`) requires every NPC on a floor level to stand in a safe area and every creature to be placed outside one.

### Quest guidance

Quests are either **handheld** or **journal-only**. `isHandheld(quest)` reads `QuestDefinition.handheld` and defaults to true for `tutorial` quests and false for everything else, so set `handheld` on a quest to override its category either way. Only handheld quests put guidance in the world. Journal-only quests are directed by their journal text, the objective tracker and the world map's district outlines.

- A handheld quest draws a walking route on the floor from the player to the nearest objective target (`routeGoals` in `shared/src/quests/questRoute.ts`, planned by the client's `GuidanceRoute` and drawn by `RouteLayer`). It follows the tracked quest when that one is handheld, otherwise the first handheld quest. Targets in the player's own district are tried first. Live NPC and creature positions win over their placements. The route is re-planned when the player changes tile, when quest state or tracking changes, and every 800ms otherwise. Objectives with no world target (`obtainItem`, `equipItem`, `useItem`) and targets on another level draw no route.

The world markers below also appear only for handheld quests, apart from the gold quest-offer marker:

- NPCs show a blue marker when they are an objective and a gold one when they offer a quest (`npcQuestMarker`).
- Objective objects get a pulsing ground ring (`objectiveObjectIds`), including every node and station a `gather` or `craft` objective needs.
- Objective creatures get a red target marker (`objectiveCreatureIds`).
- `enterArea` objectives raise a light beacon in the middle of the target area when it is on the current level (`objectiveAreas`).
- The world map outlines districts holding the tracked quest's objectives (`objectiveDistricts`).

### Pocket dimensions

A pocket is an ordinary shared, layered level with `kind: 'pocket'`: the Threshold, Meridian Below and the Verdant Fold. Pockets are entered through gated objects whose interaction runs a `teleport`. The Verdant Fold opens through an `anomaly` object in the Hydroponics Heart Bed once Overgrowth is complete.

- Every level a player enters sets `visited:<levelId>` (`World` calls `WorldHooks.onLevelEntered` on each spawn). The first visit to a pocket sends a notice.
- The world map lists a pocket as a tab only once it has been visited. Floor levels always have a tab, shown as "Uncharted" until visited.
- Pockets are shared by everyone in the layer. Party instancing waits for a party system.

### Tick model

`World.tick()` runs every 300ms. For each level layer with players it:

1. advances NPC and creature wander paths in **watched** chunks,
2. moves each player one tile along their path and fires `onAreaEntered` for newly entered areas,
3. sends each player their chunk changes and a `world.tick` holding only the movements they can see (see Interest management),
4. resolves pending interactions for players whose path has finished (`onPathCompleted`).

The client interpolates each entity from its previous tile to its new one over one tick.

### Interest management

Levels are split into 32 × 32 tile chunks (`world/chunks.ts`). A player's **interest set** is the 3 × 3 block of chunks around the chunk they last received (`Player.interestChunk`).

- **Broadcasts:** every broadcast is `LevelInstance.broadcastNear(point, message)`, which reaches only players whose interest set contains that point's chunk. This covers chat, combat, gear changes, depletion and ground items.
- **Entering a level:** `world.entered` carries only the entities, ground items and depleted objects in the interest set.
- **Crossing chunks:** `syncInterest` sends `world.chunksLeft`, and the client drops everything in those chunks. It then sends `world.chunksEntered` with the newly visible entities, ground items and depleted objects.
- **Moving entities:** `publishMoves` gives each observer a tick only for entities its client already knows about. It sends `world.entitySpawned` for an entity that comes into view and `world.entityDespawned` for one that leaves.
- **Dormancy:** a chunk is watched while it is in any player's interest set. NPCs and creatures in unwatched chunks don't wander, chase or aggro, but respawn and depletion timers keep running. A creature whose target leaves its interest drops the target. If no one is watching it, the creature is reset at home at full integrity.
- **Range limits:** walk, interact and engage targets must be inside the player's interest set, and the server ignores them otherwise.

### Interactions

When a player clicks an NPC or object, `InteractionController.request` stores a `PendingInteraction` and paths to a tile **cardinally adjacent** to the target. On arrival the player faces the target and the interaction executes:

- **NPC:** opens dialogue.
- **Object:** checks `conditions`, honours `oncePerCharacter` (backed by a character flag), applies `effects`, then raises an `interactedWith` quest event.

### Quests

`shared/src/quests` is pure.

- **Event objectives** (`talkTo`, `enterArea`, `interactWith`, `signal`) count events.
- **State objectives** (`obtainItem`, `equipItem`) are re-read from a `QuestStateProbe` on every evaluation, so dropping an item un-completes them.
- An event advances **only the current step**. Talking to an NPC to finish step 3 never also satisfies a `talkTo` for the same NPC in step 4. State objectives in the new step are evaluated immediately, so steps that are already satisfied chain through.

`QuestTracker` wires the pure engine to players: it applies `onComplete` effects and rewards, and starts follow-up quests.

**Questlines** (`content/questlines.ts`) group quests for the journal. A questline is `main` (a chapter of a storyline, such as Induction or an act) or `side` (a run of related errands), and lists its quests in story order. Every quest belongs to exactly one questline of its own kind (`tutorial` and `main` quests in main questlines, `side` quests in side ones), which `findContentIssues` enforces. The journal shows Main storyline and Side quests sections, each split by questline, and folds away questlines that are finished. Add a new storyline or quest chain by adding a questline.

### Combat

The pure rules live in `shared/src/combat/combatMath.ts`: attack profiles, hit chance, damage rolls, range and sightline checks, and XP per point of damage. `server/src/gameplay/combatController.ts` runs them each tick, after movement:

- **Players:** a player with a `combatTargetId` chases the target until `isWithinAttackRange` (melee needs cardinal adjacency; ranged needs distance and line of sight via `world/lineOfSight.ts`). They then attack every `speedTicks`. Damage awards XP quietly through `EffectRunner.awardExperience`.
- **Creatures:**
  - Aggressive creatures pick the nearest visible player inside `aggroRadius`.
  - Any creature retaliates when attacked.
  - A creature dragged past `leashRadius` walks home and heals.
  - A defeated creature plays a death animation for 3 ticks, despawns, and respawns after `respawnTicks`. Loot rolls go straight to the killer's inventory, and a `defeated` quest event fires.
- **Incapacitation:** an incapacitated player is moved to the `recovery` location of the district they fell in (or the level spawn) at full integrity.
- **Regeneration and auto-retaliate:** integrity regenerates 1 point every 20 ticks once out of combat. A player who is idle when attacked fights back automatically.

Creatures are content (`content/creatures.ts`) placed through `DistrictDefinition.creatures`. Consumables are `item.consumable`. Quests use `defeat` and `useItem` objectives.

### Weapons

A weapon is `equipment.weapon`: a `kind`, a `range` and `speedTicks`. `WEAPON_KIND_INFO` in `shared/src/combat/weapons.ts` gives each kind its style, grip, attack motion, projectile and damage scale:

| Kind | Grip | Style | Motion | Projectile | Notes |
| --- | --- | --- | --- | --- | --- |
| knife | one-handed | melee | stab | | 3 ticks, light hits (×0.75) |
| baton | one-handed | melee | strike | | |
| blade | one-handed | melee | slash | | |
| maul | two-handed | melee | slam | | |
| polearm | two-handed | melee | lunge | | reach 2 in a straight line (×0.9) |
| pistol | one-handed | ranged | snap shot | dart | |
| carbine | two-handed | ranged | shoulder shot | bolt | |
| rifle | two-handed | ranged | heavy shot | tracer | 7 ticks, range 9 (×1.35) |
| scattergun | two-handed | ranged | blast | pellets | range 3 (×1.15) |

- **Damage scale** multiplies the rating before it becomes a max hit, so fast weapons hit lighter and slow ones harder. `weapons.test.ts` keeps damage per tick within a band across kinds.
- **Reach:** a melee weapon with `range` above 1 hits targets up to that many tiles away in a straight cardinal line, with line of sight.
- **Two-handed grip:** wielding one returns the `secondary` item to the inventory, and equipping a secondary item lowers a two-handed weapon (`slotsFreedFor` in `gear/equipment.ts`).
- **Client:** `combat.hit` carries the attacker's `weapon`. `render/models/weaponPoses.ts` holds the idle grip and per-motion arm poses for `CharacterRig`, `entityRig.ts` sets each motion's duration, and `ProjectileLayer` draws each projectile kind with its own shape, flight speed, muzzle flash and impact.

On the client, `render/models/creatureModels.ts` builds a voxel rig per `CreatureModel`. Every rig implements `EntityRig`, so the renderer can drive attack, hurt and death animations from `combat.hit` and `combat.death` messages. `hud/combatOverlay.ts` draws hit splats and overhead bars, and `hud/vitalsPanel.ts` draws your integrity and the target panel.

### Scaling and fairness

- **Layers:** `World` keeps a list of `LevelInstance` layers per level. `spawn` places a player in the busiest layer that still has room under the level's `capacity` (default 50; tests can override it with `levelCapacity`). When every layer is full it creates a new one, and empty overflow layers are retired after about 60 seconds. Use `world.levelOf(player)`, `world.districtOf(player)` and `world.instances()`; never look a level up by id.
- **Single-way combat:** `CombatController` pairs a player and a creature with `engagedWith` for `ENGAGEMENT_TICKS` (about 3.6 seconds) after every swing.
  - Outside multi-combat areas, `engage` refuses a creature that is engaged with someone else, and a player who is under attack by a different creature.
  - Aggression skips players who are already engaged.
  - An area becomes multi-combat with `multiCombat: true` on its `AreaDefinition`. The rule is decided by the creature's position.
- **Credit:** a creature remembers every player who damaged it (`contributors`). When it dies, each contributor present gets the `defeated` quest event, kill XP (`defeatExperience`) and an independent loot roll. Shared quest targets like the Hollow Warden therefore never block a crowd.
- **Respawn:** `scaledRespawnTicks` shortens respawns by 15% per extra player in the layer, down to a floor of 35% of the base time.

### Ground items

Each `LevelInstance` holds a `groundItems` map. `GroundItemController` creates them for creature loot, the inventory "Drop" action, and overflow from a full inventory (`EffectHost.dropToGround`).

- **Private, then public:** an item starts owned and visible only to its owner. After `OWNER_PRIVACY_TICKS` (200 ticks, 60 s) it goes public and is announced to everyone in the layer. It is removed after `GROUND_LIFETIME_TICKS` (600 ticks, 3 min).
- **Messages:** `world.groundItemAdded` and `world.groundItemRemoved` are sent only to players allowed to see the item. `world.entered` includes the items visible to the arriving player.
- **Pickup:** a `groundItem` pending interaction walks the player onto the item's tile, then calls `pickup`. Anything that doesn't fit stays on the floor.
- **Client:** `render/items/groundItemLayer.ts` renders each item from its voxel model, with a gold halo if it's yours and cyan if it's public.

### Gathering and crafting

- **Shared rules** live in `shared/src/crafting`:
  - `GatheringSource` and `gatherChance`;
  - `RecipeDefinition`, `craftingBlocker`, `craftOnce` and `STATION_INFO`;
  - `tierForLevel`, which maps a skill level to a world tier (1, 5, 8, 12, 16, 20, 25 and 30 start tiers 1–8).
- **Content:** a resource node is a world object whose interaction carries `gather`. A station is a world object whose interaction runs the `openCrafting` effect. Recipes live in `content/recipes.ts`, keyed `station:output`.
- **Server:**
  - `GatheringController` and `CraftingController` drive a repeating `player.activity` on the tick.
  - Walking, interacting, teleporting or leaving cancels it.
  - Node charges and depletion are per `LevelInstance` layer, broadcast near the node as `world.objectDepleted` and included in `world.entered` and `world.chunksEntered`.
  - The server re-validates the open station, skill level and materials on every craft.
- **Quests** use `gather` and `craft` objectives. The matching `gathered` and `crafted` events carry counts.
- **Integrity:** `findCraftingIssues` (`content/craftingIntegrity.ts`) enforces the crafting rule. Every equipment and consumable item needs a recipe at the right station, at or above the item's equip requirement. Every ingredient must trace back to a node or creature drop placed in a district whose `tier` is no deeper than the item's tier. A node must not need more Salvage than its district's tier allows.

### Trams and the world map

The tram network is content (`content/tramNetwork.ts`): **stations** (a district, the area that counts as the platform, and an arrival tile) and **lines** (ordered station lists). `buildTramNetwork` resolves each station onto its level as `GAME_CONTENT.tram`. The pure rules live in `shared/src/world/tram.ts`.

- **Discovery:** entering a station's area sets the flag `tram:<stationId>`, and so does the `discoverStation` effect. A station with `alwaysKnown: true` (the Intake Transit Bay) is known to everyone. `SelfState.discoveredStations` lists them for the client.
- **Stops:** a `tram-stop` object runs the `openTramMap` effect, which sends `tram.mapOpened` for the station the player is standing in.
- **Riding:** `tram.board { destinationStationId }` is refused unless the player stands in a station area and has found the destination. Any two stations joined through the network qualify, including the Deep Line between the main floor and the Deep. `TramController` then runs a `player.activity`:
  - **Boarding** lasts `TRAM_BOARDING_TICKS`. Walking, interacting, teleporting or taking damage cancels it.
  - **Riding** lasts `tramRideTicks(stops)`: at least 3 seconds, plus 2 ticks per stop beyond that. The rider stays put, every intent except chat is ignored, and creatures drop and ignore them. The client shows the in-car view between `tram.departed` and `tram.arrived`.
  - **Arrival** teleports the rider to the destination platform. A rider who disconnects mid-ride is saved at the destination.
- **World map** (`hud/worldMap.ts`, the M key or the minimap's Map button): a full-screen map that pans (drag), zooms (wheel, pinch or the buttons) and recentres on you, with a level dropdown listing every floor level, disabled as "Uncharted" until visited (the `visited:<levelId>` flag, listed in `SelfState.visitedLevels`). It draws each level from its assembled layout with district names and tiers, tram lines and stations, and the player. Districts holding the tracked quest's objectives (`objectiveDistricts`) are outlined. A tram stop opens the same map in transit mode, with a destinations sidebar (a bottom sheet on narrow screens) listing each line and a Ride button per reachable stop. Known stations are also tappable on the map.
- **Integrity:** `findTramIssues` checks that each station resolves to a placed district and area, has a walkable platform inside that area and a tram stop, and is on a line. It also checks that lines only list known stations and that every tram stop sits inside a station area.

### Multi-tile assemblies

Anything bigger than one tile, such as a tram car or a bridge, is an **assembly** (`shared/src/world/assemblies.ts`, content in `content/assemblies.ts`). It is a grid of single-tile pieces, and each piece is an ordinary world object with its own voxel model, built so its edges meet its neighbours exactly.

- **Definition:** `pieces` maps one character to `{ objectId, turns }`, and `layout` draws the grid in rows like a district map, with a space for an empty cell. `turns` rotates a piece by quarter turns, so one model covers both sides of a symmetric object (the far side of a tram car is the near side turned twice). Pieces that are mirror images, like the two noses of a tram car, need two models.
- **Stretching:** `stretchRow` names a row that repeats `span` times when placed, so one bridge or catwalk definition fits any gap.
- **Placement:** a district lists `assemblies: [{ instanceId, assemblyId, position, facing, span }]`. `position` is the top-left tile of the placed (rotated) footprint. `resolveLevel` expands each one into object placements with instance ids `<instanceId>/<column>,<row>`, so the server, the client and the integrity checks only ever see single-tile objects.
- **Decks:** a world object with `deck: true` makes its tile walkable even over a gap (void or coolant). Bridges and catwalks are built from decks. Every walkability grid comes from `createObjectWalkabilityGrid`, which applies blocking objects and decks together.
- **Floor scatter:** `render/world/floorScatter.ts` sprinkles pebbles, grit, flakes, bolts, leaves and tufts over floor tiles per chunk, seeded by tile so it never changes, to break up flat textures. Tiles holding an object are left clear.
- **Litter:** floor clutter (`content/litterObjects.ts`, including rubble and gravel piles) is ordinary objects with `blocksMovement: false` and no interactions. Objects without interactions are never picked, so clicks fall through to the tile underneath. The `cable-run` assembly stretches litter across several tiles.
- **Integrity:** `findAssemblyIssues` checks that each layout is rectangular, uses only known pieces and objects, and has a valid stretch row, and that every placement names a known assembly with a sensible span. Expanded pieces count towards the "two objects share a tile" check.

### Personal storage

`shared/src/gear/storage.ts` holds the pure `deposit`, `depositAll` and `withdraw` rules. `CharacterRecord.storage` is a list of stacks. Everything stacks there, up to `STORAGE_CAPACITY` (200) different items, and quest items are refused. A world object with the `openStorage` effect opens a session (`player.storageOpen`). Walking, interacting or teleporting closes it. The server ignores storage messages unless a session is open.

### Gear on the character model

An equipped item is drawn on the character from its `icon` shape. The inventory sprite comes from the same shape, so the two cannot disagree.

- `EQUIPMENT_SHAPES` in `shared/src/gear/slots.ts` lists the shapes each slot accepts. `findContentIssues` rejects an item whose icon is not one of its slot's shapes.
- `characterModel.ts` keeps one renderer per shape in records typed `Record<GearShape<slot>, …>`, so adding a shape without a renderer fails the typecheck.
- Bodies come from `BUILDS[physique][bodyType]`: shoulder, waist and hip widths, plus a bust for female builds. Torso armour is laid one voxel outside the body profile, so it follows the silhouette underneath.

### Economy

`shared/src/economy/shop.ts` holds the pure buy and sell rules (`purchase`, `sale`, `sellPrice`). Shops are content (`content/shops.ts`), and an NPC gets a "Trade" action through `shopId`. Dialogue can open a shop with the `openShop` effect. `ShopController` holds one session per player, checks that the keeper is still close by, and closes the session when the player walks or teleports.

### Item sprites

`render/items/itemModels.ts` builds a voxel model per `ItemIconShape`, colored from the item's gear visual where it has one. `render/items/itemSprites.ts` renders each model once, in an offscreen WebGL context, into a cached data URL. That URL becomes the inventory, loadout, shop and creator icon.

### Dialogue

A `DialogueDefinition` has ordered `entries`. The first entry whose conditions pass picks the start node, which lets one NPC react to quest state. Nodes can apply effects on entry. Options can be gated by conditions and can apply effects. Text supports the `{name}`, `{subject}`, `{object}` and `{possessive}` templates. The `talkedTo` quest event fires **after** the entry is chosen, so the dialogue for the current step is the one shown.

### Persistence

`node:sqlite` stores accounts, sessions and characters. A character is one JSON `record` column holding a full `CharacterRecord`. Schema changes are appended to `MIGRATIONS` in `persistence/database.ts`, which tracks the version with `PRAGMA user_version`. Online characters autosave every 60 seconds and save on disconnect.

To move to Postgres, re-implement the three repository classes. Nothing else touches SQL.

### Client rendering (Three.js voxels)

Everything in the world is built procedurally from voxels at runtime; there are no model or texture assets. One world unit is one tile. Tile `(x, y)` maps to world `(x, 0, y)`.

| Scale | Voxel size | Used for |
| ----- | ---------- | -------- |
| 8 per tile | 1/8 | Level floors and walls (`world/zoneVoxels.ts`). Walls are 16 voxels (2 units) tall. |
| 16 per tile | 1/16 | World objects (`models/objectModels.ts`) |
| 20 per unit | 1/20 | Characters (`models/characterModel.ts`), about 32 voxels tall |

- **`voxel/`** is the engine.
  - `VoxelModel` is a sparse builder with `fill`, `set` and `paintExisting`.
  - `DenseVolume` is a flat level grid.
  - `meshVoxels` turns either one into geometry. It culls hidden faces and bakes per-vertex ambient occlusion.
  - Voxels have three kinds: `solid` (lit), `emissive` (unlit, so it feeds bloom) and `glass` (transparent). Each kind becomes its own mesh with shared materials from `voxelMaterials.ts`.
- **`world/levelScene.ts`** streams the level in 32 × 32 tile chunks (`world/chunkView.ts`). The chunk under the camera is built synchronously, its eight neighbours one per frame, and chunks more than two away are disposed. Each chunk paints a `DenseVolume` covering its tiles plus a one-tile margin (`buildTileVolume`, so faces and ambient occlusion match across seams), meshes its floor, and meshes each wall, glass and door tile as its own group so it can **cut away** (fade) walls between the camera and the player. It hangs **ceiling light fixtures** automatically, spaced across each area: an emissive panel plus a point light raised high enough not to wash out heads, faded with the cutaway when it would block the view. A fixture inside a district whose `ambience.fixtures` is `'failing'` gets flickering, partly dead fixtures instead. Chunks also place object models, animate their moving parts, and contribute light sources.
- **Ambience** (`world/ambienceBlend.ts`): the renderer averages the darkness, tint and fog of every district or connector tile within 3 tiles of the camera focus, then eases toward it, so crossing a district boundary blends over about 6 tiles.
- **Minimap** (`hud/minimap.ts`): names nearby districts at their centres, and pins the names of districts outside the view to its rim in their direction.
- **`models/characterModel.ts`** builds an articulated `CharacterRig` (legs, torso, head and arms on pivots) from `CharacterAppearance` and equipped gear visuals. Geometry is cached per look, so NPCs that look the same share it.
- **`gameRenderer.ts`** handles:
  - renderer setup: ACES tone mapping, soft shadows from a key light that follows the focus, a hemisphere fill, and a pool of 8 point lights reassigned to the nearest sources;
  - bloom post-processing;
  - entity sync and interpolation;
  - quest markers and hover, self and click markers;
  - raycast picking: entities, then objects, then walls block, then the ground plane resolves to a tile.
- **`cameraRig.ts`** is the orbit camera. Drag or middle-drag orbits, Q/E or the arrow keys rotate and tilt, the wheel zooms, and Home resets.
- **`portraitStudio.ts`** is one shared offscreen WebGL renderer that draws every `AvatarPreview` (creator, roster, dossier) into its own 2D canvas. It avoids exhausting browser WebGL contexts.

To add a look:

- **New assembly piece:** add a builder to `models/assemblyModels.ts`. Leave out the placement seed and draw edges that continue across the tile border, so neighbouring pieces join without a seam. Use `canvasOf(model, true)` to get a mirror-image piece.
- **New object:** add a builder to `objectModels.ts` keyed by `WorldObjectModel`. `heightVoxels` sizes its hover ring and light. Use `modelScale` on the definition for oversized props.
- **New gear model:** handle the `visual.model` in `characterModel.ts`. Torso, head and visor models go in the part builders, held items in `addHeldItem`.

The HUD is plain DOM (`ui/dom.ts` → `h()`), with one class or factory per widget in `hud/`. `hud/interactionBubble.ts` is the cursor-following hover bubble: primary action, NPC title, objective tag, and left/right-click hints. `hud/speechLayer.ts` projects overhead chat into screen space.
