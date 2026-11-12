# Creature Footprints and Boss Encounters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creatures occupy 1×1 or 2×2 footprints that block other creatures (never players), and bosses run data-driven encounter mechanics (telegraph, phase, summon, hazard, enrage).

**Architecture:** Pure footprint and encounter rules in `packages/shared`, a sized creature grid plus body occupancy in `LevelInstance`, an `EncounterController` called from `CombatController`, new `encounter.*` server messages, and a client `EncounterLayer`.

**Tech Stack:** TypeScript (erasable only), Node 24 `node:test`, Three.js client.

**Spec:** `docs/superpowers/specs/2026-11-12-creature-footprints-and-boss-encounters-design.md`

## Global Constraints

- No code comments. Erasable TypeScript only (no enums, namespaces, parameter properties). Imports use `.ts` extensions.
- Nothing in `shared` calls `Math.random()`; random sources are passed in.
- The server is authoritative; the client only draws what the server sends.
- Players are never body-blocked. Creature bodies block other creatures only.
- `size` is `1 | 2`; `position` is the north-west anchor.
- Telegraph `windupTicks` ≥ 3, and ≥ 4 for `body` and `ring`.
- `npm run typecheck` and `npm test` pass at the end of every task.

## Review Focus

- A player standing on a 2×2 creature's footprint: ranged and melee attacks are refused until they step out; the creature does not attack from inside them either. Test in Task 3.
- A creature whose next step is held by another body: it waits, does not teleport or overlap, and still reaches its target later. Test in Task 4.
- A boss reset mid-fight (leash, target safe, target leaves interest): telegraphs, hazards and adds are all cleared and phase returns to 0. Test in Task 10.
- A boss contained or killed while adds are alive: adds despawn and do not respawn. Test in Task 10.
- A telegraph pending when its target dies or teleports: it still resolves on its tiles and hits only players on them. Test in Task 10.

---

## Part 1: Footprints and body blocking

### Task 1: Footprint helpers

**Files:** Create `packages/shared/src/world/footprint.ts`; export from `packages/shared/src/index.ts`; Test `packages/shared/test/footprint.test.ts`

**Produces:**
- `type FootprintSize = 1 | 2`
- `footprintTiles(anchor: TilePoint, size: number): TilePoint[]` (row-major from anchor)
- `isInFootprint(point: TilePoint, anchor: TilePoint, size: number): boolean`
- `nearestFootprintTile(anchor: TilePoint, size: number, from: TilePoint): TilePoint` (clamp from into the square)
- `footprintCentre(anchor: TilePoint, size: number): { x: number; y: number }` (`anchor + (size-1)/2`)
- `fitsFootprint(grid: WalkabilityGrid, anchor: TilePoint, size: number): boolean`
- `sizeOf(definition: { size?: FootprintSize }): FootprintSize`

- [ ] Test: `footprintTiles({x:3,y:4},2)` deep-equals `[{3,4},{4,4},{3,5},{4,5}]`; `nearestFootprintTile({x:3,y:4},2,{x:9,y:0})` is `{4,4}`; `footprintCentre({x:3,y:4},2)` is `{3.5,4.5}`; `fitsFootprint` false when one of the four tiles is unwalkable.
- [ ] Run `node --test packages/shared/test/footprint.test.ts` → FAIL, then implement, then PASS. Commit.

### Task 2: Goal predicates in `findPath`

**Files:** Modify `packages/shared/src/world/pathfinding.ts`; Test `packages/shared/test/pathfinding.test.ts`

**Produces:** `PathRequest.isGoal?: (point: TilePoint) => boolean`. When present it replaces the goal test; the heuristic is `max(0, octile(point,to) - 10 * size)` driven by a new optional `goalSlack?: number` (default 0, or 10 when `arriveAdjacent`). The early `!grid.isWalkable(to)` rejection only applies when neither `arriveAdjacent` nor `isGoal` is set.

