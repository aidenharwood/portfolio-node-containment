# One World: Content Plan to Level 100

## Intent

The skill cap is now **100**. Today's content ends around level 38: Act III, the Dead Letter Office, tier 9 at a level 35 floor. This plan carries progression to 100 while keeping Meridian **one giant, sprawling containment facility** that can be explored on foot, in the way of RuneScape's surface or a WoW continent.

Those games share a shape, and this plan copies it:

- **one continuous overworld**, walkable end to end;
- **difficulty that rises with distance** from the starting hub;
- **dungeons going down**, under the region they belong to;
- **instances** for the strangest places;
- **fast travel only as a shortcut** to places you could also walk to.

For Meridian that means:

| MMO idea | Meridian |
| -------- | -------- |
| Overworld | The main floor, grown outward from the Atrium in rings |
| Zones | **Regions**: wings of the facility, each with an outpost hub |
| Dungeons | Lower floors under each region, reached by lift |
| Instances | Pocket dimensions |
| Flight paths and lodestones | Trams, and lifts once discovered |

### Lore

Meridian is "one of nine deep Sites", and the other eight have written every month for forty years. At the end of Act III they write for real. In this plan, **the other Sites were never far away**. They are wings of the same structure, sealed off behind bulkheads so long ago that Meridian forgot they were attached. Their letters came through the walls.

## 1. Levelling budget

`experienceForLevel` is unchanged, so level 100 costs 1,111,131 XP.

| Level | XP | Share of the 1–100 total |
| ----- | -- | ------------------------ |
| 35 | 86,125 | 8% |
| 50 | 206,219 | 19% |
| 70 | 467,858 | 42% |
| 90 | 860,859 | 77% |
| 100 | 1,111,131 | 100% |

So 92% of the XP lies past today's content. Quests carry the story. Repeatable loops carry the grind: training camps, rich gathering nodes and the existing contract board (section 6).

## 2. Tier table

Extend `TIER_LEVEL_FLOORS` from 9 tiers to 20. Gaps between floors widen as XP per level grows.

| Tier | Floor | Region |
| ---- | ----- | ------ |
| 1–9 | 1 … 35 | Meridian core, the Undercroft, the Deep and pockets (existing) |
| 10 | 40 | Calder Wing |
| 11 | 45 | Calder Wing |
| 12 | 50 | Vesper Wing |
| 13 | 55 | Vesper Wing |
| 14 | 60 | Tallow Wing |
| 15 | 66 | The Gantry |
| 16 | 72 | Lattice Wing |
| 17 | 78 | Meridian Prime |
| 18 | 85 | Meridian Prime |
| 19 | 92 | Nadir |
| 20 | 100 | The Founding |

`findContainmentIssues` requires a seal for every tier, so a tier and its seal must land in the same change, with at least one creature and node at that tier. Each tier is added only when its region ships.

## 3. World layout

### The overworld

The main floor grows outward from the Atrium. The core you know today stays in the middle, and the new wings sit around it in rings. Each wing opens off the core, or off the ring before it, through a wide walkable concourse.

```
                         ┌──────────────────────┐
                         │    Meridian Prime    │  ring 3
                         │     (78–91)          │
                         └──────────┬───────────┘
                         ┌──────────┴───────────┐
                         │     Tallow Wing      │  ring 2
                         │       (60–65)        │
                         └──────────┬───────────┘
 ┌─────────────┐    ┌───────────────┴──────────────┐    ┌─────────────┐
 │ Vesper Wing │════│  Hydroponics · Sector Two ·  │════│ Calder Wing │
 │   (50–59)   │    │  Atrium · Yards · Waterworks │    │   (40–49)   │
 └──────┬──────┘    │        (core, 1–30)          │    └──────┬──────┘
        │           └───────────────┬──────────────┘           │
        │                  ┌────────┴────────┐                 │
        │                  │  Lattice Wing   │  ring 2         │
        │                  │    (72–77)      │                 │
        │                  └────────┬────────┘                 │
        └═════════════ The Gantry (66–71): a freight loop ══════┘
                       around the outside of every wing
```

- **Core (levels 1–30).** Today's main floor: the Atrium, Hydroponics, the Service Yards, the Waterworks and Sector Two. The Intake Wing stays a tutorial reached only by tram.
- **Calder Wing (40–49), east past the Waterworks.** A salt mine wing where the anomalies grow as crystal: brine galleries, a cathedral of salt, miners who never come up. Focus skill: Salvage.
- **Vesper Wing (50–59), west past Hydroponics.** A sanatorium wing whose wards keep treating patients long after the staff left, and a pharmacy that writes its own prescriptions. Focus skill: Biochemistry.
- **Tallow Wing (60–65), north past Sector Two.** Candle-lit catacombs, whose staff venerate what they contain. Focus skill: Containment.
- **Lattice Wing (72–77), south.** A computing wing whose mainframe models the rest of the facility a little too well. Focus skill: Research.
- **The Gantry (66–71), the outer ring.** A freight spur that loops around the outside of every wing. Its yards and moving trains form a level band of their own, and its line is the overworld's outer tram loop. Focus skill: Engineering.
- **Meridian Prime (78–91), the far north.** The original Meridian, exactly, but forty years younger and slightly wrong. It reuses core district maps with altered layouts and palettes. Focus skill: Refining.

### Floors below

Each wing has one or two dungeon floors beneath it, reached by a lift from its outpost. They go deeper and get harder, as the Undercroft and the Deep do under the core. The lowest floors meet in the middle:

- **Nadir (92–99)** is the deepest floor, a ring under every wing. Each wing's lowest dungeon opens onto it.
- **The Founding (100)** lies directly beneath the Atrium, at the bottom of everything, reached only through Nadir. The facility was built down from it.

### Walking scale

Players move one tile per 300ms tick. The main floor is 202 × 106 tiles today, so it takes about a minute to cross. The target overworld is about **900 × 700 tiles**, so walking from the Atrium out to the Gantry takes 2–3 minutes and crossing the whole floor takes 4–5. Trams make that a few seconds once you've discovered the stations.

### Every region has

- an **outpost hub**: a safe area with a storage locker, a shopkeeper, an exchange mailbox, a contract board and a tram station;
- **two to four hostile districts** at its tiers around the outpost;
- **a dungeon lift** in the outpost;
- **landmarks** visible across distance (shafts, chasms, glass atria), and things to find: lore objects, hidden nodes and undiscovered stations.

## 4. Storyline and gating

Act III ends with eight real replies. The new acts run in order, each a main questline in `questlines.ts`.

1. **Act IV · Postmarked** (Calder, Vesper; recommended rating ~45–65). The two wings that asked who you are turn out to be next door. Answer them in person.
2. **Act V · Chain of Custody** (Tallow, the Gantry, Lattice; ~70–95). Carry the countersigned founder's letter wing to wing. Tallow tries to keep it as a relic, the Gantry has been shipping something "to Meridian" for forty years, and Lattice already knows what the letter says.
3. **Act VI · Return Address** (Meridian Prime; ~100–115). Every letter Meridian answered came back from somewhere. Prime is that somewhere.
4. **Act VII · Founding** (Nadir, the Founding; ~115–125). Follow every wing's lowest dungeon down to Nadir, and through it to the Founding beneath the Atrium. The finale needs level 100 in at least one combat skill.

Each wing also has a side questline of 4–6 quests.

**Gating.** Danger does most of the gating, as in RuneScape and WoW. A wing's concourse and outskirts can be explored as soon as a player can survive there, and aggressive creatures above their level stop them. The **story opens each wing's heart**: its outpost door (so its hub is earned), its dungeon lift and its boss areas. Doors use the existing `door: { conditions }` with story flags, and an opened door stays open.

## 5. Engine work

1. **Regions instead of Sites.** Several regions now share one level, so a region belongs to districts, not levels. Replace `LevelDefinition.site` with `DistrictDefinition.region`. A `RegionDefinition` names its hub district. The hub checks from the Sites work (locker, shopkeeper, mailbox) carry over to regions. "Relay arrival" becomes "reachable on foot" (item 2).
2. **Reachable on foot.** A new check: every overworld district other than the Intake Wing must be reachable from the Atrium by walking, counting doors as open but **not** trams. That keeps trams as shortcuts. Today `findLevelIssues` counts tram rides as connections, which would hide a wing reachable only by tram.
3. **Growing the overworld.** Layouts start at tile 0, so wings to the north and west mean shifting today's district origins. Saved characters store level coordinates, so either:
   - store character locations district-local (`{ districtId, position }`, as effects already do) and resolve them on load, which also makes future re-layouts free; or
   - run a one-time shift on load, as `upgradeLegacyLocation` already does.

   The first is preferred.
4. **Capacity.** The main floor holds 300 players, and an overflow layer copies the whole level, so the overworld becomes a world shard, as RuneScape's worlds are. Raise the cap once a load test shows the 300ms tick holds up with players spread across the larger floor.
5. **World map.** One big map of the overworld. Draw region names over their districts and keep undiscovered districts dark until visited. Keep a tab per floor and per pocket.
6. **Outposts.** The exchange mailbox and the contract board both go in every region hub.

## 6. Repeatable content

- **Contracts:** the daily and weekly contract board already exists (`content/contracts.ts`). Each outpost gets a board offering contracts at its region's tiers.
- **Training camps:** one creature camp per tier, tuned for steady XP.
- **Rich nodes:** one high-yield node type per tier for the region's focus skill, away from the outpost.

## 7. Delivery order

Each step leaves the game playable and the checks green.

1. Engine work (section 5).
2. Calder Wing (tiers 10–11), its dungeon and Act IV part 1.
3. Vesper Wing (12–13) and Act IV part 2.
4. Tallow (14), the Gantry (15) and Lattice (16) with Act V, one region per plan. The Gantry loop links the wings as each lands.
5. Meridian Prime (17–18) and Act VI.
6. Nadir (19), the Founding (20) and Act VII.

## Progress

- The `sites-to-100` branch has the level 100 cap and a first pass at the engine work, built for the earlier separate-Sites plan: `LevelDefinition.site`, Site content, `findSiteIssues`, the world map grouped by Site, and the collect-only exchange mailbox. The mailbox carries over unchanged. The Site field and checks become regions in engine step 1.

## Decisions

- **One continuous world.** The other Sites are wings of Meridian, joined on foot. Trams and lifts are shortcuts, never the only way in, apart from the Intake Wing tutorial and the pocket dimensions.
- **The story opens each wing's heart.** Outskirts can be explored early, and danger stops players who arrive too soon.
- **Buy-back stays the same.** Outpost shops buy at the same rate as Meridian's shops do today. It does not rise with tier.
- **Beyond 100 is to be confirmed.** This plan covers tier 20 gear and the Act VII finale and nothing past them.
