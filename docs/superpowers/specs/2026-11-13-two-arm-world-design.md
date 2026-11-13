# The two-arm world: a from-scratch redesign of every level

## Intent

Site Meridian was grown outward one wing at a time, and its shape shows it: tram platforms are corners of offices, the hub's services are spread over rooms that grew by accident, and the order you meet districts in does not follow the story. This redesign redraws **every level** from the storyline, so that a player always knows three things from the shape of the place: where home is, which way is harder, and where the tram stops.

It changes the ground, not the game. No quest, item, creature, recipe, tier or NPC is added or removed.

## Goals

1. **Tram terminals are their own rooms.** Every station is a contained room that holds only the platform, the car and waiting furniture. Terminals join by track, and track may branch and may run on past the last terminal. It need not loop.
2. **The Atrium is the one player hub.** It has a room each for shops, the marketplace terminal, bunks and storage, the contract board, crafting, engineering and biochemistry, all around one plaza.
3. **The world flows from early to endgame.** On every level, the further you walk from the way in, the later in the story you are.
4. **Every level is redrawn**, including dungeon floors and pockets, to the same standard.
5. **Stand-in models are replaced** so that no two different fixtures look identical.

## Non-goals

- No new quests, acts, tiers, items, creatures, recipes or shops. Tallow, Lattice, the Gantry, Prime, Nadir and the Founding are not built; their ground is reserved.
- No engine work beyond the track rule, the terminal rule and whatever the editor needs to show them.
- No change to quest logic. A journal or dialogue line may change only where it names a direction or a room that has moved (listed under "Text that must change").

## Anti-goals

- A district you can only reach by tram (the Intake Wing stays the one exception).
- A tram platform that shares a room with a shop, an NPC desk, a lift or a locker.
- A hub service that a new player must leave the Atrium to find.
- Tier falling as you walk outward.
- A renamed id. Saves, quests and flags name them.

## Constraints

- **Ids are forever.** Every district id, area id, anchor name, NPC id, fixed object instance id and station id survives. Exit ids are not saved anywhere and only level recipes name them, so an exit that changes side is renamed to match (`waterworks.south` becomes `west`). New rooms and areas may be added. The inventory to preserve is each layout file as it stands at commit `d90a183`: its `areas`, `anchors`, `npcs`, `creatures`, every object and assembly whose id does not start `furn-`, and `landmarks`.
- **Counts are kept.** Each district keeps its creatures, gathering nodes, NPCs and quest fixtures, moved into the new rooms. Creature density must stay in band (rule 14), so a district's hostile floor area stays within about 20% of today's unless creatures are re-spread.
- **`WORLD_DESIGN.md` holds**, apart from the two rules this design rewrites. `findContentIssues` must pass after every task.
- **Saves survive.** Stored positions are district-local; one that is no longer walkable falls back to the district's `recovery`. Every layout already has one, and each keeps the target it has today. The four that point at a raw Atrium coordinate (`hydroponics`, `sector-two`, `service-concourse`, `verdance-concourse`) are changed to the Atrium's `recovery` anchor. The main-floor spawn stays the `transit` anchor, now on the Atrium terminal's platform.
- **Tests name points, not numbers.** About 170 test calls use room-relative numbers that a redraw breaks. Each is moved to `inRoom` or to a named anchor; where a test needs one exact spot (beside the bulkhead, at a station), the skeleton adds an anchor for it. Rooms do not keep their old extents for a test's sake.
- Project rules in `CLAUDE.md` and `CONTRIBUTING.md`: no comments, erasable TypeScript, content as data, `npm run typecheck` and `npm test` green.

## Approaches

**Build order**

| Approach | Trade-off |
| -------- | --------- |
| **Skeleton first (chosen).** Change the rules, redraw every level as bare rooms, exits, terminals and fixed fixtures with checks green, then furnish each district as its own task. | The world joins up and can be walked in the editor from the first day; furnishing tasks are small and independent. Costs a period where rooms are bare. |
| District at a time on today's plan. | Never from scratch: today's shape survives. |
| A second world beside the old one, swapped at the end. | Every quest and test points at two maps for the whole job. |

Chosen by Claude; the owner delegated planning.

**Shape of the main floor**

| Shape | Trade-off |
| ----- | --------- |
| A. Bands around the hub. | Tier equals distance, but it is today's plan tidied. |
| B. One long road. | Clearest flow, but the Atrium is not central. |
| **C. Two arms (chosen by the owner).** | The Atrium is central, each arm has a theme and rises in tier along its length. Sector Two leaves its place behind the Atrium's north bulkhead. |

## The design

### Rules that change

