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
2. Add a loot entry to one or more creatures that are placed in a district. Pick the chance by rarity: about 10–15% for a boss's `restricted` or `classified` drop, 3–6% for a boss's `anomalous` drop, 2% from an elite and 1–2% from regular creatures. A containable creature may also roll its unique in its containment loot, at no more than twice its kill chance.
3. `findCraftingIssues` rejects a unique item that has a recipe, that no placed creature drops, that a creature always drops (chance 1), or whose equip requirement is above the level of every creature that drops it.

### Add a quest

1. Create `content/quests/myQuest.ts` that exports a `QuestDefinition`. Give it steps with objectives, `rewards` (effects) and a readable `rewardSummary`.
2. Register it in `GAME_CONTENT.quests` in `gameContent.ts`.
3. Start it from a dialogue option or node effect, `{ type: 'startQuest', questId }`, and set `offeredBy` so the NPC shows a "!" marker. If the offer should wait for earlier quests, list them in `offerRequires` and gate the dialogue option with matching `questCompleted` conditions. The client only sees the quest log, so the marker cannot follow flags.
4. For "hand over X" steps, use a `signal` objective with `npcId`. A dialogue option then gives the item and raises the signal: `takeItem` + `emitSignal`.
5. Gate objects and dialogue with `questActive` conditions using `stepId`.
6. Add an integration test in `server/test` that uses `createHarness()`. `tutorial.test.ts` is a full example.

### Orient an object

Object models face south (+y on the map) by default. Wall-mounted or doorway objects on an east, west or north wall need `facing` on their `ObjectPlacement`, for example `facing: 'east'` for a bulkhead on a west wall. Wide doorways are two adjacent placements of the same object, like the two leaves of a double gate.

### Add a district

Read `WORLD_DESIGN.md` first: it holds the rules, and `findWorldDesignIssues` enforces most of them. A district is a JSON layout file drawn from blueprint steps, and becomes part of the world when a level places it. `content/districts/layouts/brine-galleries.json` is a full example, and `content/districts/brineGalleries.ts` shows the module that loads it.

