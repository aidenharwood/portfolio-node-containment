# Contributing (humans and AI agents)

## Ground rules

- **No code comments.** Make code self-explanatory with precise names, small functions and types. Context that names can't carry belongs in these docs.
- **TypeScript only erasable syntax.** The server runs `.ts` directly on Node 24, so there are no `enum`s, no `namespace`s and no constructor parameter properties. Imports use explicit `.ts` extensions.
- **Domain logic goes in `shared`, and stays pure.** No I/O, no `Date.now()`, no `Math.random()` unless injected. If the client and server both need a rule, it lives there.
- **Content is data.** Before writing engine code for a feature, check whether a new `Condition` or `GameEffect` variant would express it.
- **World changes follow `WORLD_DESIGN.md`.** It sets how districts are drawn, joined and populated, and `findWorldDesignIssues` enforces most of it.
- **Every change keeps these green:** `npm run typecheck` and `npm test`.
- `findContentIssues` (in `shared/src/content/contentIntegrity.ts`) validates every cross-reference in the content: item ids, quest steps, dialogue nodes, district placements, teleport destinations, and level layouts (`findLevelIssues`). The server refuses to boot if it reports anything, and the test suite runs it.

## Where things live

| I want to…                         | Go to                                               |
| ---------------------------------- | --------------------------------------------------- |
| Add or tune items                  | `shared/src/content/items.ts`                       |
| Change the new-character kit       | `newCharacter.kit` in `shared/src/content/gameContent.ts` |
| Change how skills drive stats      | `shared/src/character/derivedStats.ts`             |
| Add an NPC                         | `shared/src/content/npcs.ts` + a district's `npcs`  |
| Write dialogue                     | `shared/src/content/dialogues/*.ts`                 |
| Add an interactive object          | `shared/src/content/worldObjects.ts`                |
| Write a quest                      | `shared/src/content/quests/*.ts`, then register it in `gameContent.ts` |
| Build or modify a district         | `shared/src/content/districts/layouts/<district-id>.json` (its module in `districts/*.ts` only loads it) |
| Look at or edit a district or level | `npm run plan -- <district> [room]`, or `npm run dev`, open `/editor.html` and press Edit |
| Dress rooms with props and crowds | `setPieces` and `objects` in the district's layout file, following the Placement rules in `WORLD_DESIGN.md`; props in `shared/src/content/prefabs/*.ts`, `clutterObjects.ts`, `furnitureObjects.ts`, `ambientNpcs.ts` (models in `client/src/render/models/clutterModels.ts` and `furnitureModels.ts`) |
| Say how a prop stands and where it belongs | `FURNISHING_PROFILES` and `ROOM_SIGNATURES` in `shared/src/content/furnishingCatalogue.ts` |
| Place districts or add a connector | `shared/src/content/levels/*.ts`                    |
| Add a recipe, material or resource node | `shared/src/content/{recipes,craftingItems,craftingObjects}.ts` |
| Change a game rule                 | `shared/src/{character,gear,quests,rules}`          |
| Add a client→server command        | `shared/src/protocol/clientMessages.ts` → `server/src/gameplay/gameplay.ts` |
| Change how something looks         | `client/src/render/*` (voxel models in `render/models`, levels in `render/world`) |
| Change the HUD                     | `client/src/hud/*`, `client/src/styles/hud.css`     |

## Progression rule

Characters differ only in how they look. There are no classes, origins or attributes. Every new operative gets the same skills (all level 1) and the same standard kit. Anything that behaves like a stat (combat, resistances, research output) must be derived from **trainable skills** plus equipped gear, in `deriveCombatProfile`. Gear can only be gated by skill levels (`requirements.skills`).

## Recipes

### Add an equippable item

