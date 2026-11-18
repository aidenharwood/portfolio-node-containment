# Hollow Bay: the city beyond the Cordon

Follows `2026-11-14-first-region-design.md` and `2026-11-14-phase-4-people-quests-items.md`. The Low Ward is built and peopled, and its story ends when the Warden falls and the Cordon gate is ordered open. Skills now run to 200, but content stops at 55. This plan lays out the rest of the city, the Sites in it and what each part carries, from 55 to 200. The empty world it describes is built; the people, quests, creatures and items are the work that follows. Every name is a placeholder the owner can replace.

## The city in one sentence

Hollow Bay is a ring of wards around a bay: the north shore climbs east from the Cordon gate, the south shore runs east from a sluice gate at the Cut, both meet at the Lantern on the headland, and the Hollow lies under the water.

```
 x:     0       1       2       3        4       5       6        7       8       9
                                        ---- the Heights ----
 y-2                                     Observ  SPIRE   Magist
 y-1                                     Incline Cresc   Exchng ═ Viaduct Gaswks  Slag     -- Ironside --
                                           ║
 y 0    Tenem   Market  Scrap            Shipwr  Ropewk  Engine   Mill    BELLOWS Coal
 y 1    Termin  Basin   Fringe  Cordon ═ Gate    CAISSON Hulls    ~~~~    Headld  Keepers
        -------- Low Ward --------      -- Old Shipyards --                         ║
 y 2    Laundry Cut     ~~~~    ~~~~     ~~~~    ~~~~    ~~~~     ~~~~    LANTERN Gulls   -- the Lantern --
                 ║                         the bay                                  
 y 3            Sluice  SaltPan BRINE    ~~~~    ~~~~    ~~~~     ~~~~    Fog     Seawall
                                                                                    ║
 y 4            Stilt   Reeds   Spit   ═ Causewy Shambl  Wharf  ═ Fldgate Arcade  Steps
 y 5                                     Almshs  OSSUARY Gallows  Terrace FATHOM  Brkwatr
                -- Tidemarsh --          ---- Old Town ----       -- Drowned Quarter --

 ═ ║  gated crossing     ~~~~  the bay (no square)     CAPITALS  the ward's Site
```

Each cell is one 64×64 square; the grid is literal, and squares in one ward join along whole edges. The Low Ward is 9 squares; the city beyond is 42 more, so the overworld grows from 256×192 to 640×512 tiles. Walking from Terminus Square to the far corner of the Drowned Quarter takes about four minutes.

## Why it is shaped this way

- **The Cordon was never one wall.** When the anomalies got worse, the Directorate walled each ward off around its Site and held only the Low Ward. Every crossing between wards is a sealed Directorate gate, and the story opens them one at a time. Inside a ward the ground is open, as in the Low Ward.
- **Two arms, so the player criss-crosses the bay.** The north shore (Shipyards, Heights, Ironside) and the south shore (Tidemarsh, Old Town, Drowned Quarter) alternate in level. A player who finishes one ward walks or rides to the other shore for the next, so the whole city stays in use and no arm is a corridor.
- **The bay is the middle.** No square stands on the open water. Shore squares run into it, and trams cross it later as ferries. The Hollow lies under it, and every Site's deepest level leads down towards it.
- **Tier only rises.** Each ward sits beyond the one before it on the shortest walk from Terminus Square, and its gate is the only way in, so `findTierIssues` holds without exceptions.

## The Sites

A Site is a Directorate containment facility and its ward's landmark. Street level holds the compound, low-security holding and the headhouse; the levels below are harder the deeper they go. Each Site was built over a shaft the anomalies came up, and each kind of anomaly made the Directorate build a different kind of Site.

| Site | Ward | What it holds | Above ground | Below ground (planned) | Landmark |
| ---- | ---- | ------------- | ------------ | ---------------------- | -------- |
| Site Meridian | Low Ward | Intake, everything first | Compound on the basin island | B1 Intake, B2 Secure Wing, B3 Vault (built) | The headframe |
| Site Caisson | Old Shipyards | What came out of the water | Dry Dock Four and its caisson | B1 Dock Floor, B2 Pump Galleries, B3 the Sump | The Goliath gantry crane |
| The Brinehouse | Tidemarsh | Growths, spores, things that live | Quarantine station on piles over the flats | B1 Wet Labs, B2 the Cisterns | The windpump |
| The Spire | the Heights | Records, and anomalies that are information | Directorate headquarters | B1 Records, B2 the Stacks, B3 Closed Stacks | The Spire |
| The Ossuary | Old Town | What people worshipped | The cathedral close | B1 the Crypt, B2 the Charnel, B3 the Reliquary | The bell tower |
| Bellows | Ironside | Anomalies that feed on power | A dead power station | B1 Turbine Hall, B2 the Ash Pits | The cooling towers |
| Site Fathom | Drowned Quarter | A Site that went under with its ward | A diving-bell derrick over the water | B1 the Bell Chamber, B2 Flooded Wards, B3 the Abyssal Wing | The diving bell |
| The Lantern | the Lantern | The light that keeps the bay asleep | The lighthouse on the headland | B1 the Lamp Room Below, B2 the Lens Vault | The lighthouse |
| The Hollow | under the bay | Where they all lead | None | The finale, reached from every Site's lowest level | — |