1. Give it a `tier` (1 to 13, following `TIER_LEVEL_FLOORS`; on the Span it rises with walking distance from Site Kestrel inside each region's band, `squareTiers` in `scripts/span/atlas.ts`: Kestrel 1–2, Harrow 3–5, Halcyon 6–7, the Wreckfield 8–9, the Glass Steppe 10–11, the Spindle 12–13). Crafting checks use it to decide which gear its materials may feed, and tier may not fall with distance from the level spawn.
   Also give it a `region` (`SPAN_REGIONS` in `content/span/people.ts`). Overworld districts must be reachable on foot from the spawn at Site Kestrel; mark one `reachedOnlyByTram` only if it is meant to be.
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

### Cut a land square

Overworld ground beyond the districts is cut from a land plan (`shared/src/content/land/<id>.json`, `world/landPlan.ts`) instead of drawn by blueprint. Read `WORLD_DESIGN.md` (Authoring, rule 7a) first.

1. Draw the land in the editor: `npm run dev`, open `/editor.html?land=<id>` (or a level that uses it), press Edit and pick the land tool (L). Choose the brush's step (`fill`, `line`, `rise`, `ramp`, `ward`, `gate`), shape, tile, height or ward, and draw on the plan; Select picks and reshapes steps and vertices. Undo is shared with district edits. `Ctrl+S` saves through `POST /__editor/land/:id`, which refuses a plan that breaks any square already cut from it. A new plan also needs an entry in `LAND_SOURCES` (`content/land/index.ts`). Plans can also carry `relief` and `soften` steps for height and an `origin` for world coordinates; to grow a plan in any direction, see rule 7a.
2. Write the square's layout, `content/districts/layouts/<district-id>.json`, with `"square": { "column": c, "row": r }` (add `"split": true` and one district per ward where a ward border crosses the square). The square's tiles are its base, under a `ground` room covering the whole square; draw the district's own steps on top. A land square has no `exit` steps: it meets its neighbours across the land itself.
3. Load it with `buildDistrict(layout, land)`, passing the land the level reads, and register it as for any district (tier, region, `DISTRICTS`).
4. In the level recipe, ask for the plan with `context.landOf(<id>)`, set it as the level's `land`, and place the square districts with `placeLandSquares(land, districts)`; use `pinPlacements` to keep a district at a fixed origin. Square `(c, r)` sits at `c × squareSize, r × squareSize` in level coordinates.
5. Run `npm test`. `findLandIssues` checks the plan and every square cut from it, and that neighbouring wards meet in the open along most of their border.

### Add a pocket dimension

1. Build its district and a level file with `kind: 'pocket'`, then register both in `gameContent.ts`.
2. Give it an entrance: an object (the `anomaly` model suits a tear in space) whose interaction has `conditions` and a `teleport` into the pocket, plus a way back out.
3. Visiting sets `visited:<levelId>`, which reveals the pocket on the world map. Nothing else is needed.

### Add a tram station

1. Pick a room in the district to act as the platform. Draw a two-tile-wide bed with `track(...)` straight through it and on out of the district at both ends, and edge the platform side with a `hazard` strip. Then join both ends to the line's track in the level file with `drawTrackway`, so the line's stations share one connected run of track, which may branch or end in a buffer outside a terminal (`WORLD_DESIGN.md`, rule 17). Where the bed crosses floor people need, put `bridge` assemblies over it.
   Place exactly one `tram-car` assembly on the track, facing `north` or `south` for a track along x and `east` or `west` for one along y. Its pieces open the transit map; a `tram-stop` pylon on the platform is optional scenery.
2. Add a `TramStationDefinition` to the station list (`SPAN_TRAM_STATIONS` in `content/span/transit.ts`), with an arrival `platform` tile inside that area, read from the district's `anchors`.
3. Add the station to a line in `SPAN_TRAM_LINES`. Neighbours in a line's list are one stop apart. A station's car serves every line through it, and only those, so riders change lines by getting off at a shared station.
4. Run `npm test`. `findTramIssues` checks the area, the platform, the car and its track, and the line.

On the Span the track is part of the land plan, so a new station is generated rather than drawn: give its hub a `station` in `PLACES` and extend `RAIL` and `TRAM_LINES` in `scripts/span/atlas.ts`, add it to `content/span/transit.ts`, then re-run `drawLand` and `cutSquares`. They draw the track, the walled `tram-terminal`, the car, the departure board and the bridges.

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

`packages/shared/test/spanBalance.test.ts` runs seeded fights between operatives at set skill levels and each Span creature, using the shared combat maths. Keep these bands when tuning creatures, XP rewards or gear:

| Fight | Target win rate |
| --- | --- |
| Lawn rats and courtyard gulls, fresh operative in the issue kit (scrap shock baton and carapace) | ≥ 95% |
| Grounds mites, fresh operative | ≤ 85% |
| Grounds mites, Close Quarters 5 and Fortitude 3 in the issue kit | ≥ 95% |
| Furrow eels, Close Quarters 6 in scrap | ≥ 85% |
| Thornbacks, Close Quarters 8 in scrap | ≤ 25% |
| Thornbacks, Close Quarters 10 with a ferro monoblade | ≥ 80% |
| The Orchard Keeper, Close Quarters 15 in scrap | ≤ 40% |
| The Orchard Keeper, the same operative in ferro | 75–97% |
| Seed mites, level 10 in a full ferro set | ≥ 90% |

The same file also checks that ladder weapons carry only their style's offence stat (the monoblade beats the shock baton, and the power hammer matches or beats the monoblade's damage per tick), that quest rewards give only craftable, non-unique gear and consumables, that the Site Meridian chapters lead straight on with `followUpQuestId`, that quests before Dead Band pay at least three quarters of the Engineering its receiver needs, and that tier-1 food costs no more than 1.5 scrip per point healed, and that the Kit Order contract counts every scrap piece a fabricator makes.