1. Append an `ItemDefinition` to `ITEMS` with an `equipment` block: `slot`, `stats`, optional `requirements`, and a `visual`.
2. `icon` decides both the inventory sprite and how the item looks when worn. It must be one of the shapes `EQUIPMENT_SHAPES` lists for the item's slot (`shared/src/gear/slots.ts`); `npm test` enforces this. `visual` only sets the colours.
3. For a new shape, add it to `EQUIPMENT_SHAPES`, add an icon builder in `client/src/render/items/itemModels.ts`, and add a renderer to the matching record in `client/src/render/models/characterModel.ts`. The typecheck fails until all three exist.
4. Ladder gear made in `ward/items.ts` gets its tier's `form` automatically. A new body shape or weapon kind also needs a case in each form pass (`gearFormWorn.ts`, `itemFormPasses.ts`), and must pass `gearForms.test.ts`, which fails when two tiers share a silhouette.
5. Give it a recipe. See "Add a craftable item".

### Add a craftable item

**Rule: every piece of gear and every consumable is craftable, from materials found in an appropriately tiered area.** The one exception is unique drops (see below). `npm test` enforces it.

1. Add the item.
2. Add a recipe in `content/recipes.ts`:
   - gear goes on the `fabricator`; medicine goes on the `synthesiser`;
   - its level must be at least the item's highest equip requirement.
3. Make sure every ingredient can be sourced, either refined on the `refinery` or gathered raw. A raw source is a resource node or a creature drop placed in a district with `tier ≤ tierForLevel(recipe level)`.
4. For new raw stock, add a node with `resourceNode(...)` in `content/craftingObjects.ts` and place it in a district of the right tier. Give its model a builder in `client/src/render/models/craftingModels.ts`.

### Add a unique drop

Unique gear is never crafted. It only comes from the loot of a boss or a select regular creature, and the tooltip labels it "unique".

1. Add it to `content/uniqueGear.ts` with `unique(...)`, which sets `unique: true`.
2. Add a loot entry to one or more creatures that are placed in a district. Pick the chance by rarity: about 10–15% for a boss's `restricted` or `classified` drop, 3–6% for a boss's `anomalous` drop, and 1–2% from regular creatures.
3. `findCraftingIssues` rejects a unique item that has a recipe, that no placed creature drops, that a creature always drops (chance 1), or whose equip requirement is above the level of every creature that drops it.

### Add a quest

1. Create `content/quests/myQuest.ts` that exports a `QuestDefinition`. Give it steps with objectives, `rewards` (effects) and a readable `rewardSummary`.
2. Register it in `GAME_CONTENT.quests` in `gameContent.ts`.
3. Start it from a dialogue option or node effect, `{ type: 'startQuest', questId }`, and set `offeredBy` so the NPC shows a "!" marker. If the offer should wait for earlier quests, list them in `offerRequires` and gate the dialogue option with matching `questCompleted` conditions. The client only sees the quest log, so the marker cannot follow flags.
4. For "hand over X" steps, use a `signal` objective with `npcId`. A dialogue option then gives the item and raises the signal: `takeItem` + `emitSignal`.
5. Gate objects and dialogue with `questActive` conditions using `stepId`.
6. Add an integration test in `server/test` that uses `createHarness()`. `tutorial.test.ts` is a full example.

### Orient an object

Object models face south (+y on the map) by default. Wall-mounted or doorway objects on an east, west or north wall need `facing` on their `ObjectPlacement`, for example `facing: 'east'` for a bulkhead on a west wall. Wide doorways are two adjacent placements of the same object, like the Sector 2 bulkheads in the Atrium and the matching pair inside Sector 2.

### Add a district

Read `WORLD_DESIGN.md` first: it holds the rules, and `findWorldDesignIssues` enforces most of them. A district is a JSON layout file drawn from blueprint steps, and becomes part of the world when a level places it. `content/districts/layouts/brine-galleries.json` is a full example, and `content/districts/brineGalleries.ts` shows the module that loads it.

1. Give it a `tier` (1 is the Intake Wing and Atrium, 4 is Sector 3, Deepwatch and the Cryovault, 8 is Meridian Below, 9 is the Dead Letter Office, 10 is the Brine Galleries, 11 is the Salt Cathedral, 12 is the Vesper Wards and 13 is the Vesper Pharmacy). Crafting checks use it to decide which gear its materials may feed, and tier may not fall with distance from the level spawn.
   Also give it a `region` (`content/regions.ts`). Overworld districts must be reachable on foot from the Atrium; mark one `reachedOnlyByTram` only if it is meant to be.
