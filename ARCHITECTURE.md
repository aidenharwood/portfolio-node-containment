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

The world is a handful of continuous **levels** (`content/levels/`): the main floor, the Undercroft, the Deep and four pocket dimensions. A level is assembled from **districts** (`content/districts/`), each drawn from a blueprint and placed at an `origin`. The space between districts is made of districts too (the Circuit, the concourses, the causeways, the Deep Concourse), so it can carry areas, props, bridges and names on the map. `LevelDefinition.connectors` carries bare maps with no objects; the main floor uses one for the tram trackway between districts (`world/trackway.ts`).

`WORLD_DESIGN.md` holds the rules for how the world is shaped, drawn and populated.

- **Blueprints** (`world/blueprint.ts`): `drawBlueprint` turns a list of steps (`room`, `link`, `exit`, `patch`, `pillars`, `track`, `hollow`) into the tile map plus named `rooms` and `exits`. Walls are never drawn; every void tile touching floor becomes one. Painted tiles are applied last, over walls too. `plan.at(room, dx, dy)` gives a district-local point and throws if it is not floor, and `plan.scatter` gives deterministic free tiles for bulk placement.
- **Layouts** (`world/layout.ts`): every district is a JSON file, `content/districts/layouts/<district-id>.json`, checked against `DISTRICT_LAYOUT_SCHEMA` (`world/layoutSchema.ts`) when it loads. It holds the blueprint `steps`, a sparse layer of painted `tiles`, every placement (areas, anchors, objects, assemblies, NPCs, creatures, lights, decals, set-pieces) and the dressing settings. Positions are room-relative (`{ room, dx, dy }`) unless they sit in an exit, in a link or in no room. `buildDistrict` draws the blueprint, resolves the positions and calls `furnish`, which lays the set-pieces and stands a generated crowd in safe rooms (it adds no furniture of its own); a bad file fails with the district id and the JSON path. `printLayout` writes the one canonical form, and a test keeps every file in it. Each module in `content/districts/` only loads its file and exports the district, its anchors (`anchorsOf`) and any hollow origin a level needs (`firstHollowOf`).
- **Viewing** (`world/planModel.ts`, `client/src/editor/`): `npm run plan -- <district> [room]` prints a district as text with its issues. The dev-only page `/editor.html` shows it as a 2D plan beside a free-camera 3D view built on the game's own renderer (`LevelScene`, `render/sceneLook.ts`), lists every issue `findContentIssues` reports for it and marks them on both views. The view lives in the URL, so a link reopens it exactly.
- **Editing** (`client/src/editor/`): the same page is a region editor. Its Edit mode changes any district through pure edits (`edits.ts`), each of which rebuilds the district and refuses a change that would not load (a placement on a wall, a room shrunk past what stands in it, a room other things still name). An `EditorDocument` holds the edited layouts with undo and redo. Clicks become edits in `EditController`; `hitsAt` decides what a click selects, and generated dressing leads back to its room's settings. Saving posts to a dev-only Vite endpoint (`editorSave.ts`), which validates and builds the layout, writes it with `printLayout`, and stops Vite reloading the page so undo survives. Check runs `findContentIssues` on `contentWith(...)`: the game content with the edited districts swapped in and every level re-stitched.
- **Level recipes** (`content/levels/`): each level file exports `<LEVEL>_RECIPE`, a function of a `LevelContext` (`districtOf`, `hollowOf`), and its constant is that recipe run on `SHIPPED_CONTEXT`. `LEVEL_RECIPES` lists them, so the editor can re-stitch a level from edited districts. Choosing a level in the editor shows and edits all its districts in place.
- **Joining** (`world/levelPlan.ts`): `joinDistricts` works out origins from the exits districts attach by. A district that surrounds another (the Circuit around the Atrium, the Deep Concourse around Deepwatch) keeps a `hollow` for it and is placed by offset.
- **Anchors:** a district names the points other content needs (tram platform, teleport landings, spawn, recovery) in `anchors`. Level spawns, tram stations, teleports and tests read those.
- `findWorldDesignIssues` (`content/worldDesignIntegrity.ts`) enforces the checked rules of `WORLD_DESIGN.md`: blueprint-drawn maps, placements inside rooms, exit widths, no floor open to the void, two ways in, creature density, tier rising with distance, each tram line's stations joined by one connected run of drawn track, and doors, lifts and wall fixtures standing against a wall.
- `findPlacementIssues` (`content/placementIntegrity.ts`) enforces the placement rules of `WORLD_DESIGN.md` against the furnishing catalogue (`content/furnishingCatalogue.ts`): every room names a theme, props stand only in rooms they belong in, each room holds a signature piece, doorways stay clear, backed pieces back onto something, seats face what they serve, nothing repeats on a fixed pitch, and anything players use stays reachable. It reads openings and walls off the assembled level, so a hollow or a neighbouring district counts. `findDistrictPlacementIssues` checks one district.

