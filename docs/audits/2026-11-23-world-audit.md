# World audit: districts, density and discovery (2026-11-23)

Read-only audit of the Span as shipped at `e90b7d5`. Every figure comes from scripts run against `GAME_CONTENT` (`packages/shared/src/index.ts`), plus the layouts and the land plan. The scripts are in the session scratchpad: `audit.ts`, `qref.ts`, `decor.ts`, `cx.ts`.

## 1. Health checks

- `findContentIssues(GAME_CONTENT)` returns **0 issues**, and that includes `findWorldDesignIssues`.
- I ran `node --test` on content, shippedContent, regions, spanTransit, spanBalance, pointsOfInterest, levels, landSquares, questTransit and audit: **128/128 tests pass**.
- **Reachability is clean.** I flood-filled each level, treating door and gate objects as open. The overworld (1088 × 832) is **one connected walkable component of 488,507 tiles**. Each basement is also a single component (1,177, 1,479 and 1,475 tiles). No district has any walkable tile that cannot be reached from Kestrel Commons.
- **The count is 138, not 141.** There are 138 land squares plus 3 basement districts, which makes 141 districts. `WORLD_DESIGN.md` already says 138.
- **Every creature is placed somewhere**, and every species appears at least once.

The world is structurally sound. Its problem is that most of it is empty.

## 2. Per-region inventory

"Authored" means the square has at least one room, an NPC or a landmark. A "POI" is a room, NPC, interactive object, station, lift or landmark. Decor, gathering nodes and creatures do not count as POIs.

| Region (tiers) | Squares | Authored | Bare | NPCs | Shops | Landmarks | Nodes | Creatures | POI per square | Walkable tiles per POI |
|---|---|---|---|---|---|---|---|---|---|---|
| Kestrel Reach (1–2) | 20 | 3 | 17 | 14 | 6 | 3 | 51 | 269 | 2.9 | 1,201 |
| Harrow Terraces (3–5) | 21 | 3 | 18 | 11 | 5 | 3 | 52 | 313 | 2.7 | 1,351 |
| Halcyon (6–7) | 26 | 5 | 21 | 15 | 8 | 5 | 47 | 329 | 3.1 | 1,103 |
| Wreckfield (8–9) | 20 | 2 | 18 | 6 | 3 | 2 | 33 | 290 | 2.4 | 1,407 |
| Glass Steppe (10–11) | 30 | 2 | 28 | **5** | 2 | 2 | 54 | 473 | **1.3** | **2,786** |
| The Spindle (12–13) | 21 | 2 | 19 | 6 | 2 | 2 | 35 | 332 | 2.1 | 1,720 |
| **Basements** | 3 | 3 | 0 | 1 | 0 | 0 | 12 | 21 | – | – |

The POI averages are inflated, because every POI sits in one of the 20 authored districts.

- **121 of 141 districts (86%) are bare.** They have no rooms, no NPCs and no landmark.
- **A typical bare square** holds about 11.8 decor props, 2.2 gathering nodes and 15.8 creatures across roughly 3,500 walkable tiles.
- **Only 14 bare squares contain anything interactive.** Thirteen of those are Seam gate leaves. The other is the `jammed-sluice` quest object on `sluice-row` (`span/quests/spinward.ts:579`).
- **Most bare-square decor is generic filler**: `street-lamp` (242), `barricade` (175), `burn-barrel` (60), `street-tree` (46), `utility-pole` (45) and `flood-mast` (43). Street lamps and barricades fill the Glass Steppe and the Spindle as well as the city.
- **Five bare squares have no gathering node at all**: `the-stacks`, `signal-street`, `crater-shore`, `candle-flats` and `hollow-pylons`.
- **Most squares are never a quest destination.** I counted an objective as pointing at a square only when it resolves to three districts or fewer; "defeat 5 X" matches every square X lives in. On that basis, **117 of 141 districts are never a specific quest destination**. The only wild squares any quest names are `sluice-row`, `glass-flats`, `pylon-walk` and `shard-moor`.

All 20 authored districts are hubs or Sites:
- kestrel-commons, recruit-lines, site-kestrel
- harrowgate, harrow-lanes, site-orchard
- neon-row, spire-plaza, ninth-street, glasshouse-alley, site-gallowglass
- rustwater, site-tallow
- the-choir, site-vesper
- last-post, site-null
- the three basements

The evocative names of the wild squares promise places that are not built. Examples: `the-bow`, `reactor-scar`, `night-market`, `spire-heights`, `data-docks`, `the-terminus`, `sealed-ground`, `tithe-barns`, `windpump-rise`, `lantern-cove`, `mirror-mere` and `hollow-pylons`. `night-market` is a bare square, while the `night-market` shop is placed elsewhere.