- [ ] Test `findPath honours a custom goal`: on an open 10×10 grid from `{0,0}` with `to {5,5}` and `isGoal: p => p.x === 3`, the returned path ends on x = 3.
- [ ] Fail → implement → pass. Commit.

### Task 3: Footprint combat geometry

**Files:** Modify `packages/shared/src/combat/combatMath.ts`, `packages/shared/src/combat/containment.ts`; Test `packages/shared/test/combatMath.test.ts`, `packages/shared/test/containment.test.ts`

**Produces:**
- `interface Body { readonly position: TilePoint; readonly size: number }`
- `facingTiles(from: Body, to: Body): { from: TilePoint; to: TilePoint }` — `to = nearestFootprintTile(to, from.position-centre)`, then `from = nearestFootprintTile(from, to)`.
- `bodiesOverlap(a: Body, b: Body): boolean`
- `isBodyWithinAttackRange(attack, from: Body, to: Body, los): boolean` — false when overlapping, else `isWithinAttackRange` on `facingTiles`.
- `bodyDistance(a: Body, b: Body): number` — Chebyshev between `facingTiles`.
- `isWithinContainmentReach(from: TilePoint, to: Body, los)` measures to the nearest footprint tile.

- [ ] Tests: melee player at `{2,4}` hits a 2×2 at `{3,4}`; at `{5,5}` (east edge) also hits; at `{3,4}` (inside) does not; ranged range 5 at `{3,5}` (inside) does not; `bodyDistance({x:0,y:0,size 1},{x:3,y:0,size 2})` is 3.
- [ ] Fail → implement → pass. Commit.

### Task 4: Sized grids, body occupancy and creature movement

**Files:** Modify `packages/shared/src/combat/creatures.ts` (add `size?: FootprintSize`), `packages/server/src/world/levelInstance.ts`, `packages/server/src/world/world.ts`, `packages/server/src/world/creature.ts`; Test `packages/server/test/footprints.test.ts`

**Produces (LevelInstance):**
- `creatureGridFor(size: number): WalkabilityGrid` (cached; size 1 is `creatureGrid`)
- `bodyOccupancy: Map<string, EntityId>`; `occupy(creature)`, `vacate(creature)`, `isBodyFree(anchor, size, self: EntityId): boolean`
- `creaturePathBetween(creature: Creature, to: TilePoint, arriveAdjacent: boolean, maxSearchNodes?: number, avoidAllBodies?: boolean)` — plans on the sized grid; with `arriveAdjacent` the goal is "a footprint tile cardinally adjacent to `to` and `to` not inside the footprint"; blocks tiles of other **2×2** bodies, or every other body when `avoidAllBodies`.
- `isChokepoint(point): boolean`
- `freeAnchorNear(creature, preferred): TilePoint` (ring search radius 6 on sized grid, body free)

**Creature:** `size: FootprintSize` getter; `blockedStep: boolean` set when a step was refused, cleared after the next repath.

**World:** `advanceWalker` for creatures checks `isBodyFree(next)`; if blocked it keeps the path, sets `blockedStep`, and does not move. Occupancy is updated on every move. Wander rejects destinations that do not fit the sized grid or that are chokepoints. All creature paths go through `creaturePathBetween(creature, …)`.

**Combat/respawn hooks:** `Creature.respawn` takes the anchor from `level.freeAnchorNear`; dying/despawn vacates; respawn occupies.

- [ ] Tests (harness, real content): a 2×2 creature's sized grid rejects an anchor beside a wall; two creatures placed next to each other never share a tile after 300 ticks of chasing the same player; a player walks through a creature's tile; wander targets never land on chokepoints (assert `isChokepoint` false for every wander destination over 2000 ticks).
- [ ] Fail → implement → pass. Run full `npm test`. Commit.

### Task 5: Combat uses bodies

**Files:** Modify `packages/server/src/gameplay/combatController.ts`, `packages/server/test/support/testHarness.ts`; Test `packages/server/test/footprints.test.ts`

