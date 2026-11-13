# Two-Arm World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redraw every level of Site Meridian to the two-arm plan, with tram terminals as rooms of their own, the Atrium as the one hub, and no id lost.

**Architecture:** Rules first (track connects instead of loops; a terminal check; an id baseline that guards every later task). Then each level is redrawn as a bare skeleton with checks green, group by group. Then each district is furnished as its own task. Models and documents come last.

**Tech Stack:** TypeScript run directly on Node 24, `node:test`, district layouts as JSON under `packages/shared/src/content/districts/layouts/`, the dev editor at `/editor.html`.

**Spec:** `docs/superpowers/specs/2026-11-13-two-arm-world-design.md`. Read it and `WORLD_DESIGN.md` before any task.

## Global Constraints

- No code comments. Erasable TypeScript only. Imports use `.ts` extensions.
- No new quests, items, creatures, recipes, shops, NPCs or tiers. No station is duplicated.
- Every district id, area id, anchor name, NPC id, station id and non-`furn-` instance id survives. Exit ids may be renamed when their side changes.
- Each district keeps its creatures, nodes, NPCs and quest fixtures; creature density stays between 3 and 14 per thousand hostile tiles.
- Positions in layouts are room-relative. Tests use `inRoom(districtId, roomId)` and `anchor(districtId, anchorId)`, never numbers.
- Quest and dialogue text changes only where it names a direction or room that moved. The only quest-data edit allowed is repointing a tram-arrival `enterArea` objective to `tram-terminal`.
- A task is finished only when `npm run typecheck` and `npm test` both pass.
- Subagents do not run git commands that write. The planner reviews, then commits one commit per task on branch `two-arm-world`.
- Districts are checked with `npm run plan -- <district>` and in the editor (`npm run dev`, `/editor.html?district=<id>`), not by walking in the game.

## Review Focus