Pacing: `experienceForLevel` (`shared/src/character/skills.ts`) is `12n² + 18n` with `n = level − 1`, capped at `SKILL_LEVEL_CAP` 200: level 10 costs 1,134 XP, 58 costs 40,014, 99 costs 117,012 and 200 costs 478,794. One level step is `experienceStepAt(level)`, `24·level + 6`. Every experience source is sized against that step, and experience is kept to one decimal place (`roundExperience`), so a node can pay 0.9 XP. Creatures built with `beast()` pay `killExperience(level, integrity)` (`content/catalog/creatureKit.ts`): with the 0.1 style XP per point of damage (`STYLE_EXPERIENCE_PER_DAMAGE` in `combat/combatMath.ts`), an on-level kill of standard integrity is worth `1/KILLS_PER_LEVEL` (1/35) of a level step, scaled by integrity. Fortitude earns half of all of it (0.05 per damage plus half of each defeat's reward). `killValue(creature)` is a kill's full style XP, and first studies (`FIRST_STUDY_KILL_SHARE`, 5 kills) and repeat studies (`REPEAT_STUDY_SHARE` of that, at most one every `REPEAT_STUDY_COOLDOWN_TICKS`, 30 seconds) are priced from it. Containment XP is integrity × required level^1.5 × `CONTAINMENT_EXPERIENCE_SCALE` × a class factor (Safe 1, Euclid 1.4, Keter 2), so each new containment tier out-pays the ones below it. Gathering nodes pay about 0.9 XP at level 1 and 4–5 at level 50, and recipes pay for the time it takes to gather and refine their inputs. Past level 28, `beast()` adds a threat term for each level over 28: +5 accuracy for melee creatures (+2.5 ranged, +1.5 psionic), +2 defence and +2 integrity. A creature can pin `accuracy` or `defence`. Out of combat, players regenerate 5% of their maximum integrity every 20 ticks (`shared/src/combat/regeneration.ts`). `test/pacing.test.ts` replays all of this through the scripted model in `test/pacingModel.ts` and pins the targets: one combat style reaches level 58 in 20–30 hours of fighting and keeps climbing more slowly after, each gathering, crafting and containment skill reaches its last unlock in 14–26 hours, repeat study stays near the best trace, a newer containment tier out-pays every older one of the same or a safer class, all quests together pay no more than a third of the way to each skill's last content, and no quest or offer level gate is already met by quest experience alone. Bulwark plate is gated on Close Quarters; Fortitude supplies integrity and guard. Every armour line is a guard: at least two non-boss creatures guard as each of bulwark, skirmisher and warden, set with `guard` on `beast()`. A guard raises the creature's defence by 15% against every style but the one that beats its line (ranged beats warden, melee beats skirmisher, psionic beats bulwark), where it falls by 20% and Study can cut it by a further 30%; warden guards do not toughen melee. Ranged attackers are where skirmisher armour pays: its Deflection is the full base value against plate's 40%. The balance file checks these rules.

Every style gets the same farming guarantee. `lineFight(style, level, creature)` and `linePace` in the balance file put an operative at the style's skill level, with `typicalFortitude`, in its own level-matched armour line (bulwark plate for melee, skirmisher for ranged, warden for psionic) and the strongest weapon of that rung by expected damage per tick (power hammer, pulse carbine at 20 and rail rifle from 30, resonator), since that is what players carry; the pacing and veteran tests above still use the one-handed baton. At combat levels 20, 30, 40 and 50, each style must have a non-boss creature placed at two or more spots that it beats at least 95% of the time, losing no more than 60% integrity on average, at a per-minute rate (counting the wait to heal) of at least 70% of melee's best farm at that level. Attack styles rotate through the bands so each line has something its armour turns. If a change breaks the guarantee, fix it in creature data (style, guard, a pinned stat) rather than loosening the test.

Quest experience is flat. A quest's XP comes from `questPay(skill, level, weight)` (`content/catalog/questPay.ts`): the level step at its recommended level, times `QUEST_PAY_SHARE` (0.18), times a weight of 1 to 4, rounded to 10. A weight of 2 is a bit over a third of a level. Literal `grantExperience` amounts in quests stay in the same range.

A story gate is a `reach` objective (a skill level, combat level or quest points) on the chapter's first `ready` step, not a condition on an NPC's offer. Chapters start one another with `followUpQuestId`, so an offer gated on a skill would never be seen, and the balance file rejects one. If you insert a step before existing ones in a shipped quest, set `stepsAddedBeforeStepIds` so saves written before `QuestProgress.stepId` existed move with it.

The material ladder runs Scrap (1), Ferro (10), Plasteel (20), Duralloy (30), Sinter (40) and Vault Glass (50). Each rung has three components: a plating refined from salvage (Scrap Plating to Vault Glass Plating) for weapons and bulwark armour, a fibre for skirmisher and warden armour (rags, Ballistic Cloth, Synth-weave, Tide Polymer, Red Mesh, Bloom Silk) and a raw trace for psionic gear. Field kits (Overdrive, Optics and Tuning) add a fitting per tier: copper wire, an Induction Coil, a Servo, a Gyro Stabiliser, then cell mesh and hull rivets. Ladder ids are built from the tier and the noun (`ladderWeaponId`, `ladderArmourId` in `content/ward/items.ts`); renaming one adds the old id to `RENAMED_WARD_ITEMS`, which moves it in saved characters and open market orders. Quests can declare a `recommendedLevel`; the journal shows it next to the player's own level.

### Add a new effect or condition

1. Extend the union in `shared/src/rules/effects.ts` or `conditions.ts`.
2. Handle it in `server/src/gameplay/effectRunner.ts` or in `isConditionMet`. TypeScript's exhaustive `switch` will point at every place that needs updating.
3. If it references content ids, teach `findContentIssues` to validate them.

## Testing

- `packages/shared/test` holds pure rule tests.
- `packages/server/test` holds auth and persistence tests against in-memory SQLite, plus gameplay integration tests through `test/support/testHarness.ts`. The harness drives a real `Gameplay` instance with a recording sink and a deterministic RNG.
- Engine tests run against the fixture world (`@containment/shared/fixtures`), never against the shipped content, so changing the world never breaks an engine test. Add to the fixture when a test needs something it lacks. Only `shippedContent.test.ts`, `layoutFiles.test.ts` and `levelRecipes.test.ts` read the shipped content.
