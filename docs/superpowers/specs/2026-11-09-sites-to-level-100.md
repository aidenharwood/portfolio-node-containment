# The Nine Sites: Content Plan to Level 100

## Intent

The skill cap is now **100**. Today's content ends around level 38: Act III, the Dead Letter Office, tier 9 at a level 35 floor. This plan carries progression to 100 by opening the **other eight deep Sites** rather than digging further under Meridian.

The story points straight there. At the end of Act III, "the other eight Sites wrote this morning. Real letters, with real postmarks. Two of them asked who we are." Meridian Below is the far side and has had its answer, so a floor beneath it would undercut that climax. New Sites keep the world growing outward. Each Site is a short stack of its own floors, so descending stays the rhythm inside a Site.

Success means:

- every level from 36 to 100 has a district, creatures, nodes, recipes, a containment seal and a shop at its tier;
- the main story continues from Act III to a finale at level 100;
- `findContentIssues`, `npm run typecheck` and `npm test` pass after every Site lands.

## 1. Levelling budget

`experienceForLevel` is unchanged, so level 100 costs 1,111,131 XP.

| Level | XP | Share of the 1–100 total |
| ----- | -- | ------------------------ |
| 35 | 86,125 | 8% |
| 50 | 206,219 | 19% |
| 70 | 467,858 | 42% |
| 90 | 860,859 | 77% |
| 100 | 1,111,131 | 100% |

So 92% of the XP lies past today's content. Hand-built quests cannot fill that much on their own. Each Site therefore needs **repeatable work** as well as its story: creature camps tuned for training, high-yield nodes, and Site contracts (see 6). Quests carry the story, and the repeatable loops carry the grind.

## 2. Tier table

Extend `TIER_LEVEL_FLOORS` from 9 tiers to 20. Gaps between floors widen as XP per level grows.

| Tier | Floor | Site |
| ---- | ----- | ---- |
| 1–9 | 1 … 35 | Meridian (existing) |
| 10 | 40 | Calder |
| 11 | 45 | Calder |
| 12 | 50 | Vesper |
| 13 | 55 | Vesper |
| 14 | 60 | Tallow |
| 15 | 66 | Gantry |
| 16 | 72 | Lattice |
| 17 | 78 | Meridian Prime |
| 18 | 85 | Meridian Prime |
| 19 | 92 | Nadir |
| 20 | 100 | The Founding Site |

`findContainmentIssues` requires a seal for every tier, so a tier and its seal must land in the same change, together with at least one creature and node at that tier. Add each tier only when its Site ships, not all at once.

Tier 20 is a mastery tier. Its gear and seal need level 100 and come only from the finale.

## 3. The eight Sites

Each Site has a hub outpost (safe area, relay arrival hall, storage locker, shop, workshops), two to four hostile districts across one to three floors (`depth` 0, −1, −2 within the Site), and a pocket where the story calls for one. Each leans on one gathering or production skill, so every skill has a home in the late game.

| Site | Levels | Theme | Skill focus | Floors |
| ---- | ------ | ----- | ----------- | ------ |
| **Calder** | 40–49 | A salt mine Site where the anomalies grow as crystal. Brine galleries, a cathedral of salt, miners who never come up. | Salvage | 2 |
| **Vesper** | 50–59 | A sanatorium Site. Wards that keep treating patients long after the staff left, and a pharmacy that writes its own prescriptions. | Biochemistry | 2 |
| **Tallow** | 60–65 | A reliquary Site of candle-lit catacombs. Its staff venerate what they contain, which has changed what it is. | Containment | 2 |
| **Gantry** | 66–71 | A freight Site built along one endless rail spur. Districts are moving trains and the yards between them. | Engineering | 2 (plus moving-train districts) |
| **Lattice** | 72–77 | A computing Site whose mainframe models the other Sites, and models them a little too well. | Research | 2 |
| **Meridian Prime** | 78–91 | Meridian, exactly, but forty years younger and slightly wrong. The return address on every letter Meridian ever answered. | Refining | 3 |
| **Nadir** | 92–99 | The deepest Site, where all nine relays converge. Pressure, dark and the relays themselves. | All (mixed nodes) | 3 |
| **The Founding Site** | 100 | The founder's Site, sealed since the founding. A single finale complex. | Capstone | 1 plus pocket |