## 3. Encounters by tier

| Tier | Squares | Creatures | Walkable tiles per creature | Species | Nodes | Contracts |
|---|---|---|---|---|---|---|
| 1 | 4 | 23 | 648 | drone, wisp, rat, gull | 3 | 10 |
| 2 | 16 | 246 | 223 | feral-hound, grounds-mite, lawn-rat | 48 | 2 |
| 3 | 8 | 129 | 223 | **furrow-eel, crop-magpie** | 24 | 6 |
| 4 | 4 | 33 | 446 | seed-mite, scarecoat, magpie | 6 | 1 |
| 5 | 9 | 151 | 222 | thornback, seed-mite, scarecoat + Keeper | 22 | **0** |
| 6 | 14 | 165 | 291 | **neon-moth, alley-crawler** | 33 | 8 |
| 7 | 12 | 164 | 245 | ad-wraith, glass-hound, crawler, moth | 14 | 2 |
| 8 | 9 | 127 | 251 | **rustling, hull-knocker** | 19 | 3 |
| 9 | 11 | 163 | 219 | bilge-wraith, rustling, knocker, misprint (8 total) + Cohort | 14 | 3 |
| 10 | 12 | 181 | 242 | **prism-hound, glass-stalker** | 33 | 1 |
| 11 | 18 | 292 | 222 | choir-echo, red-twin, stalker + Precentor | 21 | **0** |
| 12 | 7 | 100 | 258 | **null-echo, cell-breaker** | 14 | 1 |
| 13 | 14 | 232 | 222 | null-stalker, null-echo, cell-breaker | 21 | **0** |

- **Density is even everywhere**, about one creature per 220–260 walkable tiles, roughly a 15 × 15 patch.
- **Variety is thin.** Each region's wild land uses three or four species, repeated across 20–30 squares. Five tiers (3, 6, 8, 10, 12) have only two.
- **There are 31 creatures in total, five of them bosses.** No region has a rare spawn, an elite, a wandering mini-boss or a night or weather variant.
- **Contracts dry up late.** Tiers 10–13 cover 51 squares (37% of the land) but get 2 of the 37 contracts (`contracts.ts`). Tiers 5, 11 and 13 have none. The late game has no repeatable task loop.

Gathering is also thin. Each region has four or five node types, one per skill per band. The highest node is level 50 (`vault-*`), the highest recipe is level 54 and the highest creature is level 58.

## 4. Travel

Distances are BFS tile counts with 4-way movement, from the tram platform to the platform or outpost anchor. They are upper bounds, because the real pathfinder moves diagonally. Players move one tile per 300 ms tick (`server/src/world/world.ts:223`, `config.ts:23`).

| From Kestrel Commons to | Tiles | Walk time |
|---|---|---|
| Harrowgate | 518 | ≤2.6 min |
| Neon Row | 722 | ≤3.6 min |
| Rustwater | 1,170 | ≤5.9 min |
| the Choir | 1,450 | ≤7.3 min |
| Last Post | 1,536 | ≤7.7 min |
| Site Null (farthest Site) | 1,708 | ≤8.5 min |

- **The farthest point** from Kestrel is `summit-road` / `hush-plateau`, at 1,836 tiles (about 9 minutes).
- **Adjacent hubs are 2–4 minutes apart on foot**: Harrowgate to Neon Row is 454 tiles, Neon Row to Rustwater 498, Rustwater to the Choir 418 and the Choir to Last Post 300.
- **Six tram stations** (`span/transit.ts`) put every hub within one ride.
- **The trip between hubs is empty.** Walking times are healthy for an RS-style map, but there are 3–5 bare squares between hubs and no reason to stop in them. There are no waystations, shrines, camps, caves or wild NPCs, and the only reason to leave the road is the next creature pack.

## 5. Where a player runs out of things to do

1. **Exploration runs out after about 20 places.** Once a player has seen the six hubs and six Sites (plus spire-plaza, ninth-street, glasshouse-alley, harrow-lanes and recruit-lines), the other 121 squares are interchangeable. Each is a field of the same 3–4 creatures with lamps and barricades. On foot the whole island is a 9-minute walk.
2. **Basements: 3 of the 6 Sites have none, and two the story promises are missing.** The spec lists *Tallow Holding (B1, T9)* and *Vesper Deep (B1, T11)* (`docs/superpowers/specs/2026-11-20-the-span-design.md`, Regions table).
   - Tallow Holding is only a surface room in `site-tallow` (`districts/layouts/site-tallow.json:21`).
   - The Precentor's examine text says it grew "in the dark of Vesper Deep" (`span/creatures.ts:108`), but it is placed on the surface at `site-vesper`.
   - Site Orchard has no level below it either.