## Levels and tiers to 200

`TIER_LEVEL_FLOORS` stops at 55. Above it, tiers step every 10 levels, and each ward spans two tiers: its gate squares and Site compound take the lower, its far squares and upper Site levels the higher, and the deepest Site level reaches into the next ward's band.

| Tier | Floor | Ward | Material (gear at the floor) |
| ---- | ----- | ---- | ---------------------------- |
| 14 | 60 | Old Shipyards | Keelplate |
| 15 | 70 | Old Shipyards | |
| 16 | 80 | Tidemarsh | Saltglass |
| 17 | 90 | Tidemarsh | |
| 18 | 100 | the Heights | Lodestone |
| 19 | 110 | the Heights | |
| 20 | 120 | Old Town | Reliquary silver |
| 21 | 130 | Old Town | |
| 22 | 140 | Ironside | Blacksteel |
| 23 | 150 | Ironside | |
| 24 | 160 | Drowned Quarter | Drownglass |
| 25 | 170 | Drowned Quarter | |
| 26 | 180 | the Lantern | Lanternglass |
| 27 | 190 | the Lantern | |
| 28 | 200 | the Hollow | Hollowstone (uniques only) |

- Districts already carry their planned tier. `TIER_LEVEL_FLOORS` gains each floor in the same change that ships a creature, a gathering spot and a gear set at it, as the Low Ward's tiers did.
- `depletionChance` spreads node depletion across however many tiers exist, so it must be pinned to tier 13 or rescaled before the table grows, or every existing node will start lasting longer.
- The half-tier between materials (70, 90 and so on) is filled the way the Low Ward fills its dead zones: half-tier gathering spots, field kits and uniques.
- Experience to 200 is 478,794. Level 55 is 7.5% of it, so nine tenths of the climb is still to build. Quests pay through `questPay`, and each ward needs at least one non-boss farm per combat style at each of its two floors, as the balance file already demands for 20 to 50.

## The story beyond the Cordon

The Heart ends with the hatch under the Warden holding and Mercer's orders: open the gate, and find the other end of whatever is under the Site. Each ward is a chapter of one series, opened by the last.

| Chapter | Ward | Levels | Outline |
| ------- | ---- | ------ | ------- |
| **Gate Duty** | Old Shipyards | 55–75 | Open the Cordon gate and hold the far yard. Forward Post Four is Mercer's. Site Caisson was abandoned mid-shift with the caisson half open; something walked out of Dry Dock Four towards the city. At the bottom of the Sump is a hatch exactly like the one under the Warden. Reward: orders for the sluice gate. |
| **Low Water** | Tidemarsh | 75–95 | The marsh folk never left. The Brinehouse grows what it was meant to hold, and the salt pans crystallise around anything that stands still. The Cisterns' records name the Spire as the Site that ordered the others built. Reward: a pass for the Incline. |
| **Head Office** | the Heights | 95–115 | Up the funicular to the Directorate's own headquarters. The Spire's records show the Sites were sited before the anomalies came: someone knew where the shafts would open. Reward: the Causeway gate. |
| **Reliquary** | Old Town | 115–135 | The cathedral built over its shaft centuries before the Directorate, and the Ossuary still keeps the old rites as procedure. The thing they kept is gone, and the rites were a seal. Reward: Ironside's viaduct. |
| **Load Bearing** | Ironside | 135–155 | Bellows powered every seal in the city until it went dark. Turn it back on, and learn what it has been feeding. Reward: the floodgate. |
| **Fathom** | Drowned Quarter | 155–175 | Site Fathom went under with its ward and its staff kept working. Down the diving bell into a Site that is still running shifts. Reward: both roads to the Lantern. |
| **Last Light** | the Lantern | 175–195 | The Lantern's light keeps the bay asleep, and the keeper is dying. Every Site's lowest hatch opens at once. |
| **Hollow Bay** | the Hollow | 195–200 | Down through the hatches into the Hollow, and the thing every Site was built to keep in. The finale needs level 200 in one combat skill. |