- District content (map, areas, NPCs, objects, creatures, lights) is authored in **district-local** coordinates. `resolveLevel` (`world/levelLayout.ts`) stamps everything onto one `LevelLayout` and offsets every placement into level coordinates. The result, a `ResolvedLevel`, is what the server and client run on. `GAME_CONTENT.levels` holds them.
- `LevelLayout.districtAt(point)` says which district a tile belongs to, and `toLevelPoint` and `toLocalPoint` convert positions.
- Positions in effects and quests stay district-local (`{ districtId, position }`). `locate(content, districtId, local)` turns one into a `WorldLocation` (`{ levelId, position }`), which is what a character record stores.
- A teleport within the same level moves the player in place without re-entering. A teleport to another level leaves and re-enters.
- An area is identified by its district and area id together, so area ids may repeat across districts.
- `findLevelIssues` (`content/levelIntegrity.ts`) rejects overlapping placements, walkable tiles that cannot be reached from the level spawn (walking, through a same-level teleport, or by tram between platforms on the same level), duplicate instance ids on a level, and spawns, teleports or recoveries that land on an unwalkable tile.
- Character records store their location district-local, `{ districtId, position }` (`server/src/characters/storedLocation.ts`), so districts can move on a level without moving anyone. `restoreLocation` resolves it on load, and also accepts older records saved in level coordinates or as `{ zoneId, position }`. A stored position that is no longer walkable (every district was redrawn in the world redesign) returns the character to that district's `recovery` point, and failing that to the main-floor spawn.

### Regions and the overworld

The main floor is the **overworld**: one continuous level that grows outward from the Atrium, with dungeon floors below and pocket dimensions as instances. A **region** (`content/regions.ts`) is a wing of it: every district names its `region`, and a region names its outpost `hubDistrictId`. The home region is the one holding the new-character start.

- `findRegionIssues` (`content/regionIntegrity.ts`) requires every district to be in a known region and every outpost to have a storage locker and a shopkeeper in a safe area. Outposts away from home also need an exchange mailbox and a contract board.
- `findOverworldIssues` (`content/overworldIntegrity.ts`) requires every district on the overworld to be reachable on foot from its spawn, counting doors and same-level passages but not trams. Only districts marked `reachedOnlyByTram` (the Intake Wing) are exempt, so trams stay shortcuts.
- The player marketplace posts orders only at the Atrium exchange (`openMarket`, access `trade`). An exchange mailbox (`market-mailbox`, access `collect`) may stand only in a regional outpost; it collects and withdraws orders but cannot post them. The server checks both.
- Entering a district sets `visited-district:<districtId>`. The world map draws districts the player has never entered dark and "Uncharted", and labels regions over their districts when zoomed out.
- `npm run bench:tick [players…]` measures the tick with that many players wandering on one layer of the main floor. Run it before raising a level's `capacity`.

### World structure