3. **The content ladder stops at 58 and the level cap is 200.**
   - `SKILL_LEVEL_CAP = 200` (`character/skills.ts:88`), but the highest creature is level 58, the highest node 50 and the highest recipe 54.
   - That leaves about **92% of the XP to cap** (40,014 of 478,794) with nothing new to unlock.
4. **Combat XP makes the ladder very short.** `killExperience` (`catalog/creatureKit.ts:44`) was tuned before commits `f0a6789`/`7cff0da` flattened the curve to `12n² + 18n`.
   - One null-echo kill pays 19,931 XP. Going from level 50 to 51 needs 1,206.
   - I simulated always fighting the best creature at or below the player's level. It reaches **combat level 58 in about 43 kills and 200 in about 63**. Fighting five levels under, it takes about 143 and about 164 kills.
   - Gathering pays 140 XP per action at level 50, so taking a gathering skill from level 50 to 200 takes about 3,200 actions.
   - Combat therefore exhausts the entire world in well under an hour of fighting. This is the biggest threat to "many hours", even before any content is added.
5. **The late game has no repeatable work**: two contracts across tiers 10–13 (section 3).
6. **Quests total 40 quests with 128 steps**, about 4–6 hours by a rough 2–3 minutes per step. All side quests are given in hubs, and all but three point back to Sites or hubs.

## 6. Smaller defects

- **No world-map hint for contain steps.** `objectiveDistricts` (`content/questLocations.ts:52`) has no `case 'contain'`, so the world map (`client/src/hud/worldMap.ts:182`) highlights nothing for the 7 contain steps:
  - `intake.ts:31`
  - `spinward.ts:48`, `:175`, `:203` and `:275`
  - `farSpan.ts:63` and `:132`
  - `craft`, `useItem` and `equipItem` also have no case.
- **`misprint` is nearly absent.** It is the only level-35 creature, has only 8 placements in the whole Wreckfield, and fills the gap between hull-knocker (33) and bilge-wraith (37).
- **`sprung-cell-door`** has 21 placements in the Steppe and a single stray one in the Spindle.
- **Tier 1 is four squares** and tier 4 is four squares holding 33 creatures. That band is thin for an act (Harrowgate) that recommends level 8–16.

## 7. Proposed points of interest by region

Each proposal reuses a bare square that already exists and fits its name and tier. Each is data: a room or building from `scripts/span/places.ts` recipes, a few NPCs in `span/people.ts`, objects with `Condition`/`GameEffect` interactions, and creature placements.

**Kestrel Reach (T1–2, 17 bare squares)**
- `firing-line` and `drill-field`: a marksmanship range and an obstacle course, with an NPC drill sergeant and target objects that pay XP.
- `gull-point`: a lighthouse keeper, an eel-trap pier and a short side quest.
- `lantern-cove`: a smugglers' sea cave as a new small T2 basement. It is the first optional dungeon, with a chest secret.
- `seam-wood`: a dormant reliquary that hums. It is a research-skill secret gated on `hasFlag` from `paper-trail`.
- `signal-hill`: a relay mast to repair (engineering).

**Harrow Terraces (T3–5, 18 bare squares; T5 has no contracts)**
- `tithe-barns`: a barn interior with an NPC and a T5 contract board.
- `mill-steps`: a working mill with a refining station.
- `windpump-rise`: repair three windpumps (an `interactWith` chain).
- `drovers-way`: a waystation inn.
- `westcliff`: a cliff cave leading to **Orchard Seed Vault (B1, T5)**, giving Site Orchard its missing underground.
- A rare elite on `top-terrace`: an "overgrown scarecoat".

**Halcyon (T6–7, 21 bare squares)**
- `night-market`: build the market the name promises, with stalls, a fence NPC and a stolen-goods side line.
- `spire-heights`: a tower lobby and lift to a rooftop arena.
- `the-stacks`: a Combine data archive (research nodes and lore terminals).
- `the-underpass` / `undertow`: a second, unlocked sewer entrance into the Gallowglass undercity. The basement is currently reachable only through the Site lift.
- `data-docks`: a courier hub for repeatable delivery contracts.