Each ward also gets four to six side quests from its residents, a novice-style errand for each of its focus skills, and one early boss of its own, as the Low Ward has Lost Cat and The Drowned Lamp. Quest points gate each chapter's last step, as they gate The Heart.

## Wards

Every ward has an outpost square with a safe outpost building (storage locker, quartermaster, exchange post and contract board), a Site square, filler squares no quest sends you to, and gathering spots for its focus skills on the hostile ground. The outposts and Site compounds are built; their shelves, people and creatures are not.

### The Old Shipyards (tiers 14–15, Salvage and Engineering)

Slipways, dry docks and cranes along the north shore, and the first ground anyone has walked beyond the Cordon in six years. Rusted out, flooded at the slips, and full of things in hulls.

| Square | Tier | What it is | Content to come |
| ------ | ---- | ---------- | --------------- |
| `gatehouse-yard` | 14 | Far side of the Cordon gate. **Forward Post Four** (outpost), the old yard office | Mercer and her squad, the Gate Duty start, gate contracts |
| `shipwrights-row` | 14 | Shipwrights' terraces, the Seafarers' chapel, the union hall. The Incline gate up to the Heights | Residents who stayed, side quests, the chapel's bell |
| `dry-dock-four` | 14 | **Site Caisson**: the flooded dock, the caisson, the headhouse | The Site and its three levels |
| `rope-walk` | 15 | The long ropewalk shed and the timber pond | Rope and fibre for Refining, pond creatures |
| `engine-works` | 15 | Marine engine shops and the boiler yard | Engineering stations, keelplate salvage |
| `hull-graveyard` | 15 | Half-built and beached hulls on the slips into the bay | Hull knockers' big cousins, wreck salvage spots, the ward boss |

### The Tidemarsh (tiers 16–17, Biochemistry)

Salt pans, reed beds and houses on piles south of the Cut, where the marsh folk never left.

| Square | Tier | What it is |
| ------ | ---- | ---------- |
| `sluice-end` | 16 | South of the sluice gate. **Tide Station** outpost |
| `salt-pans` | 16 | Evaporation pans and the windpump |
| `stilt-town` | 16 | Houses on piles; residents |
| `brinehouse` | 17 | **The Brinehouse**: quarantine station over the flats |
| `reedbeds` | 17 | Reed beds and eel weirs |
| `wreckers-spit` | 17 | A shingle spit of wreckers' huts. The Causeway gate east to Old Town |

### The Heights (tiers 18–19, Research)

Uptown on the bluff above the Shipyards: crescents, a university and the Directorate's own tower.

| Square | Tier | What it is |
| ------ | ---- | ---------- |
| `incline-top` | 18 | Top of the funicular from Shipwrights' Row. **Upper Station** outpost |
| `crescent-gardens` | 18 | A grand crescent round an overgrown park |
| `observatory-hill` | 18 | The university and its observatory |
| `exchange-square` | 19 | The old stock exchange and banks. The viaduct gate east to Ironside |
| `the-spire` | 19 | **The Spire**: Directorate headquarters |
| `magistrates-row` | 19 | Courts and the old gaol |

### Old Town (tiers 20–21, Containment)

The medieval city on the south shore, walled long before the Directorate walled it again.

| Square | Tier | What it is |
| ------ | ---- | ---------- |
| `causeway-gate` | 20 | The causeway from Wreckers' Spit. **The Hostel** outpost |
| `the-shambles` | 20 | Narrow lanes round the market cross |
| `almshouses` | 20 | Almshouses round a cloister garth |
| `bishops-wharf` | 21 | The bishop's wharf on the bay. The floodgate east to the Drowned Quarter |
| `cathedral-close` | 21 | **The Ossuary**, under the cathedral |
| `gallows-hill` | 21 | The plague pits and the gallows |

### Ironside (tiers 22–23, Refining and Engineering)

Heavy industry east of the Heights: gasholders, mills and the power station that fed every seal in the city.

| Square | Tier | What it is |
| ------ | ---- | ---------- |
| `viaduct-end` | 22 | Where the railway viaduct comes down from the Heights. **Shift House** outpost |
| `gasworks` | 22 | Gasholders and retort houses |
| `rolling-mill` | 22 | The rolling mill and its yards |
| `slag-hills` | 23 | Slag tips and a tipping line |
| `bellows` | 23 | **Bellows**: the dead power station |
| `coal-staithes` | 23 | Coal wharves on the bay. The headland gate south to the Lantern |