- Player attack, creature attack, aggro distance and line of sight use `isBodyWithinAttackRange` / `bodyDistance` with `{position, size}`.
- Player chase uses `world.approachBody(player, creature)`: path to a tile cardinally adjacent to the footprint and outside it.
- Creature chase uses `creaturePathBetween(creature, target.position, true, …, creature.blockedStep)`.
- Loot from a creature drops on `nearestFootprintTile(creature, size, killer.position)`.
- Harness `approach` stands the player next to any footprint tile.

- [ ] Tests: a player standing on a 2×2 boss's anchor does not damage it in 20 ticks; after stepping out it does; a 2×2 boss kills credit and drops loot on a footprint tile.
- [ ] Fail → implement → pass. Commit.

### Task 6: Content sizes and `findFootprintIssues`

**Files:** Modify creature content files for the ten 2×2 creatures; Create `packages/shared/src/content/footprintIntegrity.ts`; call it from `findWorldDesignIssues`; move placements that fail; Test `packages/shared/test/worldAudit.test.ts`

**Produces:** `findFootprintIssues(content: GameContent): string[]`, reporting per level: a footprint tile not walkable on the object grid, inside a safe area, or outside the room holding the anchor; two home footprints overlapping.

- [ ] Test: a fixture level copy with a 2×2 creature against a wall reports `"<instance>" footprint does not fit`.
- [ ] Set `size: 2` on hollow-warden, the-foreman, sump-mother, the-stoker, the-host, the-shift-foreman, the-salt-bishop, slag-golem, sump-bloat, rime-husk. Run tests; move each failing placement with `plan.at` offsets until clean. Commit.

### Task 7: Client rendering of footprints

**Files:** Modify `packages/client/src/render/gameRenderer.ts`, `packages/client/src/state/*` world render position

- Rig position is `renderPosition + (size-1)/2`; rig scale `FOOTPRINT_MODEL_SCALE[size]` (`1: 1, 2: 1.75`) on top of existing rig scale; hover ring and containment field scale with it.
- [ ] `npm run typecheck`; run the game, screenshot a 2×2 Hollow Warden. Commit.

## Part 2: Boss encounters

### Task 8: Encounter types and pure rules

**Files:** Create `packages/shared/src/combat/encounters.ts`; add `encounter?: EncounterDefinition` to `CreatureDefinition`; Test `packages/shared/test/encounters.test.ts`

**Produces:** the spec's `EncounterDefinition`, `EncounterPhase`, `BossMechanic`, `TelegraphShape`, `HazardKind` types and:
- `telegraphTiles(shape, reach, anchor, size, facing, target, grid, los): TilePoint[]`
- `phaseIndexFor(encounter, integrityFraction): number` (0 = before any phase)
- `activeMechanicIds(encounter, phaseIndex): Set<string>`
- `spreadHazard(tiles: readonly TilePoint[], grid, maxTiles, random): TilePoint[]` (adds one random cardinal neighbour per existing tile up to `maxTiles`)
- `seedHazard(anchor, size, count, grid, random): TilePoint[]`
- `TELEGRAPH_HIT_SHARE: readonly number[]` indexed by tier-1, from 0.25 at tier 1–2 rising linearly to 0.45 at tier 13.
- `MIN_TELEGRAPH_WINDUP = 3`, `MIN_SURROUND_WINDUP = 4`.

- [ ] Tests: `line` reach 3 facing east from a 2×2 at `{5,5}` covers x 7..9 for y 5..6; `ring` reach 1 around a 1×1 is 8 tiles; `body` around a 2×2 is 16 tiles; `cone` reach 2 facing south covers 1 + 3... tiles (row 1: 1 wide? use widths 3 then 5); phases `[0.6, 0.25]` give index 0 at 0.7, 1 at 0.5, 2 at 0.2; `spreadHazard` with a seeded random never exceeds `maxTiles`.
- [ ] Fail → implement → pass. Commit.