Meridian Prime reuses Meridian's district maps as a base with altered layouts and palettes. That keeps it the cheapest large Site to build, and the familiarity is the point.

## 4. Storyline

Act III ends with eight real replies. The new acts run in order, each a main questline in `questlines.ts`.

1. **Act IV · Postmarked** (Calder, Vesper; recommended rating ~45–65). Answer the two Sites that asked who you are. Calder's director wants proof Meridian is real. Vesper's wards have been reading Meridian's letters and want to send a patient. Ends with the relay line made two-way.
2. **Act V · Chain of Custody** (Tallow, Gantry, Lattice; ~70–95). The founder's letter was addressed to all eight Sites. Carry the countersigned copy Site to Site. Tallow tries to keep it as a relic, Gantry has been shipping something "to Meridian" for forty years, and Lattice already knows what the letter says because it modelled you writing it.
3. **Act VI · Return Address** (Meridian Prime; ~100–115). Every letter Meridian answered came back from somewhere. Prime is that somewhere, and its Achterberg has your handwriting too.
4. **Act VII · Founding** (Nadir, the Founding Site; ~115–125). Follow the relays down to Nadir and through it to the Founding Site. The finale needs level 100 in at least one combat skill to start (`skillLevel` condition).

Combat level tops out at 125 with every combat skill at 100 (`combatLevel`), so the recommended ratings above run up to it.

Each Site also carries a side questline of 4–6 quests, in the style of the Waterworks side quests, for local colour and extra XP.

## 5. Engine work, done once before Calder

1. **`LevelDefinition.site`.** Add a `SiteId`. Every existing level becomes `meridian`. Make `depth` count within a Site.
2. **World map.** Group level tabs by Site, then by depth. Show a Site as "Uncharted" until it has been visited, the way floors work today.
3. **Relay transit.** A relay terminal in the Atrium transit hall and a matching one in each Site's arrival hall. These are teleport objects gated by a `flag` condition set by the story (Sites open by story only), so `planTransit` routes through them with no new code. `findLevelIssues` already checks reachability per level from that level's own spawn, so relays need no change there.
4. **Integrity.** Extend `findContentIssues` so every Site has a safe hub with a storage locker, a shop and a relay arrival.
5. **Marketplace.** The player marketplace stays at the Atrium exchange. Each Site gets a mailbox to collect sales and expired listings, so players aren't forced to commute.

## 6. Repeatable content

- **Site contracts:** the daily and weekly contract board already exists (`content/contracts.ts`). Each Site hub gets a board offering contracts at the Site's tiers.
- **Training camps:** every Site has one creature camp per tier tuned for steady XP, in the style of the Undercroft's pipe leeches and rust hounds.
- **Rich nodes:** each tier has one high-yield node type for its focus skill, placed away from the hub.

## Progress

- **Engine work (section 5) is done** on the `sites-to-100` branch: `LevelDefinition.site`, Site content, `findSiteIssues`, the world map grouped by Site, and the collect-only exchange mailbox. Relays need no engine change.

## 7. Delivery order

Each step leaves the game playable and the checks green.

1. Engine work (section 5).
2. Calder (tiers 10–11) and Act IV part 1.
3. Vesper (tiers 12–13) and Act IV part 2.
4. Tallow (14), Gantry (15) and Lattice (16) with Act V, one Site per plan.
5. Meridian Prime (17–18) and Act VI.
6. Nadir (19), the Founding Site (20) and Act VII.
7. Site contracts, which can land any time after Calder.

## Decisions

- **Sites open by story.** Each Site's relay terminal is gated by a story flag set as its act reaches it, so Sites open in the order of section 4. No Site opens on level alone.
- **Buy-back stays the same.** Site shops buy at the same rate as Meridian's shops do today. It does not rise with tier.
- **Beyond 100 is to be confirmed.** This plan covers tier 20 gear and the Act VII finale and nothing past them. What reaching 100 unlocks will get its own spec.