### The Drowned Quarter (tiers 24–25, Salvage and Biochemistry)

The south-east shore, where the bay came up one night and stayed. Streets are canals and the ground floors are under water.

| Square | Tier | What it is |
| ------ | ---- | ---------- |
| `floodgate` | 24 | The floodgate from Bishop's Wharf. **The Roost** outpost, on the rooftops |
| `sunken-arcade` | 24 | A shopping arcade standing in the water |
| `drowned-terraces` | 24 | Terraces up to their sills in the bay |
| `tide-steps` | 25 | Steps up out of the water. The seawall gate north to the Lantern |
| `site-fathom` | 25 | **Site Fathom**: the diving-bell derrick |
| `breakwater` | 25 | The old breakwater and its wrecks |

### The Lantern (tiers 26–27, Psionics)

The headland at the mouth of the bay, reached from both shores.

| Square | Tier | What it is |
| ------ | ---- | ---------- |
| `keepers-row` | 26 | The keepers' cottages. **Keepers' Row** outpost; the headland gate from Ironside |
| `headland-road` | 26 | The road out along the cliffs |
| `seawall` | 26 | The seawall; the gate from the Drowned Quarter |
| `gull-cliffs` | 26 | Cliff paths and the gull colony |
| `the-lantern` | 27 | **The Lantern**: the lighthouse and its compound |
| `fog-signal` | 27 | The fog signal station on the point |

## Gated crossings

Every crossing between wards is a two-wide Directorate gate whose leaves are one door object, so it opens for a player once and stays open.

| Gate | From → to | Opens when |
| ---- | --------- | ---------- |
| Cordon gate | `cordon-gate` → `gatehouse-yard` | The Heart is complete |
| Sluice gate | `the-cut` → `sluice-end` | flag `ward-open:tidemarsh` |
| The Incline | `shipwrights-row` → `incline-top` | flag `ward-open:the-heights` |
| Causeway gate | `wreckers-spit` → `causeway-gate` | flag `ward-open:old-town` |
| Viaduct gate | `exchange-square` → `viaduct-end` | flag `ward-open:ironside` |
| Floodgate | `bishops-wharf` → `floodgate` | flag `ward-open:drowned-quarter` |
| Headland gate | `coal-staithes` → `keepers-row` | flag `ward-open:the-lantern` |
| Seawall gate | `tide-steps` → `seawall` | flag `ward-open:the-lantern` |

Each flag is granted by the reward of the chapter before it. Until a ward's content lands, nothing grants its flag, so the ward is drawn on the map and walkable in the editor but closed in play.

## Travel

- **Walking** reaches everything, as rule 12 requires.
- **The Bay Line** (planned): a tram from Terminus Square through every outpost, its track carried across the bay as a level connector on a causeway, so the shores are a short ride apart once their stations are found.
- **Lifts** go down each Site. The Hollow is reached only from Site lowest levels.

## Engine and kit work this needs

1. **Tiers past 13.** Pin `depletionChance` to the current curve, then grow `TIER_LEVEL_FLOORS` ward by ward.
2. **Capacity.** Re-run `npm run bench:tick` on the 640×512 overworld before raising `capacity`.
3. **The Bay Line.** A trackway across the bay, the terminal rooms and a station per outpost.
4. **Kit per ward.** Each ward needs its own street props, interiors and creature rigs to the art direction, plain and readable. The Site landmarks are built.

## Build order

1. **The empty city (done).** All 42 squares blocked out on the overworld: ground, roads, water, building shells, each Site's compound and landmark, every outpost and its quartermaster, and the eight gates. `2026-11-18-hollow-bay-atlas.svg` is the assembled map. The dressing is a first pass laid by a one-off block-out script, not by hand: it passes every placement check but is plain, and each ward is re-dressed by hand in the editor when its content lands, as `WORLD_DESIGN.md` asks.
2. **The Old Shipyards.** Tiers 14–15 on the tier table, Site Caisson's three levels, people, Gate Duty, side quests, creatures, spots and keelplate.
3. **The Tidemarsh**, then the Heights, Old Town, Ironside, the Drowned Quarter and the Lantern, one ward per plan, alternating shores. Each ward is dressed and peopled by hand in the editor as it lands, and grants the flag for the next.
4. **The Hollow** and the finale.

Each step ends with `npm run typecheck` and `npm test` green, and the owner walks the ward before the next begins.