### Task 9: `findEncounterIssues`

**Files:** Create `packages/shared/src/content/encounterIntegrity.ts`; call from `findContentIssues`; Test `packages/shared/test/encounters.test.ts`

Reports each fairness rule from the spec. The tier cap uses `maxIntegrityFor` of a reference character whose Fortitude level equals the boss level.

- [ ] Tests: each rule fails on a minimal fixture `GameContent` copy with one bad creature. Fail → implement → pass. Commit.

### Task 10: Protocol, state and `EncounterController`

**Files:** Modify `packages/shared/src/protocol/serverMessages.ts` (+ zod schema if the gateway validates server messages), `packages/server/src/world/creature.ts`, `packages/server/src/world/levelInstance.ts`, `packages/server/src/gameplay/combatController.ts`; Create `packages/server/src/world/encounterState.ts`, `packages/server/src/gameplay/encounterController.ts`; Test `packages/server/test/encounters.test.ts`

**Produces:**
- Messages `encounter.telegraph`, `encounter.resolved`, `encounter.hazard`, `encounter.phase`, `encounter.cleared` as in the spec; `EntitySnapshot.phase?`, `EntitySnapshot.enraged?`.
- `EncounterState` fields per the spec; `Creature.encounter: EncounterState | null`; `Creature.transient: boolean`; `Creature.summoner: EntityId | null`; `Creature.attackOverride: CreatureAttack | null`, `guardOverride`.
- `LevelInstance.addTransientCreature(creatureId, near, summoner, content): Creature`, `removeCreature(entityId)`.
- `EncounterController.update(creature, level, target, tick)`, `reset(creature, level)`, `snapshotFor(creature)` (live telegraphs and hazards for interest entry).
- `CombatController` uses the creature's current attack (override or base), current guard for defence, enrage speed; calls `reset` from `sendHome`, `resetHome`, `defeatCreature`; transient creatures are removed instead of respawning and drop no loot.

- [ ] Tests with injected fixture encounters on real creatures (test-only content copy): a `body` telegraph hits a player who stays and misses one teleported off before `resolvesAtTick`; phase at 0.5 swaps attack style and sends `encounter.phase`; summon spawns `count` adds and they are gone after the boss is sent home; hazard tiles damage a player standing on them and are cleared by reset; enrage halves attack interval after `afterTicks`; review-focus cases above.
- [ ] Fail → implement → pass. Commit.

### Task 11: Roster content

**Files:** Modify boss definitions in `creatures.ts`, `waterworksCreatures.ts`, `deepCreatures.ts`, `officeActors.ts`, `calderCreatures.ts`, `vesperCreatures.ts`; add `multiCombat: true` to each boss's area.

- [ ] Encode the spec's roster table. Run `npm test`; tune `maxHit` until `findEncounterIssues` and existing balance tests pass. Commit.

### Task 12: Client encounter layer

**Files:** Create `packages/client/src/render/encounterLayer.ts`; modify client world state and message handling, `gameRenderer.ts`, `hud/vitalsPanel.ts`

- Telegraph tiles: translucent quads filling from 0 to 1 opacity by `resolvesAtTick`, colour by style; hazard tiles coloured by kind; cleared on `encounter.resolved`/`encounter.cleared`/despawn.
- Target panel phase pips at each `belowIntegrity`; `encounter.phase.announce` as a system notice; enraged mark over the rig.
- [ ] Typecheck; run the game, fight Hollow Warden and see the body slam marked; screenshot. Commit.

### Task 13: Docs and verification

- [ ] Update `ARCHITECTURE.md` (Combat: footprints, body blocking, encounters) and `WORLD_DESIGN.md` (footprint and chokepoint rule; boss rooms multi-combat).
- [ ] `npm run typecheck` and `npm test` pass; `npm run bench:tick` reported. Commit.