**Wreckfield (T8–9, 18 bare squares)**
- **Tallow Holding (B1, T9)**: move the casualty-board scene and the Cohort fight down into the level the spec promised.
- `the-bow` / `hull-shadow`: a multi-room **Meridian hull** dungeon (crew decks, a bridge, a sealed cryo bay). This is the region's signature side area.
- `reactor-scar`: a hazard zone with a level-38 elite.
- `cargo-spill`: lootable containers (salvage).
- `boiler-bay`: a scavenger camp NPC and contracts.

**Glass Steppe (T10–11, 28 bare squares, the emptiest region at 2,786 tiles per POI)**
- **Vesper Deep (B1, T11)**: move the Precentor to the place its examine text describes.
- Pilgrim waystations along `hymn-road`, `pilgrim-steps` and `choir-road`, with shrine objects that grant a timed boost.
- `hollow-pylons`: a pylon-tuning puzzle (four `interactWith` steps in order, each setting a flag) that opens a reliquary.
- `mirror-mere`: an `uncanny` reflected pocket.
- `candle-flats`: a vigil camp.
- `drop-edge`: a lookout over the Drop.
- Contracts for T10–11.

**The Spindle (T12–13, 19 bare squares)**
- `sealed-ground`: a post-game reliquary vault (T13+, levels 60–75) opened by the `end-of-file` choice flag.
- `inverse-field`: a mirrored copy of a Kestrel room, done the `uncanny` way.
- `the-terminus`: a precursor control room with lore terminals.
- `coolant-stair`: a hazard climb.
- Repeatable "re-seal" contracts for T12–13.

## 8. Prioritized refinements

### Fix

1. **Re-pace kill XP against the new curve.** Scale `killExperience` down by roughly 10–20×, or restore a steeper curve. Then re-run `spanBalance.test.ts` and add a test pinning "kills to level 58 ≥ N". Files: `catalog/creatureKit.ts:44`, `character/skills.ts:90`, `test/spanBalance.test.ts`. Size: S in code, M in tuning. Without this, no amount of content gives hours.
2. **Highlight contain, craft, useItem and equipItem objectives on the world map.** Contain should resolve like defeat; the others should resolve to the station or the item's source. Files: `content/questLocations.ts`, `test/questHandholding.test.ts`. Size: S.
3. **Build the promised basements.** Vesper Deep, with the Precentor moved into it, and Tallow Holding as a B1 level for the Cohort. Alternatively, amend the spec and `creatures.ts:108`. Files: `scripts/span/below.ts`, `levels/below.ts`, `span/lifts.ts`, `span/creatures.ts`, `layouts/site-tallow.json`, `layouts/site-vesper.json`. Size: M each.
4. **Close the contract gaps** at tiers 5, 11 and 13, with at least 3 per tier for 10–13. File: `contracts.ts`. Size: S.
5. **Thicken the misprint** (it has 8 placements and its band is a gap), and remove the stray `sprung-cell-door` in the Spindle. Files: the Wreckfield and Spindle layouts. Size: S.

### Grow

6. **One authored point of interest in every bare square, starting with the 28 in the Glass Steppe**: a building or camp, one NPC or interactive set-piece, and one landmark. Target at least one POI per square and no more than about 1,500 walkable tiles per POI. Files: `scripts/span/places.ts`, `atlas.ts:71` `PLACES`, the layouts and `span/people.ts`. Size: L, spread over about 120 squares; best done region by region by parallel workers.
7. **Optional dungeons**, one per region: Lantern Cove, the Orchard Seed Vault, Halcyon rooftops or sewers, the Meridian hull, Vesper Deep and the Sealed Ground. Files: `levels/below.ts` and new blueprint layouts. Size: L.
8. **Creature variety.** Add 1–2 species to each two-species tier, one rare elite per region and a roaming mini-boss. Files: `span/creatures.ts` and the layouts. Size: M.
9. **Post-58 ladder.** Use the existing `TIER_LEVEL_FLOORS` pattern to add T14+ content (nodes at 60–100, recipes and creatures) behind the `end-of-file` flag, so the level-200 cap has somewhere to go. Files: `crafting/tiers.ts`, `catalog/*`, `span/creatures.ts`. Size: XL.
10. **Wild-square side quests.** Give each region three or four quests that send the player to named wild squares (windpumps, pylon tuning, the lighthouse, cargo containers), bringing wild squares named by a quest from 4 to about 25. Files: `span/quests/*.ts`. Size: M per region.
11. **Secrets.** Add hidden reliquaries gated by `Condition` (skill level, flag, held item) in about two squares per region, with a collection log. Size: M.