2. Write `content/districts/layouts/<district-id>.json` (the format is `DISTRICT_LAYOUT_SCHEMA` in `shared/src/world/layoutSchema.ts`). Its `steps` are drawn by `drawBlueprint` (`shared/src/world/blueprint.ts`): `room` for each named space (`rect`, `octagon` or `round`), `link` for the passages and doorways between rooms, `exit` for each way out of the district, `patch` for pools, track, partitions and floor strips, `pillars` for colonnades, `track` for a tram bed. Never draw walls; they appear around every floor tile. Use `tiles` only to paint single tiles over what the steps drew.
3. Declare `areas` as `{ room, name, safe?, multiCombat? }`. Combat is single-way by default; set `multiCombat: true` for boss fights with adds. Mark outposts, camps and hubs `safe: true`: friendly NPCs on a floor level must stand in one, creatures must be placed outside one, and gathering nodes belong in the hostile areas around it.
4. Place `npcs`, `objects`, `assemblies`, `creatures`, `lights`, `decals` and `setPieces` with an `at`: `{ "room": "plaza", "dx": 29, "dy": 25 }` inside a room, `{ "exit": "north", "index": 0 }` or `{ "link": ["a", "b"], "index": 0 }` for doors, and `{ "x": 3, "y": 4 }` only for a point in no room. A position outside its room fails at load with the JSON path, and `findContentIssues` reports anything placed on an unwalkable tile.
5. List the points other content needs (tram platform, teleport landings, spawn, recovery) in `anchors`. Add `content/districts/<name>.ts`, which loads the file with `buildDistrict(layout)` and exports the anchors with `anchorsOf(district, [...])`. Other files and tests read the anchor.
6. Register it in `DISTRICTS` in `content/gameContent.ts`.
7. Place it on a level (`content/levels/*.ts`) with `joinDistricts` (`shared/src/world/levelPlan.ts`): name the exit it attaches by and the neighbour's exit it meets. Exits must face each other and be the same width.
8. Connect it:
   - **Walking:** open exits are at least nine tiles wide and meet a neighbour's floor. Put a filler district between places (see `content/districts/verdanceConcourse.ts`) and give the new district two ways in unless it is a deliberate `deadEnd`.
   - **Gated:** a two-wide `exit` or `link` marked `gate` with a door object (`door: { conditions }`) on its tiles. See Doors in `ARCHITECTURE.md`.
   - **Across levels:** use an object whose interaction has conditions and a `teleport` effect, or a tram line. A teleport targets `{ districtId, position }`, with the position read from the destination's `anchors`.
9. Build and tune it in the editor: `npm run dev`, open `/editor.html?district=<district>`, press Edit, and drag, rotate, add from the palette, paint tiles, place furniture and set each room's dressing. `Ctrl+S` saves through the dev server, which refuses a layout that does not load and writes the canonical file; Check runs every content check against your edits. Then look at it: `npm run plan -- <district>` in a terminal, or `npm run dev` and open `/editor.html?district=<district>` for the plan, the 3D view and its issues. Run `npm test`. `findLevelIssues` flags overlaps, walkable tiles nothing can reach, duplicate instance ids, and spawns, teleports or recoveries on unwalkable tiles; `findWorldDesignIssues` flags the rest.

### Add a pocket dimension

1. Build its district and a level file with `kind: 'pocket'`, then register both in `gameContent.ts`.
2. Give it an entrance: an object (the `anomaly` model suits a tear in space) whose interaction has `conditions` and a `teleport` into the pocket, plus a way back out.
3. Visiting sets `visited:<levelId>`, which reveals the pocket on the world map. Nothing else is needed.

### Add a tram station