- **Intake Wing** (tutorial, tier 1) is self-contained and reached only by tram (the Intake Shuttle). Its quests teach every system in order, each step marked in the world: Orientation Protocol (gear, area travel, dialogue), Field Fabrication (gathering, refining, assembly, storage), Live Fire (combat, consumables, containment, resting) and Cleared for Transit (trading, trams). The last one ends on the tram to the Atrium and hands over to The Knocking.
- **Meridian Atrium** is the hub: Requisitions and storage, a Fabrication Hall (stations only, no nodes), the medbay, storyline quest givers, the transit hall and the gates out. Every area is safe and nothing hostile lives there.
- **The Circuit** is a ring boulevard around the Atrium, with a court at each corner and dormitory, canteen, stores and office blocks along its west and east sides. The Atrium's Verdance and Service gates open onto it. Sector 2 sits inside the ring north of the Atrium and is reached only through the quarantine bulkhead, so the story gate holds.
- **Beyond the Circuit**, the Verdance Concourse leads west to Hydroponics and the Service Concourse east to the Service Yards, each a boulevard with side rooms. The Service Yards' Moss Culverts open north into the Waterworks, a tier 3 district with its own Pump House outpost and the Waterworks side questline. The Intake Wing lies south across a chasm.
- **The Deep** is a ring: the Deep Concourse circles a chasm, Deepwatch stands on an island in the middle joined by four spans, the Cryovault (west), Signal Array (south) and Drowned Archive (east) sit behind story-gated pressure doors on the ring's outer edge, and the Furnace Causeway runs north to the Furnace. The Deep Line is a lift, not a tram: it joins the Atrium transit hall to Deepwatch. Only the Undercroft (a lift) and the pockets sit off the walking, lift and tram network.
- **Tram track** is drawn, and it connects: a line's stations share one connected run, which may branch, end in a buffer or run on toward reserved ground, and need not close. Track runs straight through each platform room, and bridges carry walkways over it.
- **The Calder Wing** (tiers 10–11) is the first overworld region beyond the core. The Waterworks' Outfall opens east onto the Calder Causeway, which turns south down the Salt Road into the Brine Galleries; the Calder Gatehouse outpost sits behind a story door (`calder.gate-open`), and the Salt Cathedral beyond it has a story-gated nave (`calder.nave-open`). The gatehouse is a stop on the Meridian Line, and its gallery lift drops to the Calder Deeps (`calder-deeps`), a dungeon floor that opens once Salt of the Earth is done. Act IV runs through it.
- **The Vesper Wing** (tiers 12–13) lies west of Hydroponics, whose seed vault opens onto the Sanatorium Walk, which climbs north up the Sanatorium Rise into the Vesper Wards. The Porter's Lodge outpost sits behind a story door (`vesper.gate-open`), the Vesper Pharmacy beyond it has a story-gated surgery (`vesper.surgery-open`), and the lodge's bed lift drops to the Cold Ward (`vesper-cellars`) once Night Rounds is done. The lodge is the western end of the Meridian Line.
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

Every world guide follows one quest: the tracked quest, or the first active quest (tutorial, then main, then side) when nothing is tracked (`trackedQuest` in `shared/src/quests/questGuidance.ts`). Only one quest is ever tracked: `QuestTracking` holds a single quest id, and tracking another quest replaces it. Tracking lives on the client per character, and changing it re-derives the markers and re-plans the route at once. The HUD objective tracker shows only the tracked quest too. Other active quests stay in the journal (`activeQuests`) but put nothing in the world.

