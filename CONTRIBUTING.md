# Contributing (humans and AI agents)

## Ground rules

- **No code comments.** Make code self-explanatory with precise names, small functions and types. Context that names can't carry belongs in these docs.
- **TypeScript only erasable syntax.** The server runs `.ts` directly on Node 24, so there are no `enum`s, no `namespace`s and no constructor parameter properties. Imports use explicit `.ts` extensions.
- **Domain logic goes in `shared`, and stays pure.** No I/O, no `Date.now()`, no `Math.random()` unless injected. If the client and server both need a rule, it lives there.
- **Content is data.** Before writing engine code for a feature, check whether a new `Condition` or `GameEffect` variant would express it.
- **Every change keeps these green:** `npm run typecheck` and `npm test`.
- `findContentIssues` (in `shared/src/content/contentIntegrity.ts`) validates every cross-reference in the content: item ids, quest steps, dialogue nodes, zone placements, teleport destinations. The server refuses to boot if it reports anything, and the test suite runs it.

## Where things live

| I want to…                         | Go to                                               |
| ---------------------------------- | --------------------------------------------------- |
| Add or tune items                  | `shared/src/content/items.ts`                       |
| Change the new-character kit       | `newCharacter.kit` in `shared/src/content/gameContent.ts` |
| Change how skills drive stats      | `shared/src/character/derivedStats.ts`             |
| Add an NPC                         | `shared/src/content/npcs.ts` + a zone's `npcs`      |
| Write dialogue                     | `shared/src/content/dialogues/*.ts`                 |
| Add an interactive object          | `shared/src/content/worldObjects.ts`                |
| Write a quest                      | `shared/src/content/quests/*.ts`, then register it in `gameContent.ts` |
| Build or modify a zone             | `shared/src/content/zones/*.ts`                     |
| Add a recipe, material or resource node | `shared/src/content/{recipes,craftingItems,craftingObjects}.ts` |
| Change a game rule                 | `shared/src/{character,gear,quests,rules}`          |
| Add a client→server command        | `shared/src/protocol/clientMessages.ts` → `server/src/gameplay/gameplay.ts` |
| Change how something looks         | `client/src/render/*` (voxel models in `render/models`, zones in `render/world`) |
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

**Rule: every piece of gear and every consumable is craftable, from materials found in an appropriately tiered area.** `npm test` enforces it.

1. Add the item.
2. Add a recipe in `content/recipes.ts`:
   - gear goes on the `fabricator`; medicine goes on the `synthesiser`;
   - its level must be at least the item's highest equip requirement.
3. Make sure every ingredient can be sourced, either refined on the `refinery` or gathered raw. A raw source is a resource node or a creature drop placed in a zone with `tier ≤ tierForLevel(recipe level)`.
4. For new raw stock, add a node with `resourceNode(...)` in `content/craftingObjects.ts` and place it in a zone of the right tier. Give its model a builder in `client/src/render/models/craftingModels.ts`.

### Add a quest

1. Create `content/quests/myQuest.ts` that exports a `QuestDefinition`. Give it steps with objectives, `rewards` (effects) and a readable `rewardSummary`.
2. Register it in `GAME_CONTENT.quests` in `gameContent.ts`.
3. Start it from a dialogue option or node effect, `{ type: 'startQuest', questId }`, and set `offeredBy` so the NPC shows a "!" marker. If the offer should wait for earlier quests, list them in `offerRequires` and gate the dialogue option with matching `questCompleted` conditions. The client only sees the quest log, so the marker cannot follow flags.
4. For "hand over X" steps, use a `signal` objective with `npcId`. A dialogue option then gives the item and raises the signal: `takeItem` + `emitSignal`.
5. Gate objects and dialogue with `questActive` conditions using `stepId`.
6. Add an integration test in `server/test` that uses `createHarness()`. `tutorial.test.ts` is a full example.

### Orient an object

Object models face south (+y on the map) by default. Wall-mounted or doorway objects on an east, west or north wall need `facing` on their `ObjectPlacement`, for example `facing: 'east'` for a bulkhead on a west wall. Wide doorways are two adjacent placements of the same object, like the Sector 2 bulkheads in the Atrium and the matching pair inside Sector 2.

### Add a zone

1. Give it a `tier` (1 is the Intake Wing and Atrium, 4 is Sector 3, Deepwatch and the Cryovault, 8 is Meridian Below). Crafting checks use it to decide which gear its materials may feed.
2. Draw the map as an array of equal-length strings using `MAP_LEGEND` (`shared/src/world/tiles.ts`): `#` wall, `W` glass, `D` door, `.` plating, `,` concrete, `=` grate, `%` rust, `_` carpet, `!` hazard, `~` coolant.
3. Define `areas` (rectangles that `enterArea` objectives can use), `npcs`, `objects`, `lights` and `ambience`. Combat is single-way by default; set `multiCombat: true` on an area for boss fights with adds.
4. Connect it to another zone with an object whose interaction has a `teleport` effect.
5. Register it in `GAME_CONTENT.zones`. `npm test` will flag unwalkable spawns, bad teleports and overlapping objects.

### Add a creature

Creatures are passive by default. Set `aggressive: true` only for creatures that should hunt players. They automatically ignore players more than `AGGRESSION_LEVEL_GAP` combat levels above them.

1. Add a `CreatureDefinition` to `content/creatures.ts`: level, integrity, defence, an attack profile, aggro and leash radii, respawn ticks and a loot table.
2. Place it in a zone's `creatures` list. Use `recovery` on dangerous zones so incapacitated players wake somewhere safe.
3. Give it a look: add a `CreatureModel` id and a rig in `client/src/render/models/creatureModels.ts`. Implementing `EntityRig` gives you the attack, hurt and death animation hooks.
4. Reference it from quests with a `defeat` objective. `findContentIssues` validates creature ids, placements and loot items.

### Add a weapon or consumable

- **Weapon:** add `weapon: { style, range, speedTicks }` under `equipment`. Power and Accuracy come from `equipment.stats`. Melee uses Close Quarters, ranged uses Marksmanship.
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
| Each deep zone's first regulars, in the previous tier's gear | ≥ 70–85% |
| Each tier's regulars, in that tier's gear | ≥ 85% |
| Echo Operators at 17 in Rimeguard; Slag Golems at 26 in Archive gear | below 60% and 75% (upgrades matter) |
| Curator 14, Choir 19, Last Archivist 24, Stoker 29, Host 34, each in its own tier's gear | 50–85% |
| Each of those bosses for an operative one tier early | < 30% |

The Act II tiers are Rimeguard (12), Relay (16), Archive (20), Furnace (25) and Threshold (30). Each is crafted from the zone of the same tier: frost crystal, signal copper, vellum and ink, ember ore, and mirror glass.

The test fails if a change breaks this curve. Quests can declare a `recommendedRating`; the journal shows it next to the player's own rating.

### Add a new effect or condition

1. Extend the union in `shared/src/rules/effects.ts` or `conditions.ts`.
2. Handle it in `server/src/gameplay/effectRunner.ts` or in `isConditionMet`. TypeScript's exhaustive `switch` will point at every place that needs updating.
3. If it references content ids, teach `findContentIssues` to validate them.

## Testing

- `packages/shared/test` holds pure rule tests.
- `packages/server/test` holds auth and persistence tests against in-memory SQLite, plus gameplay integration tests through `test/support/testHarness.ts`. The harness drives a real `Gameplay` instance with a recording sink and a deterministic RNG.