1. Pick a room in the district to act as the platform. Draw a two-tile-wide bed with `track(...)` straight through it and on out of the district at both ends, and edge the platform side with a `hazard` strip. Then join both ends to the line's track in the level file with `drawTrackway`, so the line's stations share one connected run of track, which may branch or end in a buffer outside a terminal (`WORLD_DESIGN.md`, rule 17). Where the bed crosses floor people need, put `bridge` assemblies over it.
   Place exactly one `tram-car` assembly on the track, facing `north` or `south` for a track along x and `east` or `west` for one along y. Its pieces open the transit map; a `tram-stop` pylon on the platform is optional scenery.
2. Add a `TramStationDefinition` to `TRAM_STATIONS` in `content/tramNetwork.ts`, with an arrival `platform` tile inside that area, read from the district's `anchors`.
3. Add the station to a line in `TRAM_LINES`. Neighbours in a line's list are one stop apart. A station's car serves every line through it, and only those, so riders change lines by getting off at a shared station.
4. Run `npm test`. `findTramIssues` checks the area, the platform, the car and its track, and the line.

### Add a multi-tile object or bridge

1. Add one world object per distinct piece (in `content/assemblyObjects.ts`), each with its own `WorldObjectModel`. Pieces people walk on need `deck: true` and `blocksMovement: false`.
2. Give each model a builder in `client/src/render/models/assemblyModels.ts`. Make the edges match the neighbouring pieces.
3. Add an `AssemblyDefinition` to `content/assemblies.ts`: a `layout` grid, a `pieces` legend (with `turns` for rotated reuse), and a `stretchRow` if it should fit spans of any length.
4. Place it with a district's `assemblies` list. Use `facing` to turn it and `span` to stretch it.
5. Run `npm test`. `findAssemblyIssues` checks the definition and every placement.

### Add a creature

Creatures are passive by default. Set `aggressive: true` only for creatures that should hunt players. They automatically ignore players more than `AGGRESSION_LEVEL_GAP` combat levels above them.

1. Add a `CreatureDefinition` to `content/creatures.ts`: level, integrity, defence, an attack profile, aggro and leash radii, respawn ticks and a loot table.
2. Place it in a district's `creatures` list. Use `recovery` on dangerous districts so incapacitated players wake somewhere safe.
3. Give it a look: add a `CreatureModel` id and a rig in `client/src/render/models/creatureModels.ts`. Implementing `EntityRig` gives you the attack, hurt and death animation hooks.
4. Reference it from quests with a `defeat` objective. `findContentIssues` validates creature ids, placements and loot items.

### Add a weapon or consumable

- **Weapon:** add `weapon: { kind, range, speedTicks }` under `equipment`, with an `icon` equal to `kind`. The kind decides style, grip, animation and projectile (see `WEAPON_KIND_INFO`). Melee rating comes from Power and Close Quarters, ranged from Accuracy and Marksmanship. Match a new weapon's damage per tick to the other weapons of its tier; a new kind needs an entry in `WEAPON_KIND_INFO`, a shape in `EQUIPMENT_SHAPES.primary`, an icon builder, a held renderer and, for a new motion, a pose in `weaponPoses.ts`.
- **Consumable:** add `consumable: { verb, heal }`. The inventory shows the verb as the item's default action.

### Add a shop or stock

Add a `ShopDefinition` to `content/shops.ts` (listings, which item categories it buys, and its sell rate). Then either set `shopId` on the NPC, which adds a right-click "Trade" option, or add an `openShop` effect to a dialogue option.

### Add a contract

Add an entry to `CONTRACTS` in `content/contracts.ts` with `daily(...)` or `weekly(...)`: a short id, a name and brief, a tier, `requires` conditions that keep it off boards until the player can reach the district, and an objective built with `defeat`, `contain`, `gather` or `craft`. Rewards come from the cadence and tier. Run `npm test`; `findContractIssues` rejects unknown or unplaced targets and a pool that cannot fill a new player's board.

### Balancing

`packages/shared/test/wardBalance.test.ts` runs seeded fights between operatives at set skill levels and each Hollow Bay creature, using the shared combat maths. Keep these bands when tuning creatures, XP rewards or gear:

| Fight | Target win rate |
| --- | --- |
| Canal rats and stray dogs, fresh operative in the issue kit (baton and plate) | ≥ 95% |
| Gutter mites, fresh operative | ≤ 85% (Lost Cat and the alley vent wait for combat level 4) |
| Gutter mites, Close Quarters 5 and Fortitude 3 in the issue kit | ≥ 95% |
| Silt eels, Close Quarters 6 in scrap | ≥ 85% |
| Rustlings by the Scrapyards survey stake, Close Quarters 8 in scrap | ≤ 25% |
| Rustlings, Close Quarters 10 with an iron blade | ≥ 80% |
| The Lamplighter, Close Quarters 10 in scrap | ≤ 40% |
| The Lamplighter, the same operative with an iron baton | 75–97% |
| Scrap crawlers, level 10 in a full iron set | ≥ 90% |

The same file also checks that ladder weapons carry only their style's offence stat (blade beats baton, and the maul matches or beats the blade's damage per tick), that quest rewards give only craftable, non-unique gear and consumables, that the Site Meridian chapters lead straight on with `followUpQuestId`, that quests before Dead Band pay at least three quarters of the Engineering its receiver needs, and that tier-1 food costs no more than 1.5 scrip per point healed, and that the Kit Order contract counts every scrap piece a fabricator makes.

Pacing: `experienceForLevel` (`shared/src/character/skills.ts`) discounts early levels and rejoins the plain curve at level 25 (`EASED_LEVEL_SPAN`), so level 2 comes from the first training drone and level 10 costs about 2,700 XP. Creatures built with `beast()` pay `killExperience(level)`: 6 per level, plus twice the level squared (capped at level 16), plus a veteran bonus of 8·(level − 14)² that stops growing at level 44. Past level 28, `beast()` also adds a threat term for each level over 28: +5 accuracy for melee and ranged creatures (+1.5 for psionic ones, which already get past plate), +2 defence and +2 integrity. Kill XP rises by 3.5% per level over 28 to pay for the risk. A creature can pin `accuracy` or `defence` (the Warden does, so plate stays a fair answer to the story boss). Out of combat, players regenerate 5% of their maximum integrity every 20 ticks (`shared/src/combat/regeneration.ts`). Together these make the strongest creature an operative can safely farm pay the most experience per minute, counting the wait to heal: crawlers at 10, hull knockers on the Fringe from about 20, the Cordon never ahead of the Fringe before 35, and the Cordon ahead from the sinter rung at 40. In level-matched plate with no food, an aggressive creature past 28 costs 30–50% integrity at level, 55–75% five levels under, and wins most fights ten under. The balance file checks these rules.

A story gate is a `reach` objective (a skill level, combat level or quest points) on the chapter's first `ready` step, not a condition on an NPC's offer. Chapters start one another with `followUpQuestId`, so an offer gated on a skill would never be seen, and the balance file rejects one. If you insert a step before existing ones in a shipped quest, set `stepsAddedBeforeStepIds` so saves written before `QuestProgress.stepId` existed move with it.

The material ladder runs Scrap (1), Iron (10), Steel (20), Alloy (30), Sinter (40) and Vault Glass (50). Quests can declare a `recommendedLevel`; the journal shows it next to the player's own level.

### Add a new effect or condition

1. Extend the union in `shared/src/rules/effects.ts` or `conditions.ts`.
2. Handle it in `server/src/gameplay/effectRunner.ts` or in `isConditionMet`. TypeScript's exhaustive `switch` will point at every place that needs updating.
3. If it references content ids, teach `findContentIssues` to validate them.

## Testing

- `packages/shared/test` holds pure rule tests.
- `packages/server/test` holds auth and persistence tests against in-memory SQLite, plus gameplay integration tests through `test/support/testHarness.ts`. The harness drives a real `Gameplay` instance with a recording sink and a deterministic RNG.
- Engine tests run against the fixture world (`@containment/shared/fixtures`), never against the shipped content, so changing the world never breaks an engine test. Add to the fixture when a test needs something it lacks. Only `shippedContent.test.ts`, `layoutFiles.test.ts` and `levelRecipes.test.ts` read the shipped content.