1. **Rule 17 becomes "Track is drawn, and it connects."** On each level, every station of a line stands on one connected run of track. The run may branch and may end in a buffer or run on into rock toward reserved ground. The closed-circuit requirement and its check in `findLineIssues` are removed; the connectivity check stays.
2. **New rule: a terminal is its own room. Checked.** A station's area is a room with the `transit` theme that:
   - holds the track straight through, the car, a `hazard` strip, the platform anchor, tram-stop pylons, directory kiosks and waiting furniture, and nothing else (no NPC, shop, locker, lift, crafting station, board or mailbox);
   - is `safe`;
   - joins its district only by `door`-floor links at most 3 tiles wide, at least one, and touches no district exit. The blueprint is not extended: a "gated doorway" is such a link.
3. `findCarIssues` is unchanged: track still runs out of every terminal at both ends. A buffer stop stands in the stub outside the terminal, never inside it.
4. Phase 1 also rewrites the closed-loop cases in `shared/test/tram.test.ts` and the two descriptions of the loop in `ARCHITECTURE.md`. Rides are teleports timed by stop count, so track shape changes nothing at runtime.
5. `tramNetwork.ts` points each station at its new terminal area. Station ids, names and lines are unchanged, so `tram:<stationId>` flags hold. The anchor name `tramPlatform` (and the Atrium's `transit`) is kept and moves into the terminal.
6. **Every** station gets a new room with area id `tram-terminal`. The rooms that are platforms today (`transit-bay`, `lift-bay`, `yard-office`, `platform`, `gatehouse`, `lodge`, `platform-hall`, `dock`, `uplink-lobby`, `flood-stair`, `coolant-lock`) keep their ids, their NPCs, lockers and lifts, and become the hall outside the terminal's doors. Hydroponics' `platform` keeps Oyelaran and its locker and reads as the Verdance outpost.
7. **Quest objectives that mean "arrive by tram" are repointed.** An `enterArea` objective naming a former platform room is changed to `tram-terminal` only where a rider would otherwise no longer complete it on arrival. Known: Cleared for Transit's last step (`meridian-atrium/lift-bay`). This is the one permitted kind of quest-data edit. A Deep Line objective (`deepwatch/platform-hall`) is a lift ride and stays, with `liftArrival` still in `platform-hall`.

### Main floor: two arms from the Atrium

One sentence: **a central hub inside a ring boulevard, with a living arm running west and an industrial arm running east, and a tram trunk along the south side of both.**

```
                                                Sector Two 2            (Tallow: reserved, north)
                                                    ┃ (spur)                       ┆
 Pharmacy ═ Lodge ═ Wards ═ Sanatorium ═════════ Hydro- ═ Verdance ═╔═ Circuit ═╗═ Service ═ Service ═ Water- ═ Calder  ═ Brine ═ Gate- ═ Salt
   13        12      12       Walk 12            ponics 2  Conc. 1   ║  ATRIUM   ║  Conc. 1   Yards 1   works 3  Causeway  Gall.   house   Cathedral
                                                                     ╚═══════════╝                                  10      10      10      11
   ●━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●━━ ┄ (Gantry)
 (stub west)  Vesper                              Verdance             Atrium                  Yards                           Calder
                                                                        ┃
                                                                        ● Intake Wing (tier 1, across the chasm)
                                                                        ┆
                                                              (Lattice: reserved, south)
```

**West, the living arm** (soil, glass, wards): Verdance Concourse → Hydroponics (with Sector Two as a spur off its north side) → Sanatorium Walk → Vesper Wards → Porter's Lodge → Vesper Pharmacy.

**East, the industrial arm** (concrete, water, salt): Service Concourse → Service Yards → Waterworks → Calder Causeway → Brine Galleries → Calder Gatehouse → Salt Cathedral.

- **Every arm district is a through district** with a wide exit toward the hub and one away from it, and a secondary route through its rooms so the walk loops inside each district. The Pharmacy and the Cathedral are the arm ends and set `deadEnd`.
- **Arms are fat, not corridors.** Each district is at least as deep north to south as it is long, with filler rooms on both sides of its main line.
- **Sector Two** is a spur off the north side of Hydroponics (chosen by the owner). It stays a `deadEnd` with one 2-wide gate, its `airlock`, now opening onto a new north gate exit of Hydroponics. The `sector2-bulkhead` assembly keeps its instance id and its key condition and moves from the Atrium's north exit to that gate. The Atrium loses its north exit. A player leaving Sector Two walks back through Hydroponics and the Verdance Concourse to the Atrium.
- **Hydroponics** keeps the Heart Bed at its centre and its 13-wide west exit from the `seed-vault` onto the Sanatorium Walk, so Vesper is reached on foot exactly as today. It is the only arm district with three exits.
- **Story doors** keep their flags: `calder.gate-open`, `calder.nave-open`, `vesper.gate-open`, `vesper.surgery-open`.
- **Tier 3 to tier 10** (Waterworks to Calder) and **tier 2 to tier 12** (Hydroponics to Vesper) are the two cliffs where the Deep sits in the story. Each is marked in the world: a long causeway with a barricaded checkpoint and warning placards at the near end.
- **The Intake Wing** stays south across the chasm, tram only, tier 1.
- **Reserved ground** moves with the plan: Tallow north of the Circuit behind a sealed north bulkhead, Lattice south of the Intake chasm, the Gantry beyond both arm ends where the trunk's stubs point.

**The tram trunk** runs east to west in the rock south of both arms. Each terminal sits on its district's south edge with the bed along its outer side. The trunk carries on as a short stub past the Vesper and Calder terminals. The Meridian Line and the Intake Shuttle keep their station lists.

Through the hub, the bed is drawn in the districts' own blueprints: across the Atrium's south edge through its terminal, then through the Circuit under its west and east boulevards, bridged, to the Circuit's edges, where the connector picks it up. The Intake branch leaves the bed inside the Circuit, south of the Atrium terminal, crosses the south boulevard under bridges and runs out over the chasm. The Atrium and the Circuit are therefore one skeleton task, and the trackway and the Intake Wing's offset follow it.

### The Atrium

An octagonal plaza around the central shaft, with rooms opening off every side through wide openings, so every service is visible from the middle.

| Room (area id) | What it holds | Status |
| -------------- | ------------- | ------ |
| `plaza` | The central shaft landmark, directory pylons, seating, storyline quest givers | kept |
| `requisitions` | Shops: the quartermaster and every Atrium shopkeeper, counters | kept |
| `exchange` | The market terminal (`atrium-exchange`, today in `requisitions`), order boards | **new** |
| `bunkhouse` | Bunks along the walls, the storage lockers | **new** |
| `response-office` | The contract board (today in `plaza`) and its office counter | kept, now the contract hall |
| `workshop` | Fabrication Hall: the refinery | kept |
| `engineering` | `workshop-fabricator` (moved here), Engineer Lund, the Undercroft service lift where it stands today in the south-east | kept |
| `biochem-lab` | `workshop-synthesiser` (moved here), beside the medbay | **new** |
| `medbay` | Medbay, `medbay-synthesiser` and the `recovery` anchor | kept |
| `archives` | Records, storyline NPCs | kept |
| `quarantine-gate` | The quarantine hall and its guard booth | kept |
| `lift-bay` | The Deep Line lift only | kept, tram removed |
| `tram-terminal` | Atrium Transit Bay, south side, behind doors | **new** |
| `west-gate`, `east-gate` | The arm gates onto the Circuit | kept |

Existing stations move; none is duplicated, and every instance id is kept even where its prefix names its old room.

**The Circuit** stays a ring boulevard around the Atrium, redrawn so its west and east sides are the heads of the two arms and its north and south sides are quiet: dormitories, canteen, stores and offices keep their area ids. A sealed bulkhead stands in the north boulevard (Tallow) and the tram trench runs under the south one, bridged.

### The Deep

One sentence: **a ring causeway around the chasm with Deepwatch on the island, and four sites hung off the ring clockwise in story order.**

- The lift from the Atrium arrives at Deepwatch, as now. Deepwatch keeps its seven safe rooms and gains a `tram-terminal`; its `platform-hall` stays the lift hall.
- The sites keep their sides of the ring, because walking round from the west already meets them in story order: **Cryovault** west (Cold Storage, tier 4), **Signal Array** south (Dead Air, 5), **Drowned Archive** east (Original Contract, 6), then north up the **Furnace Causeway** to the **Furnace** (Stoking the Fire, 7). The ring, the island and every site are still redrawn.
- The **Abyssal Circuit** is an open arc: Deepwatch → Cryovault → Signal Array → Drowned Archive → Furnace, ending in a buffer at the Furnace. Each site's terminal is a new gated `tram-terminal` room; `dock`, `uplink-lobby`, `flood-stair` and `coolant-lock` stay as the entry halls they are named for.

### Dungeon floors

The Undercroft, the Calder Deeps and the Cold Ward (`vesper-cellars`) are each redrawn as winding round chambers with at least one loop, the lift landing at one end and the boss room (`workshop`, `foremans-office`, `almoners-office`) furthest from it. Danger rises room by room along the shortest path from the lift.

### Pockets

A pocket mirrors its original, so each is redrawn after the place it mirrors:

- **Meridian Below** mirrors the new Atrium: the same octagon, flipped, with its rooms in the wrong order.
- **The Verdant Fold** mirrors the new Heart Bed.
- **The Dead Letter Office** mirrors the new Signal Array's relay floor and Operator Pit.
- **The Threshold** (`sector-three`) mirrors the new Sector Two airlock and inner chamber.

They stay small, symmetrical and `uncanny`.

### Text that must change

Only lines that name a direction or room that moved. Expect a long list: the reviewer found such lines in `theKnocking.ts`, `theFarSide.ts`, `clearedForTransit.ts`, `actTwoMain.ts`, `actFourVesper.ts`, `atriumDialogues.ts` and `deepwatchDialogues.ts`. Each skeleton task greps quests and dialogues for compass words and the names of its moved rooms, and lists every edit in its report.

### Stand-in models

Nothing in the code is labelled a placeholder. This design treats as a stand-in any object that shares its model with a different kind of thing:

| Shared model | Objects that need a model of their own |
| ------------ | -------------------------------------- |
| `terminal` | `market-terminal`, `market-mailbox`, `council-terminal`, `curator-ledger`, `relay-console`, `outbox-terminal`, `reactor-console`, `waterworks-assay`, `diagnostic-terminal`, `halvorsen-terminal` |
| `kiosk` | `deeps-time-clock`, `charter-lectern`, `cellar-ledger` (the `intake-kiosk` keeps it) |
| `anomaly` | `return-chute`, `office-return-chute` (the Verdance anomaly and its exit keep it) |
| `bulkhead` | `sector-three-seal` (the doors keep it) |
| `lantern` | `anm-0447-lantern`, `lantern-echo` |
| `locker` | `issue-locker` against `wall-locker` |
| `crate` | `sample-cabinet` |

Each gets a plain model of a few colour blocks with its own silhouette, per the "prefer plain models" rule, plus a furnishing profile where it is placeable. New terminal fittings are added the same way: a buffer stop, a platform gate and a departure board.

## How the work is done

- **Branch.** All work happens on a new branch, `two-arm-world`, with one commit per task.
- **Phase 1, rules.** Rewrite rule 17, add the terminal rule and its check, update `WORLD_DESIGN.md`. Tests for both checks come first.
- **Phase 2, skeletons.** One task per level group, in this order: Atrium and Circuit; east arm; west arm; Intake and the trackway; the Deep; the three dungeon floors; the four pockets. A skeleton is the blueprint, areas, anchors, exits, track, terminal and every fixed-id fixture, NPC, creature and node standing in its new room, with dressing removed and `findContentIssues` green. Each landmark room keeps its one `focal` set-piece through the skeleton, so `landmarks` stays as listed and `findLandmarkIssues` passes. Tests that walk a level are updated with `inRoom` and `anchor`, never with numbers.
- **Phase 3, furnishing.** One task per district: dress every room by hand to the Furnishing and Placement rules, set landmarks and decals, and clear the editor's issues panel.
- **Phase 4, models and documents.** Replace the stand-in models. Rewrite the world sections of `ARCHITECTURE.md` and the shape table and transit section of `WORLD_DESIGN.md`.
- **Who does what.** Claude (the planner) writes each task's brief with the rooms, exits, sizes and ids it must hold, and reviews each result. Sonnet subagents do one task each. Two subagents never edit the same file at once.
- **Checking.** Districts are checked with `npm run plan -- <district>` and in the editor (`/editor.html?district=<id>`, and the level view for seams), not by walking in the game. The planner opens each finished district and each level in the editor before accepting it.

## Left to the builder

- Exact room sizes, origins and district footprints, within the shapes above and the shape-language table.
- Which filler rooms each arm district gains, and each district's landmark where it has none today.
- Where each kept creature, node and fixture stands in its new room.
- The look of each new model.

## Claude's calls (not yet confirmed by the owner)

1. "Placeholder assets" means the shared stand-in models listed above.
2. Decided by the owner: Sector Two is a spur off Hydroponics.
3. The contract board lives in `response-office`; `exchange`, `bunkhouse`, `biochem-lab` and `tram-terminal` are the Atrium's new rooms; the fabricator and synthesiser move out of `workshop`.
4. The Deep keeps its ring, its island and each site's side; it is redrawn and its tram becomes an open arc.
5. Pockets are redrawn as mirrors of their redrawn originals.
6. Work happens on a `two-arm-world` branch with a commit per task.
7. Every station gets a new `tram-terminal` room, and a tram-arrival quest objective is repointed to it.
8. A terminal's "gate" is a door-floor link at most 3 wide; directory kiosks are allowed inside.
9. Exit ids are renamed when their side changes; tests move from numbers to anchors.