1. A saved character standing in a redrawn district logs in: they land on walkable, safe ground (the district's `recovery`), not in a wall. Pinned by Task 3's recovery test.
2. A trainee finishing the tutorial rides to the Atrium: Cleared for Transit completes on arrival in the terminal. Pinned in Task 5.
3. A quest names an area or fixture that a redraw dropped: guidance points nowhere. Pinned by Task 3's baseline test, which every later task must keep green.
4. A terminal quietly regains a locker or NPC during furnishing. Pinned by Task 2's check, wired in at Task 15.
5. A redraw leaves a district reachable only by tram or through a boss room. `findOverworldIssues` covers the first; the reviewer of each skeleton checks the second in the editor's level view.

---

## Phase 1: rules

### Task 1: Track connects instead of loops

**Files:**
- Modify: `packages/shared/src/content/worldDesignIntegrity.ts` (`findLineIssues`, lines 131-154; delete `trackLeaving` if unused)
- Modify: `packages/shared/test/tram.test.ts` (the two loop tests, lines 77-92)
- Modify: `WORLD_DESIGN.md` rule 17; `ARCHITECTURE.md` (the "Tram track" bullet under World structure and the `findWorldDesignIssues` bullet)

- [ ] **Step 1:** Replace the two loop tests. `'every line runs on connected drawn track through its stations'` asserts no issue starting `tram line`. `'cutting the track is reported for the stations beyond the cut'` keeps the existing two-by-two wall gap at `service-concourse` (98..99, 45..46) and asserts that at least one issue includes `no drawn track runs from` and that none includes `closed loop`.
- [ ] **Step 2:** Run `node --test --no-warnings=ExperimentalWarning packages/shared/test/tram.test.ts`. Expected: the second test fails on `closed loop`.
- [ ] **Step 3:** In `findLineIssues` keep the reachability report and delete the `leaving`/`around` block and its issue.
- [ ] **Step 4:** Rewrite rule 17 as "Track is drawn, and it connects": stations of a line share one connected run; it may branch, end in a buffer outside a terminal, or run on toward reserved ground. Keep the Platforms, Inside a district and Between districts paragraphs. Replace "The main floor" paragraph with the trunk described in the spec. Update the two `ARCHITECTURE.md` passages to match.
- [ ] **Step 5:** `npm run typecheck` and `npm test` pass.

### Task 2: The terminal check

**Files:**
- Create: `packages/shared/src/content/terminalIntegrity.ts`
- Create: `packages/shared/test/terminalIntegrity.test.ts`
- Modify: `packages/shared/src/content/prefabs/types.ts` (add `'transit'` to `DRESSING_THEMES` if absent, and whatever record keyed by theme then fails the typecheck)

**Interfaces:**
- Produces: `export const TERMINAL_AREA_ID = 'tram-terminal'`, `export const MAX_TERMINAL_DOOR_WIDTH = 3`, `export function findTerminalIssues(content: GameContent): string[]`. Not yet called from `findContentIssues`; Task 15 wires it in.

A station passes when all of these hold; each failure is one issue naming the station id:

1. its `areaId` is `tram-terminal`: `Tram station "<id>" stands in "<areaId>"; a terminal is a room of its own called "tram-terminal".`
2. the area is `safe`.
3. no NPC stands in the area, and no object in it has an interaction whose effects include `openStorage`, `openShop`, `openMarket`, `openContracts`, `openCrafting` or `teleport`. Objects with `openTramMap`, objects with no interactions, and objects whose id is `intake-kiosk` pass.
4. no exit tile of the district lies inside or cardinally beside the area's rect.
5. every walkable tile cardinally beside the rect and outside it is `door`, and each run of such tiles along one side is at most 3 long; there is at least one run. `track` tiles are ignored.

- [ ] **Step 1:** Tests on synthetic content built by spreading `GAME_CONTENT` (as `tram.test.ts` does): one test per rule above, each asserting the issue text for a station broken in that one way, plus `'a terminal that follows every rule reports nothing'` using a small hand-made level. Use `drawBlueprint` to make the fixture district.
- [ ] **Step 2:** Run the new test file; expected: fails, module not found.
- [ ] **Step 3:** Implement `findTerminalIssues`.
- [ ] **Step 4:** `npm run typecheck` and `npm test` pass. The shipped world still fails this check; that is expected and it is not wired in.

### Task 3: The id baseline

**Files:**
- Create: `scripts/worldBaseline.ts`
- Create: `packages/shared/test/fixtures/worldBaseline.json` (generated, committed)
- Create: `packages/shared/test/worldBaseline.test.ts`

**Interfaces:**
- Produces: `worldBaseline.json` of shape `{ [districtId]: { areas: string[], anchors: string[], npcs: string[], objects: string[], assemblies: string[], creatures: number, nodes: number, landmarks: string[] } }`, read from the layout files as they are now. `objects` and `assemblies` list instance ids not starting `furn-`. `nodes` counts objects whose definition has a `gather` interaction.
- Produces: `MOVED: Record<instanceId, districtId>` in the test, initially `{}`. A later task may add an entry only for a move the spec names (`sector2-bulkhead` to `hydroponics`).

- [ ] **Step 1:** Write the script (`node --no-warnings=ExperimentalWarning scripts/worldBaseline.ts` writes the JSON) and run it once.
- [ ] **Step 2:** Tests: `'no district lost an area, anchor, npc, fixture or landmark'` (every baseline id is still in the same district, or in `MOVED`'s district); `'no district lost creatures or nodes'` (counts equal); `'every recovery point is walkable ground'` (each district's `recovery` resolves through `locate` to a walkable tile, and no layout's recovery is a raw `{x,y}` in another district).
- [ ] **Step 3:** The third test fails today for `hydroponics`, `sector-two`, `service-concourse` and `verdance-concourse`. Change those four layouts' `recovery` to `{ "districtId": "meridian-atrium", "anchor": "recovery" }` in the form the other layouts use.
- [ ] **Step 4:** `npm run typecheck` and `npm test` pass.

---

## Phase 2: skeletons

**What a skeleton is.** For each district in the task: new `steps` (rooms, links, exits, track, pillars), `size`, `areas`, `anchors`, and every baseline NPC, creature, node, fixture and assembly standing in a sensible place in its new room. All `furn-` objects, `setPieces` that are not a landmark's focal piece, `decals` and painted `tiles` are removed. `dressing` keeps each kept room's theme and gains one for each new room. `landmarks` is unchanged. The district's one-sentence plan and the shape-language table in `WORLD_DESIGN.md` decide the shapes.

**Every skeleton task also:**
- updates the level recipe (`content/levels/*.ts`) and the trackway so the level stitches and every station of a line is on connected track;
- gives every station district a `tram-terminal` room that passes Task 2's rules, moves the car, stop pylons, `hazard` strip and platform anchor into it, and repoints the station's `areaId` in `tramNetwork.ts`;
- moves any test number that broke to `inRoom` or a named anchor, adding the anchor to the layout;
- greps `content/quests` and `content/dialogues` for compass words and the names of its moved rooms, fixes the lines that are now wrong, and lists each edit in its report;
- ends with `npm run plan -- <district>` printing `no issues` for each district, and `npm run typecheck` and `npm test` passing, including Task 3's baseline.

**Main-floor exit table.** Width 13 is an open exit; `2g` is a 2-wide gate. An exit keeps its room unless the builder has a better through line.

| District | Exit | Side | Width | Meets |
| -------- | ---- | ---- | ----- | ----- |
| `meridian-atrium` | `west`, `east` | W, E | 11 | the Circuit's hollow (north exit removed) |
| `meridian-circuit` | `west`, `east` | W, E | 13 | `verdance-concourse.east`, `service-concourse.west` |
| `verdance-concourse` | `east`, `west` | E, W | 13 | Circuit, `hydroponics.east` |
| `hydroponics` | `east`, `west`, `north` | E, W, N | 13, 13, 2g | concourse, `vesper-causeway.east`, `sector-two.south` |
| `sector-two` | `south` | S | 2g | `hydroponics.north`; stays `deadEnd` |
| `vesper-causeway` | `east`, `west` (was `north`) | E, W | 13 | Hydroponics, `vesper-wards.east` |
| `vesper-wards` | `east` (was `south`), `west` | E, W | 13, 2g | causeway, `vesper-lodge.east` |
| `vesper-lodge` | `east`, `west` | E, W | 2g, 13 | wards, `vesper-pharmacy.east` |
| `vesper-pharmacy` | `east` | E | 13 | lodge; `deadEnd` |
| `service-concourse` | `west`, `east` | W, E | 13 | Circuit, `service-yards.west` |
| `service-yards` | `west`, `east` (was `north`) | W, E | 13 | concourse, `waterworks.west` |
| `waterworks` | `west` (was `south`), `east` | W, E | 13 | yards, `calder-causeway.west` |
| `calder-causeway` | `west`, `east` (was `south`) | W, E | 13 | Waterworks, `brine-galleries.west` |
| `brine-galleries` | `west` (was `north`), `east` | W, E | 13, 2g | causeway, `calder-gatehouse.west` |
| `calder-gatehouse` | `west`, `east` | W, E | 2g, 13 | galleries, `salt-cathedral.west` |
| `salt-cathedral` | `west` | W | 13 | gatehouse; `deadEnd` |

Terminals sit on the south edge of `meridian-atrium`, `hydroponics`, `service-yards`, `vesper-lodge` and `calder-gatehouse`, bed along the outer side, track running out east and west.

Main-floor tasks run one after another, because they share `mainFloor.ts`. After each, the level must stitch with the districts not yet redrawn, so a task that turns an exit also turns its neighbour's matching exit in the same task (the table's "Meets" column), even when that neighbour's full redraw comes later.

### Task 4: Hydroponics and Sector Two

`hydroponics`, `sector-two`, plus two edits to the Atrium as it stands: delete its `north` exit step and move the `sector2-bulkhead` assembly to the doorway of `hydroponics.north`. Add `'sector2-bulkhead': 'hydroponics'` to `MOVED`. Hydroponics: rounded grow halls on `soil` with `coolant` channels, the Heart Bed central, `platform` kept as the Verdance outpost with Oyelaran and its locker, new `tram-terminal` on the south edge. Sector Two: its seven rooms redrawn, `inner-chamber` furthest from the airlock. Tests that open the bulkhead from the Atrium (`combat.test.ts` near line 152, `questItems.test.ts`, `research.test.ts`) move to anchors `bulkheadOutside` (Hydroponics) and `bulkheadInside` (Sector Two).

### Task 5: The Atrium and the Circuit

`meridian-atrium`, `meridian-circuit`. Atrium: an octagonal `plaza` around the central shaft with the rooms of the spec's table opening off it; new rooms `exchange`, `bunkhouse`, `biochem-lab`, `tram-terminal`. Moves: `atrium-exchange` to `exchange`; the storage lockers to `bunkhouse`; the contract board to `response-office`; `workshop-fabricator` to `engineering`; `workshop-synthesiser` to `biochem-lab`; the tram car and the `transit` anchor to `tram-terminal`; `lift-bay` keeps the Deep Line lift and `deepLineArrival`. Circuit: ring boulevard, its sixteen areas kept, a sealed bulkhead object in `north-boulevard`, the trunk drawn through it per the spec with `bridge` assemblies where boulevards cross. In `clearedForTransit.ts` the last step's `enterArea` becomes `meridian-atrium/tram-terminal`; update `worldAudit.test.ts` to match, and add a test in `server/test` that a trainee who boards at `intake-transit` for `atrium-transit` completes Cleared for Transit on arrival without walking.

### Task 6: The inner arms

`verdance-concourse`, `service-concourse`, `service-yards`, `waterworks`. Yards: long rectangular yards, new `tram-terminal` on the south edge, `yard-office` kept with its NPC. Waterworks: tanks and canals, `pump-house` outpost by the west exit, a second way round the `outfall` boss room to the east exit. A barricaded checkpoint room with warning placards at the Waterworks' east end marks the tier 3 to 10 cliff.

### Task 7: The Calder wing

`calder-causeway`, `brine-galleries`, `calder-gatehouse`, `salt-cathedral`. Gatehouse gains `tram-terminal`; `gatehouse` keeps its NPCs, locker, mailbox, board and lift. Story doors keep `calder.gate-open` and `calder.nave-open`. `the-nave` is furthest from the west exit.

### Task 8: The Vesper wing

`vesper-causeway`, `vesper-wards`, `vesper-lodge`, `vesper-pharmacy`. Lodge gains `tram-terminal`. Story doors keep `vesper.gate-open` and `vesper.surgery-open`. `surgery` is furthest from the east exit. The Sanatorium Walk carries the tier 2 to 12 checkpoint at its east end.

### Task 9: The Intake Wing and the finished trunk

`intake-wing`, and the final shape of the trackway in `mainFloor.ts`: one east-west trunk, the Intake branch leaving it inside the Circuit south of the Atrium terminal, a stub of about 12 tiles past the Vesper and Calder terminals. Intake keeps its eleven areas in tutorial order from `arrival` to `transit-bay`, with a new `tram-terminal` beyond `transit-bay`.

### Task 10: The Deep's ring

`deep-concourse`, `deepwatch`, `furnace-causeway`. Exits keep ids, sides and widths, so the four sites still join. Deepwatch gains `tram-terminal`; `platform-hall` keeps `liftArrival`. The trackway becomes an open arc Deepwatch → Cryovault → Signal Array → Drowned Archive → Furnace with a buffer stub past the Furnace.

### Task 11: Cryovault and Signal Array

Each gains `tram-terminal`; `dock` and `uplink-lobby` stay as entry halls. Boss rooms (`curator-office`, `dish-gantry`) furthest from the gate.

### Task 12: Drowned Archive and Furnace

Each gains `tram-terminal`; `flood-stair` and `coolant-lock` stay as entry halls. Boss rooms (`sealed-room`, `reactor-heart`) furthest from the gate.

### Task 13: The dungeon floors

`undercroft`, `calder-deeps`, `vesper-cellars`, one subagent each, in parallel (each is a level of its own). Winding round chambers with a loop, lift landing at one end, the boss room furthest from it.

### Task 14: The pockets

`meridian-below` (mirror of Task 5's Atrium), `verdant-fold` (Task 4's Heart Bed), `dead-letter-office` (Task 11's relay floor and Operator Pit), `sector-three` (Task 4's airlock and inner chamber). One subagent each, in parallel.

### Task 15: Wire the terminal check in

**Files:** `packages/shared/src/content/contentIntegrity.ts`, `WORLD_DESIGN.md`, `packages/shared/test/terminalIntegrity.test.ts`.

- [ ] Add `'the shipped world has no terminal issues'` asserting `findTerminalIssues(GAME_CONTENT)` is empty. It must pass already.
- [ ] Call `findTerminalIssues` from `findContentIssues`.
- [ ] Add the terminal rule to `WORLD_DESIGN.md` under Transit, marked **Checked**.

---

## Phase 3: furnishing

### Tasks 16 to 46: one per district

One task for each of the 31 layout files, run up to four at a time, never two on one file. Order: `meridian-atrium` first and alone, as the pattern; then outward along each arm; then the Deep; dungeons; pockets.

Each task, for its one district:

- [ ] Read the district's quests, NPCs, room names and `dressing` themes, and each prop's entry in `FURNISHING_PROFILES` before placing it.
- [ ] Dress every room by hand to the Furnishing and Placement sections of `WORLD_DESIGN.md`: `setPieces` for prefabs, `objects` for single pieces, groups of two to six, a walking line two tiles wide between openings, decay placed where the story says.
- [ ] Give each landmark room its `focal` set-piece and add hand-placed `decals`.
- [ ] A terminal gets benches, a departure board and a directory kiosk only.
- [ ] Do not change `steps`, `areas`, `anchors` or any non-`furn-` id. If a room cannot be dressed as drawn, stop and report.
- [ ] `npm run plan -- <district>` prints `no issues`; `npm run typecheck` and `npm test` pass.

The planner then opens the district in the editor, looks at the 2D plan and the 3D view room by room, and sends back anything that breaks the judgement rules.

---

## Phase 4: models and documents

### Task 47: Stand-in models

**Files:** `packages/client/src/render/models/objectModels.ts`, the object definition files under `packages/shared/src/content/`, the `WorldObjectModel` type, `content/furnishingCatalogue.ts`.

One new plain model each for: `market-terminal`, `market-mailbox`, `council-terminal`, `curator-ledger`, `relay-console`, `outbox-terminal`, `reactor-console`, `waterworks-assay`, `diagnostic-terminal`, `halvorsen-terminal`, `deeps-time-clock`, `charter-lectern`, `cellar-ledger`, `return-chute` (shared with `office-return-chute`), `sector-three-seal`, `anm-0447-lantern` (shared with `lantern-echo`), `issue-locker`, `sample-cabinet`. Three new terminal fittings with furnishing profiles homed in `transit`: `buffer-stop`, `platform-gate`, `departure-board`. Each model is a few blocks of colour with its own silhouette; any that hangs on a wall joins `WALL_FIXTURE_MODELS`. Split into three subagent tasks by group (consoles; ledgers, clocks and chutes; terminal fittings and the rest), one after another since they share `objectModels.ts`.

- [ ] A test in `packages/shared/test` asserts that no two of the objects listed above share a `model`.
- [ ] The planner views each new model in the editor's 3D view.

### Task 48: Documents

Rewrite `ARCHITECTURE.md`'s World structure section and `WORLD_DESIGN.md`'s shape-language table, main-floor transit paragraph and Reserved ground section to the built world. Fix the main-floor diagram in the spec so Sector Two is drawn as a spur.

### Task 49: Whole-world check

The planner opens every level in the editor's level view with the issues panel clear, takes a screenshot of each, and runs `npm run typecheck` and `npm test` a last time.
