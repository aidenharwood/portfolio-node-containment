# The Span: world and story rebuild

> **Superseded in part:** the shape of the world described here (a 16 × 6 strip walked west to east between rim walls) is replaced by `2026-11-23-the-span-unrolled.md`: an open island round the Quiet Massif, with the Spindle on its summit and the Span Transit back. The story, creatures, quests, Sites and settlements below still stand.

Written 2026-11-20. Replaces the Hollow Bay world (Low Ward, the Hinterland, Site Meridian) and all its quests. The engine, the furnishing kit, the gear ladders, the crafting chain, the gathering nodes and the creature and prop models are kept and repurposed.

## Pitch

You are a fresh recruit of Intake Cohort 41, Meridian Directorate Containment Service, posted to Site Kestrel at the antispinward end of **the Span**: a ring-habitat arc built by a vanished people, the **Quiet**, two hundred years before the colony ship *Meridian* came down on it. The Quiet left the Span full of sealed **reliquaries**, and every reliquary holds something. The Directorate grew out of the ship's security service. It runs containment Sites along the arc, each rated by **Security Class** (SC-I to SC-V) and by **status**: Secure, Strained, Breached, Overrun, Lost or Inverted.

The tech is late-colonial: hard-light barriers, coil and rail weapons, psionic foci, neon arcologies and corporate megastructures, all standing on precursor ground nobody understands.

You walk spinward (east), from the clean white Site where you trained, through farm terraces, a neon arcology, the wreck of the colony ship, a plain of precursor glass, to the Spindle at the end of the arc.

### The experimental part: what you are

- Kestrel's deepest cell holds **KST-000, the Roster**: a filing cabinet that re-staffs the Directorate. When an operative dies, it prints a new one with their file.
- **Intake Cohort 41 died at Site Tallow two years ago.** You are one of its reprints. So is your sergeant. The Directorate knows, and calls it *containment by employment*.
- Halfway through the story you find your own name on the Tallow casualty board.
- At the Spindle you learn that the Span is itself a containment vessel. **Site Null** is *inverted*: there the anomalies run containment on people, because from the Span's point of view people are the breach.
- The ending is a choice the quests record as a flag: re-seal Null and go back on the Roster, or sign out of it.

## Shape of the world

- **One overworld level, `the-span`**, drawn as one land plan, `content/land/the-span.json`: 16 × 6 squares of 64 tiles (1024 × 384), long and narrow like a strip of the ring.
- **Rim walls.** The north and south edges of the plan are the Span's retaining walls: rock at the top height, never walkable, closing every edge of the plan. In the middle of the band there are lakes, a river (the Spill) running the length of the arc, and precursor ridges.
- **Seams.** The Span is built in segments. Each region boundary is a **Seam**, a precursor bulkhead ridge of rock running from rim to rim, crossed only at its gates. These are the ward borders, and `findSealedWardIssues` holds them. Every gate stands open, so the whole arc is walkable from the first minute. The rising tier and aggressive creatures are what make the way hard.
- **Below ground.** Each Site has a headhouse with a lift down to a facility level. These are blueprint districts with enclosed rooms and links, and they get tighter and stranger the further spinward you go.

## Regions

The tiers follow `TIER_LEVEL_FLOORS` (1 to 13). They first rose by column, west to east; they now rise with walking distance from Site Kestrel, clockwise round the Massif.

| Region | Where | Tiers | Ground | Settlement | Site, SC, status | Below |
| - | - | - | - | - | - | - |
| Kestrel Reach (`kestrel-reach`) | the south coast | 1–2 | Clean Directorate land: lawns, white paving, training yards, a lake | **Kestrel Commons**, a company town and the market hub | **Site Kestrel**, SC-V, Secure; looks like a training Site | Kestrel Intake (B1), T2 |
| Harrow Terraces (`harrow-terraces`) | the Massif's west flank | 3–5 | Stepped farm terraces up a precursor slope, irrigation channels, windpumps | **Harrowgate**, a farming town | **Site Orchard**, SC-II, Strained; its seed stock is getting out into the fields | none |
| Halcyon (`halcyon`) | the north-west | 6–7 | A neon arcology on asphalt: towers, holo billboards, food stalls, steam vents, alleys | **Halcyon Downtown**, under the Aurelian Combine's spire | **Site Gallowglass**, SC-III, Breached; gangs farm what got out | Gallowglass Undercity (B1), T7 |
| The Wreckfield (`wreckfield`) | the north-east coast | 8–9 | Rust flats, a scrap sea and the crashed hull of the *Meridian* | **Rustwater**, a scavenger town in the hull's shadow | **Site Tallow**, SC-IV, Overrun; where Cohort 41 died | Tallow Holding (B1), T9, built: lift from the Tallow forward post |
| The Glass Steppe (`glass-steppe`) | the east plateau | 10–11 | Precursor glass plains, broken pylons, glassy pools, alien soil | **the Choir**, a pilgrim enclave that sings to the reliquaries | **Site Vesper**, SC-IV, Lost; dark and silent | Vesper Deep (B1), T11, built: lift from the Vesper headhouse; the Cradle where the Precentor grew |
| The Spindle (`the-spindle`) | the Massif's summit | 12–13 | The precursor terminus: dark plating, coolant, glass | **Last Post**, the final Directorate camp | **Site Null**, SC-V, Inverted (`uncanny`) | Null (B1), T13 |

Every region has an outpost (a safe building with a storage locker, a quartermaster, an exchange mailbox and a contract board), a Site compound, a settlement and wild land. Kestrel Commons holds the exchange terminal, because it is the home region's hub.

