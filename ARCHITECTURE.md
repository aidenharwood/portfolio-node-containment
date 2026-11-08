# Architecture

## Principles

1. **The server is authoritative.** Clients send intents (`world.walk`, `world.interact`, `inventory.equip`). The server validates them, simulates, and broadcasts the outcome. A client never decides what it owns or where it stands.
2. **Rules live in `shared`, as pure functions.** Equipping, inventory maths, quest progression, condition checks, pathfinding and character validation take plain data and return new data. The server applies them authoritatively. The client uses the same functions for previews and UI hints (requirement tooltips, quest markers, the derived combat profile) without trusting them.
3. **Content is data, not code.** Items, the new-character kit, NPCs, objects, dialogue, quests and zones are typed records in `packages/shared/src/content`. Behaviour comes from a small vocabulary of **conditions** and **effects**, so most new gameplay needs no new engine code.
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

### Tick model

`World.tick()` runs every 300ms. Each tick it:

1. advances NPC wander paths,
2. moves each player one tile along their path and fires `onAreaEntered` for newly entered areas,
3. broadcasts a single `world.tick` with every movement in the zone,
4. resolves pending interactions for players whose path has finished (`onPathCompleted`).

The client interpolates each entity from its previous tile to its new one over one tick.

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

### Combat

The pure rules live in `shared/src/combat/combatMath.ts`: attack profiles, hit chance, damage rolls, range and sightline checks, and XP per point of damage. `server/src/gameplay/combatController.ts` runs them each tick, after movement:

- **Players:** a player with a `combatTargetId` chases the target until `isWithinAttackRange` (melee needs cardinal adjacency; ranged needs distance and line of sight via `world/lineOfSight.ts`). They then attack every `speedTicks`. Damage awards XP quietly through `EffectRunner.awardExperience`.
- **Creatures:**
  - Aggressive creatures pick the nearest visible player inside `aggroRadius`.
  - Any creature retaliates when attacked.
  - A creature dragged past `leashRadius` walks home and heals.
  - A defeated creature plays a death animation for 3 ticks, despawns, and respawns after `respawnTicks`. Loot rolls go straight to the killer's inventory, and a `defeated` quest event fires.
- **Incapacitation:** an incapacitated player is moved to the zone's `recovery` location (or its spawn) at full integrity.
- **Regeneration and auto-retaliate:** integrity regenerates 1 point every 20 ticks once out of combat. A player who is idle when attacked fights back automatically.

Creatures are content (`content/creatures.ts`) placed through `ZoneDefinition.creatures`. Consumables are `item.consumable`. Quests use `defeat` and `useItem` objectives.

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

- **Layers:** `World` keeps a list of `ZoneInstance` layers per zone. `spawn` places a player in the busiest layer that still has room under the zone's `capacity` (default 50; tests can override it). When every layer is full it creates a new one, and empty overflow layers are retired after about 60 seconds. Use `world.zoneOf(player)` and `world.instances()`; never look a zone up by id.
- **Single-way combat:** `CombatController` pairs a player and a creature with `engagedWith` for `ENGAGEMENT_TICKS` (about 3.6 seconds) after every swing.
  - Outside multi-combat areas, `engage` refuses a creature that is engaged with someone else, and a player who is under attack by a different creature.
  - Aggression skips players who are already engaged.
  - An area becomes multi-combat with `multiCombat: true` on its `AreaDefinition`. The rule is decided by the creature's position.
- **Credit:** a creature remembers every player who damaged it (`contributors`). When it dies, each contributor present gets the `defeated` quest event, kill XP (`defeatExperience`) and an independent loot roll. Shared quest targets like the Hollow Warden therefore never block a crowd.
- **Respawn:** `scaledRespawnTicks` shortens respawns by 15% per extra player in the layer, down to a floor of 35% of the base time.

### Ground items

Each `ZoneInstance` holds a `groundItems` map. `GroundItemController` creates them for creature loot, the inventory "Drop" action, and overflow from a full inventory (`EffectHost.dropToGround`).

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
  - Node charges and depletion are per `ZoneInstance` layer, broadcast as `world.objectDepleted` and included in `world.entered`.
  - The server re-validates the open station, skill level and materials on every craft.
- **Quests** use `gather` and `craft` objectives. The matching `gathered` and `crafted` events carry counts.
- **Integrity:** `findCraftingIssues` (`content/craftingIntegrity.ts`) enforces the crafting rule. Every equipment and consumable item needs a recipe at the right station, at or above the item's equip requirement. Every ingredient must trace back to a node or creature drop placed in a zone whose `tier` is no deeper than the item's tier. A node must not need more Salvage than its zone's tier allows.

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
| 8 per tile | 1/8 | Zone floors and walls (`world/zoneVoxels.ts`). Walls are 16 voxels (2 units) tall. |
| 16 per tile | 1/16 | World objects (`models/objectModels.ts`) |
| 20 per unit | 1/20 | Characters (`models/characterModel.ts`), about 32 voxels tall |

- **`voxel/`** is the engine.
  - `VoxelModel` is a sparse builder with `fill`, `set` and `paintExisting`.
  - `DenseVolume` is a flat zone grid.
  - `meshVoxels` turns either one into geometry. It culls hidden faces and bakes per-vertex ambient occlusion.
  - Voxels have three kinds: `solid` (lit), `emissive` (unlit, so it feeds bloom) and `glass` (transparent). Each kind becomes its own mesh with shared materials from `voxelMaterials.ts`.
- **`world/zoneScene.ts`** meshes the floor once. It hangs **ceiling light fixtures** automatically, spaced across each zone area. Each fixture is an emissive panel plus a point light raised high enough not to wash out heads, and it fades out with the cutaway when it would block the view. A zone whose `ambience.fixtures` is `'failing'` gets flickering, partly dead fixtures instead. It meshes each wall, glass and door tile as its own group so it can **cut away** (fade) walls between the camera and the player. It places object models, animates their moving parts, and collects light sources.
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

- **New object:** add a builder to `objectModels.ts` keyed by `WorldObjectModel`. `heightVoxels` sizes its hover ring and light. Use `modelScale` on the definition for oversized props.
- **New gear model:** handle the `visual.model` in `characterModel.ts`. Torso, head and visor models go in the part builders, held items in `addHeldItem`.

The HUD is plain DOM (`ui/dom.ts` → `h()`), with one class or factory per widget in `hud/`. `hud/interactionBubble.ts` is the cursor-following hover bubble: primary action, NPC title, objective tag, and left/right-click hints. `hud/speechLayer.ts` projects overhead chat into screen space.