- The tracked quest draws a walking route on the floor from the player to the nearest objective target (`routeGoals` in `shared/src/quests/questRoute.ts`, planned by the client's `GuidanceRoute` and drawn by `RouteLayer`). Targets in the player's own district are tried first. Live NPC and creature positions win over their placements. The route is re-planned when the player changes tile, when quest state or tracking changes, and every 800ms otherwise. When no target can be reached on foot, `planTransit` (`shared/src/quests/questTransit.ts`) searches the walkable regions of every level (`walkRegions`) joined by `transitHops`: tram rides to discovered stations and teleport objects the player may use (`SelfState.openPassages`, from `isPassageOpenFor`). The route then leads to the first tram platform or lift on the way, and the objective tracker says what to take next. Objectives with no world target (`obtainItem`, `equipItem`, `useItem`) draw no route.

The world markers below also follow only the tracked quest, apart from the gold quest-offer marker:

- NPCs show a blue marker when they are an objective and a gold one when they offer a quest (`npcQuestMarker`).
- Objective objects get a pulsing ground ring (`objectiveObjectIds`), including every node and station a `gather` or `craft` objective needs.
- Objective creatures get a red target marker (`objectiveCreatureIds`).
- `enterArea` objectives raise a light beacon in the middle of the target area when it is on the current level (`objectiveAreas`).
- The world map outlines districts holding the tracked quest's objectives (`objectiveDistricts`).

### Pocket dimensions

A pocket is an ordinary shared, layered level with `kind: 'pocket'`: the Threshold, Meridian Below, the Verdant Fold and the Dead Letter Office. Pockets are entered through gated objects whose interaction runs a `teleport`. The Verdant Fold opens through an `anomaly` object in the Hydroponics Heart Bed once Overgrowth is complete. The Dead Letter Office opens through the return chute in the Signal Array's Operator Pit once Achterberg traces the ninth letter (Act III).

- Every level a player enters sets `visited:<levelId>` (`World` calls `WorldHooks.onLevelEntered` on each spawn). The first visit to a pocket sends a notice.
- The world map lists a pocket as a tab only once it has been visited. Floor levels always have a tab, shown as "Uncharted" until visited.
- Pockets are shared by everyone in the layer. Party instancing waits for a party system.

### Tick model

`World.tick()` runs every 300ms on `startTickTimer`, which schedules each tick against a fixed grid so the cadence does not drift the way `setInterval` does. For each level layer with players it:

1. advances NPC and creature wander paths in **watched** chunks,
2. moves each player one tile along their path and fires `onAreaEntered` for newly entered areas,
3. sends each player their chunk changes and a `world.tick` holding only the movements they can see (see Interest management),
4. resolves pending interactions for players whose path has finished (`onPathCompleted`).

The client plays each step from the previous tile to the new one over one tick (`state/motionPlayback.ts`):

- **`TickClock`** learns the server's tick phase from `world.tick` arrivals, so each step is timed on the tick grid rather than on its jittery arrival time. It keeps a decaying envelope of how late ticks arrive.
- **`Motion`** queues each entity's steps. Rendering runs behind real time by the clock's delay (at least 10ms, at most a third of a tick), so on a normal link the next step is already queued when the current one ends. Walking stays continuous and the walk pose holds across tiles. A step that arrives later than that starts from where the entity stands rather than jumping ahead.
- `entity.to` is always the latest authoritative tile for game logic; `entity.motion` is only for drawing.

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

- **Players:** a player with a `combatTargetId` chases the target until `isWithinAttackRange` (melee needs cardinal adjacency; ranged and psionic need distance and line of sight via `world/lineOfSight.ts`). They then attack every `speedTicks`. Damage awards XP quietly through `EffectRunner.awardExperience`.
- **Creatures:**
  - Aggressive creatures pick the nearest visible player inside `aggroRadius`.
  - Any creature retaliates when attacked.
  - A creature dragged past `leashRadius` walks home and heals.
  - A defeated creature plays a death animation for 3 ticks, despawns, and respawns after `respawnTicks`. Loot rolls go straight to the killer's inventory, and a `defeated` quest event fires.
- **Incapacitation:** an incapacitated player is moved to the `recovery` location of the district they fell in (or the level spawn) at full integrity.
- **Regeneration and auto-retaliate:** integrity regenerates 1 point every 20 ticks once out of combat. A player who is idle when attacked fights back automatically.

**Combat triangle:** melee beats ranged, ranged beats psionic, psionic beats melee. `COMBAT_STYLE_INFO` in `weapons.ts` gives each style its skill (Close Quarters, Marksmanship, Psionics), offence stat (Power, Accuracy, Focus), defence stat (Armor, Deflection, Cognitive Ward) and armour line (Bulwark, Skirmisher, Warden). A creature attack rolls against the player's defence for its style (`defenceAgainst`). A creature's optional `guard` names the line it fights like: `creatureDefence` raises its Defence against the styles that line resists and lowers it against the style that beats it, and `weaknessOf` derives the weakness that study exploits. Creatures without a guard are neutral.

Creatures are content (`content/creatures.ts`) placed through `DistrictDefinition.creatures`. Consumables are `item.consumable`. Quests use `defeat` and `useItem` objectives.

**Footprints:** a creature's `size` is 1 or 2 (`shared/src/world/footprint.ts`), and its `position` is the north-west tile of its footprint.

- Range, melee adjacency, aggro distance, line of sight and `CONTAINMENT_REACH` are measured between the nearest tiles of two bodies (`isBodyWithinAttackRange`, `bodyDistance`). Nobody attacks from inside a body, so a player standing under a 2×2 creature steps out first.
- Creatures path on `LevelInstance.creatureGridFor(size)`, where a tile is open only when the whole footprint fits, so a 2×2 cannot use a 1-wide gap.
- **Body blocking:** creature bodies block other creatures, never players. `LevelInstance` keeps a body occupancy map, rebuilt each tick and updated on every creature move. Paths plan around 2×2 bodies; a creature whose next step is held by another body waits a tick and repaths around every body.
- Wander never stops on a chokepoint (`isWanderDestination`), and respawns and summons take the nearest free anchor (`freeAnchorNear`).
- Loot from a large creature drops on its footprint tile nearest the killer. The client centres and scales the rig by size (`WorldState.bodyPosition`).

### Containment

Bosses are anomalous specimens. A creature with `containment` (a `ContainmentProfile`: object class Safe, Euclid or Keter, special containment procedures, containment XP and bonus loot) can be contained instead of killed. The pure rules live in `shared/src/combat/containment.ts`.

- **Seals:** an item with `containmentSeal: { tier }` (`content/containmentSeals.ts`, Mk.I to Mk.IX). Each is assembled at a fabricator from two refined parts of its tier and trains Containment. A seal holds a specimen of its tier or lower, and `sealFor` spends the lowest one that fits.
- **Rules:** `containmentBlocker` needs Containment at or above the specimen's level, a seal rated for `tierForLevel(level)`, and the specimen at or below a tenth of its integrity (`containmentThreshold`).
- **Server:** `world.interact` on a creature with `CONTAIN_INTERACTION` calls `CombatController.contain`, which validates, chases into `CONTAINMENT_REACH` with line of sight, spends the seal and defeats the creature with `containedBy`. Everyone credited gets the normal defeat rewards; the container also gets the profile's XP and loot and a `contained` quest event (the `contain` objective).
- **Pulled blows:** while a player could contain their target, their hits never take it below 1 integrity, and once it is weakened they hold fire with a notice. Attacking a weakened specimen again (`finishingTargetId`) finishes it normally.
- **Client:** the context menu adds Contain, examine shows the object class and procedures, and the target panel shows the class, a threshold tick and a Contain button gated by the same shared rule. A contained creature spins down inside a shrinking field instead of falling.
- **Integrity:** `findContainmentIssues` requires a seal for every tier, seal recipes that train Containment with inputs found by their tier, and a seal for every containable creature's tier. A unique item in containment loot must also be a rare regular drop.

### Boss encounters

A creature's optional `encounter` (`shared/src/combat/encounters.ts`) lists typed mechanics and integrity phases. Bosses have no bespoke code.

| Mechanic | What it does |
| --- | --- |
| `telegraph` | Marks tiles (`line`, `cone`, `ring`, `body`, `circleOnTarget`) for `windupTicks`, then rolls an attack against every player still on them. |
| `summon` | Adds transient creatures near the boss, once or every `everyTicks`, up to `maxAlive`. Adds give XP, drop no loot and never respawn. |
| `hazard` | Seeds tiles near the boss that spread over the fight and burn players on them for a flat `damagePerTick`. |
| `enrage` | Divides the attack interval by `speedFactor` once `afterTicks` have passed. |

- **Phases:** each `EncounterPhase` starts below a fraction of integrity, can swap `attack` and `guard`, and `enables` mechanics that start inactive. Phases only advance within a fight.
- **Server:** `EncounterController` runs from `CombatController.updateCreature` while the boss has a target, starting at most one telegraph at a time. Telegraphs and hazards hit every player on their tiles and ignore single-way combat. Losing the target, walking home, a reset at home, defeat, containment, or the boss's chunk going unwatched all clear the encounter and despawn its adds.
- **Protocol:** `encounter.telegraph`, `encounter.resolved`, `encounter.hazard`, `encounter.phase`, `encounter.enraged` and `encounter.cleared`. Snapshots carry `phase` and `enraged`, and a player whose interest gains a boss mid-fight is sent its live telegraphs and hazards.
- **Client:** `render/encounterLayer.ts` fills telegraph tiles towards impact and colours hazards by kind. The target panel shows a pip per phase, phase announcements appear as notices, and an enraged boss wears a red mark.
- **Integrity:** `findEncounterIssues` requires telegraph windups of at least 3 ticks (4 for `body` and `ring`), a telegraph `maxHit` within the tier's share of a reference integrity (`telegraphHitCap`), descending phase thresholds, known `enables` ids, summons that exist and are weaker non-bosses, hazards that fit their room, and a multi-combat area for any boss with telegraphs or hazards.

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
| focus | one-handed | psionic | channel | pulse | |
| resonator | two-handed | psionic | invoke | wave | 6 ticks (×1.3) |

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
  - `tierForLevel`, which maps a skill level to a world tier (1, 5, 8, 12, 16, 20, 25, 30 and 35 start tiers 1–9).
- **Content:** a resource node is a world object whose interaction carries `gather`. A station is a world object whose interaction runs the `openCrafting` effect. Recipes live in `content/recipes.ts`, keyed `station:output`.
- **Server:**
  - `GatheringController` and `CraftingController` drive a repeating `player.activity` on the tick.
  - Walking, interacting, teleporting or leaving cancels it.
  - Node charges and depletion are per `LevelInstance` layer, broadcast near the node as `world.objectDepleted` and included in `world.entered` and `world.chunksEntered`.
  - The server re-validates the open station, skill level and materials on every craft.
- **Quests** use `gather` and `craft` objectives. The matching `gathered` and `crafted` events carry counts.
- **Integrity:** `findCraftingIssues` (`content/craftingIntegrity.ts`) enforces the crafting rule. Every equipment and consumable item needs a recipe at the right station, at or above the item's equip requirement. Every ingredient must trace back to a node or creature drop placed in a district whose `tier` is no deeper than the item's tier. A node must not need more Salvage than its district's tier allows. Items marked `unique` (`content/uniqueGear.ts`) are the exception: they must have no recipe and must be a rare (chance below 1) drop from a placed creature at or above their equip requirement.

### Trams and the world map

The tram network is content (`content/tramNetwork.ts`): **stations** (a district, the area that counts as the platform, and an arrival tile) and **lines** (ordered station lists). `buildTramNetwork` resolves each station onto its level as `GAME_CONTENT.tram`. The pure rules live in `shared/src/world/tram.ts`.

- **Discovery:** entering a station's area sets the flag `tram:<stationId>`, and so does the `discoverStation` effect. A station with `alwaysKnown: true` (the Intake Transit Bay) is known to everyone. `SelfState.discoveredStations` lists them for the client.
- **Stations:** every station has exactly one tram car, parked on `track` tiles (`T`, not walkable). The track runs on through the platform room and out of it at both ends, and the car is reached from a platform beside it. The car's pieces run the `openTramMap` effect, which sends `tram.mapOpened` for the station the player is standing in. `tram-stop` pylons are scenery.
- **Riding:** `tram.board { destinationStationId }` is refused unless the player stands in a station area and has found the destination. The destination must be on one of the lines through the origin (`linesThrough`), since a station's single car serves only those lines. Rides never change lines, so `tramStops` counts hops along the shared line. `TramController` then runs a `player.activity`:
  - **Boarding** lasts `TRAM_BOARDING_TICKS`. Walking, interacting, teleporting or taking damage cancels it.
  - **Riding** lasts `tramRideTicks(stops)`: at least 3 seconds, plus 2 ticks per stop beyond that. The rider stays put, every intent except chat is ignored, and creatures drop and ignore them. The client shows the in-car view between `tram.departed` and `tram.arrived`.
  - **Arrival** teleports the rider to the destination platform. A rider who disconnects mid-ride is saved at the destination.
- **World map** (`hud/worldMap.ts`, the M key or the minimap's Map button): a full-screen map that pans (drag), zooms (wheel, pinch or the buttons) and recentres on you, with a level dropdown listing every floor level, disabled as "Uncharted" until visited (the `visited:<levelId>` flag, listed in `SelfState.visitedLevels`). It draws each level from its assembled layout with district names and tiers, tram lines and stations, and the player. Districts holding the tracked quest's objectives (`objectiveDistricts`) are outlined. A tram stop opens the same map in transit mode, with a destinations sidebar (a bottom sheet on narrow screens) listing only the lines the platform's car serves, with a Ride button per reachable stop. Known stations are also tappable on the map.
- **Integrity:** `findTramIssues` checks that each station resolves to a placed district and area, has a walkable platform inside that area, exactly one tram car on track that runs out of the platform at both ends with a platform beside it, and is on a line. It also checks that lines only list known stations and that every tram stop sits inside a station area.

### Multi-tile assemblies

Anything bigger than one tile, such as a tram car or a bridge, is an **assembly** (`shared/src/world/assemblies.ts`, content in `content/assemblies.ts`). It is a grid of single-tile pieces, and each piece is an ordinary world object with its own voxel model, built so its edges meet its neighbours exactly.

- **Definition:** `pieces` maps one character to `{ objectId, turns }`, and `layout` draws the grid in rows like a district map, with a space for an empty cell. `turns` rotates a piece by quarter turns, so one model covers both sides of a symmetric object (the far side of a tram car is the near side turned twice). Pieces that are mirror images, like the two noses of a tram car, need two models.
- **Stretching:** `stretchRow` names a row that repeats `span` times when placed, so one bridge or catwalk definition fits any gap.
- **Placement:** a district lists `assemblies: [{ instanceId, assemblyId, position, facing, span }]`. `position` is the top-left tile of the placed (rotated) footprint. `resolveLevel` expands each one into object placements with instance ids `<instanceId>/<column>,<row>`, so the server, the client and the integrity checks only ever see single-tile objects.
- **Installations:** crafting stations, lifts, rifts, the Knock and double doors are installations (`content/installations.ts`): an existing core object grown into an assembly with the same id. Each kind draws a layout around `C`, the core, and names its other pieces. `buildInstallations` derives a piece object per part that copies the core's name, interactions and door and `countsAs` the core, or a walkable floor piece with no interactions (aprons, scars). Districts place one with `install(instanceId, coreId, coreTile, facing)`, so the core keeps its tile and the rest grows to the sides and front. Door state, passage access and quest objectives all key on the core (`doorKeyOf`, `countsAs`), so both leaves of a double door open together. On the client every piece of an assembly shares one seed, so animations stay in phase, and a door group slides as one when you are near any leaf.
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

### Market

The Site exchange is a player order book. The pure rules live in `shared/src/economy/market.ts`, and `MarketController` (`server/src/gameplay/marketController.ts`) holds the live book.

- **Access:** the `openMarket` effect opens a session, like storage. Only the `market-terminal` object runs it, and `findContentIssues` refuses one placed outside `MARKET_DISTRICT_ID` (the Meridian Atrium). The server also refuses to open the market anywhere else. Walking, interacting or teleporting closes it.
- **Tradable items:** anything that is not a quest item or currency. Every item's default price is its `value` (at least 1); players may post any whole price.
- **Escrow:** placing an order takes its escrow from the inventory straight away: the items for a sell order, `price × quantity` scrip for a buy order. Each character holds at most `MARKET_ORDER_LIMIT` orders.
- **Matching:** `matchOrder` runs when an order is placed. A buy fills from the cheapest sell orders at or below its price, and a sell fills from the highest buy orders at or above its price; ties go to the older order. Trades happen at the resting order's price, so a buyer who bid high gets the difference back. A player's own orders never match each other.
- **Collection:** proceeds wait on the order (`uncollectedItems`, `uncollectedScrip`) until the owner collects them at the exchange, so offline traders and full packs lose nothing. Cancelling returns the unfilled escrow the same way. An order disappears once it is closed and fully collected.
- **Persistence:** orders live in the `market_orders` table (`persistence/marketRepository.ts`) and are loaded at boot. The trader's character is saved after every market action, so escrow and the order book never disagree after a crash.

### Contracts

Repeatable daily and weekly work. The pure rules live in `shared/src/contracts`, the pool in `content/contracts.ts`, and `ContractController` (`server/src/gameplay/contractController.ts`) applies them.

- **Definitions:** a `ContractDefinition` has a cadence, a tier, `requires` conditions (usually `questCompleted` for district access plus `combatLevel` or `skillLevel`), one objective (`defeat`, `contain`, `gather` or `craft` over a list of creature or item ids) and reward effects. The `contract` helper derives scrip, XP and commendations from the cadence and tier.
- **Periods:** daily boards turn over at midnight UTC and weekly ones at Monday 00:00 UTC (`contractPeriod`, `contractPeriodEndsAt`). The server clock is injectable through `GameplayOptions.now`.
- **Boards:** each character keeps a `ContractLedger` on its record. `refreshContractLedger` rolls `CONTRACTS_OFFERED` contracts per cadence (3 daily, 2 weekly) from those the character is eligible for, seeded by character and period so a board never changes within its period. Rolls favour the top two tiers the character qualifies for. The server refreshes on login, on opening a board and every 200 ticks, and announces new boards.
- **Progress:** every quest event also goes to `advanceContracts`, so kills, containments, gathering and crafting count anywhere. Completed contracts are paid only at a board (`contracts.claim` needs a session opened by the `openContracts` effect). Clearing a whole board pays `SWEEP_BONUS_COMMENDATIONS`.
- **Commendations:** `directorate-commendation` is a currency item, so it cannot be traded on the market. The Contract Board's second interaction opens the `contracts-office` shop, whose `currency` is commendations (`shopCurrencyOf`).
- **Integrity:** `findContractIssues` checks ids, that creatures are placed (and containable for `contain`), that `gather` items have a node and `craft` items a recipe, that a board is placed, and that a character fresh out of Induction qualifies for a full board of each cadence.

### Social: parties, contacts and chat channels

`SocialController` (`server/src/gameplay/socialController.ts`) owns chat, parties and contacts. Pure rules live in `shared/src/social`.

- **Chat:** `chat.say` takes a `channel` (`local` near the speaker, `party`, or `site` to everyone online, limited to one message every five seconds). `chat.whisper` resolves the recipient by name among online players and, failing that, tries longer prefixes of `to + text` so unquoted multi-word names work. The client parses slash commands with `parseChatInput` (`/p`, `/s`, `/w`, `/r`, `/invite`, `/friend`, `/leave`, `/help`).
- **Parties:** held in memory, up to `PARTY_SIZE_LIMIT` (5). The leader invites by name, invites expire after `PARTY_INVITE_TICKS`, and a party disbands below two members. Leaving the world leaves the party. Members get `party.state` (name, combat level, district and integrity) whenever it changes.
- **Shared credit:** when a creature dies, `CombatController.creditPartyMates` raises a `defeated` event for every party mate of a credited player who is on the same layer with the kill inside their interest set. They get quest and contract credit, not XP or loot.
- **Layers:** `World.spawn` prefers the layer holding the most of a player's party mates, so a party moving between levels lands together.
- **Contacts:** `CharacterRecord.friends` persists a list of `{ characterId, name }`, found by name online or through `CharacterStore.findByName`. `friends.state` reports who is online and in which district, refreshed on login, logout and every 20 ticks when it changes.

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
- **`world/levelScene.ts`** streams the level in 32 × 32 tile chunks (`world/chunkView.ts`). The chunk under the camera is built synchronously. Its eight neighbours are built nearest first within a 5 ms budget each frame, and join the scene only when finished. Chunks more than two away are disposed. A `ChunkView` is a queue of small build steps (`build(deadline)`), so no single frame meshes a whole chunk:
  - It paints a `DenseVolume` covering its tiles plus a one-tile margin (`createTileVolume`, `paintTileRows`, so faces and ambient occlusion match across seams), two rows at a time.
  - It meshes the floor and floor scatter in two-row strips. Strips are clipped to the whole chunk floor, so they match one floor mesh and cull separately.
  - It meshes each wall, glass and door tile on its own, then merges them in eight-row bands into a `FadeBatch` (`world/fadeBatch.ts`): one mesh per voxel kind per band. To **cut away** (fade) a wall between the camera and the player, the batch drops that tile's triangles from its index buffer and shows the tile alone with the faded materials.
  - It mounts **wall sconces** automatically (`world/wallLights.ts`): every area gets one on a plain wall beside free floor roughly every five tiles, away from doors, and each authored zone light snaps to the nearest such wall within a few tiles (an unsnapped one stays as an invisible fill at head height). There are no ceiling lights. Sconces share one cached mesh per style, are batched like walls under the wall tile they hang on, and fade with that wall in the cutaway. In a district whose `ambience.fixtures` is `'failing'` they burn warmer, dimmer and some flicker.
  - Every object with emissive voxels **lights itself**: its glow colour, centre and size come from its emissive mesh (cached per model variant), unless the definition sets its own `light`. Free-standing light is just props, such as the `floor-lamp`.
  - It places object models from a cache of eight variants per model. Props with no interactions, door, light or moving parts are **decor**: they are merged per eight-row band into one static mesh (`voxel/mergeVoxelGeometry.ts`) and are not in `LevelScene.objects`. Other objects keep their own group so they can be picked, animated, slid open or ringed as objectives.
  - It contributes light sources.
- **Ambience** (`world/ambienceBlend.ts`): the renderer averages the darkness, tint and fog of every district or connector tile within 3 tiles of the camera focus, then eases toward it, so crossing a district boundary blends over about 6 tiles.
- **Minimap** (`hud/minimap.ts`): names nearby districts at their centres, and pins the names of districts outside the view to its rim in their direction.
- **`models/characterModel.ts`** builds an articulated `CharacterRig` (legs, torso, head and arms on pivots) from `CharacterAppearance` and equipped gear visuals. Geometry is cached per look, so NPCs that look the same share it.
- **`gameRenderer.ts`** handles:
  - renderer setup: ACES tone mapping, soft shadows from a key light that follows the focus, and a hemisphere fill;
  - local lights, reassigned to the nearest 96 sources every quarter second (`lightAssignment.ts`) and shaded as omnidirectional **field lights** inside the voxel materials (`voxel/fieldLights.ts`), with no shadow maps. Field lights are binned into a 64 × 64 grid of 2-tile cells around the focus, holding up to 16 lights per cell they can reach, so each fragment only shades the lights listed in its own cell. Lights beyond the 96 fade out at the edge;
  - an ambient floor: the hemisphere fill and key light dim with district `darkness` but never below a readable minimum, so dark districts keep their mood without hiding the floor;
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