## Creatures

Every creature model is reused under new ids, names and levels, one band per region. The bosses get `encounter` mechanics (telegraphs, summons, hazards), which no creature used before.

| Region | Creatures (model) | Boss | Elite (holding cell) |
| - | - | - | - |
| Kestrel | training drone, sim-wisp (crateWisp), lawn rat (canalRat), courtyard gull (pigeon), feral hound and seam boar (strayDog), grounds mite (gutterMite), drill sentry (trainingDrone) | none; the tutorial ends on a contained wisp | the Drill Master, in Kestrel Intake's Roster Holding |
| Terraces | crop magpie (scrapMagpie), furrow eel and ditch leech (siltEel), seed mite (gutterMite), scarecoat and windpump wight (lineMimic), thornback (strayDog), barn crawler (scrapCrawler) | **The Orchard Keeper** (lamplighter), level 19 | the Thornback Matriarch, in the Seed Vault |
| Halcyon | neon moth and vent moth (mothLantern), alley crawler (scrapCrawler), ad-wraith and holo-shill (vaultEcho), glass hound | **Mr Brightly**, a breached SC-III (redTwin) | the Chrome Crawler, in Gallowglass Holding |
| Wreckfield | rustling, hull knocker and ballast crab (hullKnocker), bilge wraith (tideWraith), misprint (lineMimic) | **The Cohort** (cellBreaker) | the Bosun (rustling), in Tallow Holding |
| Glass Steppe | prism hound (glassHound), glass stalker (cordonStalker), shard wisp (crateWisp), choir echo (vaultEcho), red twin | **The Precentor** (lamplighter, scaled) | Prism Alpha, in Vesper Holding |
| Spindle | null echo (vaultEcho), cell-breaker, null stalker, coolant wraith (tideWraith), clerk of Null (lineMimic) | **The Warden of Null** (warden) | the Null Auditor, in The Outside at Site Null |

Neighbouring districts of a band draw different mixes from the region's roster, so walking a region changes what you fight. Bosses and elites pay `ENCOUNTER_EXPERIENCE_FACTOR` (2.5×) the kill experience of their integrity, outrank every regular creature placed with them and each drop at least one unique. Elites stand once each in a multi-combat holding cell, have 2.5× standard integrity, respawn every 1,500 to 3,000 ticks and drop a 2% unique on top of a guaranteed stack of their region's best materials.

## Crafting chain

The gear ladders and node tiers line up with the regions, so each region supplies the materials for the ladder you wear there:

- Scrap (T1): Kestrel.
- Ferro (T3): Terraces.
- Plasteel (T6): Halcyon.
- Duralloy (T8): Wreckfield.
- Sinter (T10): Glass Steppe.
- Vault-glass (T12): Spindle.

Each node is placed in the region whose tier first covers its level. Item ids stay; their names and descriptions lose Ward places.

## Story

**Act I, Intake (Kestrel).**
- *Report for Intake*: the tutorial covers kit, the yard, a training drone, containing a sim-wisp, the canteen and the oath.
- *Paper Trail*: your file has a field nobody will explain.

**Act II, Strain (Terraces).**
- Site Orchard is losing its seed stock. Clear the fields, contain the scarecoats and put down the Orchard Keeper.

**Act III, Breach (Halcyon).**
- Gallowglass is breached and the Combine wants it kept quiet. Go down into the undercity, trace Mr Brightly through the adverts, and contain him or end him.

**Act IV, Overrun (Wreckfield).**
- Retake Tallow for the Directorate.
- In Tallow Holding you find the casualty board, with your name on it. Defeat the Cohort.

**Act V, Lost (Glass Steppe).**
- Find out why Vesper went silent. The Choir knows. The Precentor sings in the Deep.

**Act VI, Inverted (the Spindle).**
- Cross into Site Null, where the cells are on the outside. Face the Warden of Null and choose.

Every settlement also carries side quests, and every Site has a contract board.

## How it is built

The content is generated by script once, then owned by hand, as the Hinterland was:

- `scripts/span/drawLand.ts` writes `the-span.json`: rim walls, Seams with gates, lakes, the Spill, terraces and the flat pads where settlements and Sites stand.
- `scripts/span/cutSquares.ts` writes a layout file for every land square. Each square follows a short spec of buildings, room recipes, props, creature packs and nodes, so every room is dressed on purpose: a quartermaster's counter faces the door, bunks run along a wall, cells stand in rows.
- The facility levels below ground reuse the three Site Meridian blueprint layouts, retitled, plus new blueprint levels.
- People, dialogue and quests live in `content/span/<region>/`.
- Generic assets (props, nodes, stations, gear, recipes) move out of `ward/` and `seed/` into `content/catalog/`.

**No visual check is available.** We work in a terminal, so the checks are `findContentIssues`, `npm test`, the ASCII plan (`npm run plan`) and `scripts/landPicture.ts` read back as text summaries.

## Build order

1. Write this spec.
2. Tear down the old world and move the generic assets to `content/catalog`. Draw the land and stand up a skeleton of the Span: all regions blocked out with outposts, Sites and settlements, every content check passing.
3. Populate the regions with creatures, nodes and set-pieces, so the crafting chain closes.
4. Write Act I and the Kestrel side quests.
5. Write Acts II to VI and the side quests, region by region, using parallel subagents.
6. Rewrite the docs (README, ARCHITECTURE, WORLD_DESIGN) and the handoff.
