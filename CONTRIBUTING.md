# Contributing (humans and AI agents)

## Ground rules

- **No code comments.** Make code self-explanatory with precise names, small functions and types. Context that names can't carry belongs in these docs.
- **TypeScript only erasable syntax.** The server runs `.ts` directly on Node 24, so there are no `enum`s, no `namespace`s and no constructor parameter properties. Imports use explicit `.ts` extensions.
- **Domain logic goes in `shared`, and stays pure.** No I/O, no `Date.now()`, no `Math.random()` unless injected. If the client and server both need a rule, it lives there.
- **Content is data.** Before writing engine code for a feature, check whether a new `Condition` or `GameEffect` variant would express it.
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
| Build or modify a district         | `shared/src/content/districts/*.ts`                 |
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
4. Give it a recipe. See "Add a craftable item".

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

A district is one hand-built map. It becomes part of the world when a level places it.

1. Give it a `tier` (1 is the Intake Wing and Atrium, 4 is Sector 3, Deepwatch and the Cryovault, 8 is Meridian Below, 9 is the Dead Letter Office). Crafting checks use it to decide which gear its materials may feed.
2. Draw the map as an array of equal-length strings using `MAP_LEGEND` (`shared/src/world/tiles.ts`): `#` wall, `W` glass, `D` door, `.` plating, `,` concrete, `=` grate, `%` rust, `_` carpet, `!` hazard, `~` coolant, `:` soil, `T` tram track.
3. Define `areas` (rectangles that `enterArea` objectives can use), `npcs`, `objects`, `lights` and `ambience`. Combat is single-way by default; set `multiCombat: true` on an area for boss fights with adds. Mark outposts, camps and hubs `safe: true`: friendly NPCs on a floor level must stand in one, creatures must be placed outside one, and gathering nodes belong in the hostile areas around it.
4. Register it in `DISTRICTS` in `content/gameContent.ts`.
5. Place it on a level (`content/levels/*.ts`) with an `origin` in level coordinates. Districts on one level must not overlap.
6. Connect it:
   - **Walking:** open a doorway at least five tiles wide in its outer wall and add a corridor district (see `content/districts/concourses.ts`) whose floor lines up with the doors on both sides. Dress it with litter, cable runs and bridges over coolant culverts.
   - **Gated:** end the corridor at the district wall with a pressure door: a `passage` object with conditions and a `teleport` inside, plus a return door that teleports back onto the corridor.
   - **Across levels:** use an object whose interaction has conditions and a `teleport` effect, or a tram line. A teleport targets `{ districtId, position }` in district-local coordinates.
7. Run `npm test`. `findLevelIssues` flags overlaps, walkable tiles nothing can reach, duplicate instance ids, and spawns, teleports or recoveries on unwalkable tiles.

### Add a pocket dimension

1. Build its district and a level file with `kind: 'pocket'`, then register both in `gameContent.ts`.
2. Give it an entrance: an object (the `anomaly` model suits a tear in space) whose interaction has `conditions` and a `teleport` into the pocket, plus a way back out.
3. Visiting sets `visited:<levelId>`, which reveals the pocket on the world map. Nothing else is needed.

### Add a tram station

1. Pick an area in the district to act as the platform. Lay a two-tile-wide strip of `T` track against one wall, running wall to wall so both ends meet a wall (the tunnel mouths), and keep the wall behind it solid. Edge the platform side with `!` hazard tiles.
   Place exactly one `tram-car` assembly on the track, facing `north` or `south` for a track along x and `east` or `west` for one along y. Its pieces open the transit map; a `tram-stop` pylon on the platform is optional scenery.
2. Add a `TramStationDefinition` to `TRAM_STATIONS` in `content/tramNetwork.ts`, with an arrival `platform` tile inside that area, in district-local coordinates.
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

### Balancing

`packages/shared/test/balance.test.ts` simulates hundreds of fights between a player whose skills match what the storyline has paid out so far and each creature. Keep these targets when tuning creatures, XP rewards or gear:

| Fight | Target win rate |
| --- | --- |
| Gloam Mites, straight after Live Fire | ≥ 95% |
| Hollow Warden, without healing | ≥ 70% |
| Static Wraiths, for a fresh operative | < 60% |
| Thorn Crawlers, straight after Live Fire | 60–85% |
| Thorn Crawlers, after Sector 2 | ≥ 90% |
| Spore Drifters, after Sector 2 | 70–90% |
| Pipe Leeches, straight after The Knocking | ≥ 95% |
| Lone Rust Hounds, straight after The Knocking | ≥ 75% |
| The Foreman, straight after The Knocking | < 10% |
| The Foreman, trained up in issued gear | < 50% |
| The Foreman, trained up and in Undercroft gear | ≥ 60% |

Act II is tuned against level-matched operatives (Close Quarters and Fortitude at the same level) wearing a full tier set, with the ranged path checked against each tier's carbine or pistol:

| Fight | Target win rate |
| --- | --- |
| Each deep district's first regulars, in the previous tier's gear | ≥ 70–85% |
| Each tier's regulars, in that tier's gear | ≥ 85% |
| Echo Operators at 17 in Rimeguard; Slag Golems at 26 in Archive gear | below 60% and 75% (upgrades matter) |
| Curator 14, Choir 19, Last Archivist 24, Stoker 29, Host 34, each in its own tier's gear | 50–85% |
| Each of those bosses for an operative one tier early | < 30% |
| Act III: Franking Clerks at 34 and Courier Echoes at 35 in Threshold gear | ≥ 85% |
| Act III: the Postmaster at 38 in Threshold gear (melee 50–85%, ranged 50–90%), and at 33 | < 30% at 33 |
| Act III: Courier Echoes at 36 in Dispatch gear | ≥ 90% |
| Act III: the Postmaster at 38 in Dispatch gear, melee and ranged | better than Threshold, ≤ 92% |

The Act II tiers are Rimeguard (12), Relay (16), Archive (20), Furnace (25) and Threshold (30). Each is crafted from the district of the same tier: frost crystal, signal copper, vellum and ink, ember ore, and mirror glass. Act III adds Dispatch (35), crafted from the Dead Letter Office's franking wax and dead letters.

The test fails if a change breaks this curve. Quests can declare a `recommendedRating`; the journal shows it next to the player's own rating.

### Add a new effect or condition

1. Extend the union in `shared/src/rules/effects.ts` or `conditions.ts`.
2. Handle it in `server/src/gameplay/effectRunner.ts` or in `isConditionMet`. TypeScript's exhaustive `switch` will point at every place that needs updating.
3. If it references content ids, teach `findContentIssues` to validate them.

## Testing

- `packages/shared/test` holds pure rule tests.
- `packages/server/test` holds auth and persistence tests against in-memory SQLite, plus gameplay integration tests through `test/support/testHarness.ts`. The harness drives a real `Gameplay` instance with a recording sink and a deterministic RNG.
