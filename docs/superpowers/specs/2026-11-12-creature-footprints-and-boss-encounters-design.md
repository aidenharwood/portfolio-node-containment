# Creature footprints and boss encounters

## Intent

Creatures should differ in physical size, and bosses should fight like bosses. Today every creature occupies exactly one tile, and every boss is a stat block with a single `CreatureAttack`; its only special rule is containment.

Success means:

- Large creatures **play** large. They can be hit from any edge and cannot squeeze through gaps narrower than they are.
- Creature bodies are solid to each other, so packs spread out and melee crowding is real. Players are never body-blocked.
- Each boss has a **signature** made from a shared, typed mechanic vocabulary. Low-tier bosses teach one slow idea, and high-tier bosses combine several.
- Everything is content data checked by `findContentIssues`. Bosses have no bespoke scripts.

### Decisions taken

| Question | Decision |
|---|---|
| Who gets sizes | Creatures only. Friendly NPCs stay 1×1 and block nobody. |
| Footprint shape | Squares up to 4 tiles of area: `size: 1 \| 2` (1×1 or 2×2). Rotating long bodies (1×2 to 1×4) are out of scope; the footprint helpers are written so a shape can replace the number later. |
| Collision | Every living creature's footprint is solid to other creatures. Players walk through creatures, and players block nothing. |
| Mechanic families | Telegraphed ground attacks, phases, summons, arena hazards and enrage. |
| Tier mapping | A per-boss signature, not a strict unlock ladder. A loose guide and the fairness checks keep low tiers gentle. |
| Approach | Data-driven `BossMechanic` variants run by one `EncounterController`. Hand-scripted bosses were rejected. |

## Part 1: Footprints and body blocking

### Data

- `CreatureDefinition.size?: 1 | 2`, defaulting to 1.
- `Creature.position` stays one `TilePoint`: the footprint's **north-west anchor**. Placements, snapshots and saves keep their shape.
- New pure module `shared/src/world/footprint.ts`:
  - `footprintTiles(anchor, size)` lists the covered tiles.
  - `nearestFootprintTile(anchor, size, from)` returns the covered tile closest to a point. Ties break north, then west.
  - `footprintCentre(anchor, size)` gives the fractional centre the client renders at.
  - `fitsFootprint(grid, anchor, size)` is true when every covered tile is walkable.

### Pathing

- `findPath` gains an optional `isGoal(point)` on `PathRequest`. It overrides `to`/`arriveAdjacent` when present, and the heuristic stays the octile distance to `to`.
- `LevelInstance.creatureGridFor(size)` caches one grid per size. A tile is walkable for size `s` when every tile of the `s×s` block anchored there is walkable and outside safe areas. Size 1 is today's `creatureGrid`.
- `LevelInstance.creaturePathBetween` takes the creature's size. Arriving adjacent means "some footprint tile is cardinally adjacent to the target tile".
- Wander, chase and the walk home all use the sized grid, so a 2×2 cannot follow a player through a 1-wide gap. Leash and the walk home handle the resulting kiting as they do today.

### Body occupancy

Creature bodies block **other creatures only**. Players walk through creatures, and nothing blocks a player; player pathing, the route preview and walk intents are unchanged.

- `LevelInstance.bodyOccupancy: Map<tileKey, EntityId>` is kept current as creatures move, spawn, die and despawn. Only creatures in state `alive` occupy tiles.
- **Planning.** Creature paths route around other **2×2** bodies, which are large and slow to change. They ignore 1×1 bodies, which move too often to plan around. A creature ignores its own body.
- **Stepping.** Before a creature steps, every tile of its next footprint is checked against `bodyOccupancy`. If another body holds one, the creature waits that tick, and its next repath counts every body as blocked. It keeps its target throughout.
- **Respawn and summons.** A creature whose home footprint is held by another creature respawns at the nearest free tile on its sized grid. Summons spawn on the nearest free tiles.
- **Chokepoints.** Wander never picks a destination on a chokepoint tile, so a passive creature never parks in a 1-wide link and stops a chasing pack. A chokepoint is a walkable tile whose walkable cardinal neighbours are exactly two and opposite each other. Creatures still pass through chokepoints.
- **Standing under a creature.** A player may stand on a creature's footprint. Attacks need the attacker outside the target's footprint, so a player under a 2×2 must step out to fight it, and a chasing creature stops with the player beside its footprint, never under it.

### Combat geometry

- `isWithinAttackRange`, `hasLineOfSight` checks in combat, aggro distance, `CONTAINMENT_REACH`, and melee reach all measure between the **nearest footprint tiles** of attacker and target. A player can melee a 2×2 creature from any of its 8 edge-adjacent tiles.
- Loot from a large creature drops on its footprint tile nearest the killer.
- Contributors, credit, single-way combat and containment rules are otherwise unchanged.

### World design (checked)

`findFootprintIssues` runs inside `findWorldDesignIssues` and reports:

- a placed creature whose footprint is not wholly walkable, inside its named room, and outside safe areas;
- two placed creatures whose home footprints overlap.

Density counting is unchanged; one creature counts as one. `WORLD_DESIGN.md` gains a rule for footprints and chokepoints.

### Client

- Rigs are placed at `footprintCentre` and scaled by `size` on top of `modelScale`.
- Pick volume, hover ring, target ring, overhead bar height and the containment field scale with `size`.
- Movement interpolation moves the anchor, so a 2×2 slides as one body.

### Initial sizes

2×2: Hollow Warden, The Foreman, The Sump Mother, The Stoker, The Host, The Shift Foreman, The Salt Bishop, Slag Golem, Sump Bloat, Rime Husk. Every other creature stays 1×1. Each 2×2 placement is moved where needed until `findFootprintIssues` passes.

## Part 2: Boss encounters

### Data

`CreatureDefinition.encounter?: EncounterDefinition`:

```ts
interface EncounterDefinition {
  readonly mechanics: readonly BossMechanic[];
  readonly phases?: readonly EncounterPhase[];
}

interface EncounterPhase {
  readonly belowIntegrity: number;
  readonly announce: string;
  readonly attack?: CreatureAttack;
  readonly guard?: GearMotif;
  readonly enables: readonly string[];
}

type TelegraphShape = 'line' | 'cone' | 'ring' | 'body' | 'circleOnTarget';
type HazardKind = 'coolant' | 'fire' | 'salt' | 'static';

type BossMechanic =
  | { kind: 'telegraph'; id: string; shape: TelegraphShape; reach: number; windupTicks: number; cooldownTicks: number; style: CombatStyle; accuracy: number; maxHit: number }
  | { kind: 'summon'; id: string; creatureId: CreatureId; count: number; everyTicks?: number; maxAlive: number }
  | { kind: 'hazard'; id: string; hazard: HazardKind; seedTiles: number; spreadEveryTicks: number; damagePerTick: number; maxTiles: number }
  | { kind: 'enrage'; id: string; afterTicks: number; speedFactor: number };
```

- A mechanic named in any phase's `enables` starts inactive and turns on when that phase begins. Every other mechanic is active from the pull.
- A `summon` with no `everyTicks` fires once, when it becomes active.
- Phases are one-way within a fight, and are entered in order as integrity falls below each `belowIntegrity` (a fraction of max integrity).

### Shapes

All shapes are computed by `telegraphTiles(shape, reach, anchor, size, facing, target)` and filtered to walkable tiles with line of sight from the boss's centre:

- `line`: a strip as wide as the boss, `reach` tiles long, in the facing direction.
- `cone`: a widening wedge `reach` deep in the facing direction.
- `ring`: tiles at Chebyshev distance 1 to `reach` from the footprint.
- `body`: the footprint and the ring at distance 1.
- `circleOnTarget`: tiles within `reach` of the target's tile when the telegraph starts.

### Behaviour

- `EncounterState` on `Creature` holds the phase index, per-mechanic `readyAtTick`, pending telegraphs (`mechanicId`, tiles, `resolvesAtTick`), hazard tiles, live summon ids and `pulledAtTick`.
- `EncounterController.update(creature, level, target, tick)` is called from `CombatController.updateCreature` while the creature has a target:
  1. It enters any phase whose threshold has been crossed: it swaps `attack` and `guard`, activates the `enables` list, fires `summon`s that trigger on activation, and broadcasts `encounter.phase`.
  2. It resolves pending telegraphs whose tick has come. Every player standing on a marked tile, engaged or not, takes an attack rolled against their defence for the telegraph's style.
  3. Hazards spread on schedule (`spreadHazard`, using the server's random source) and damage players standing on them by a flat `damagePerTick`, ignoring defence.
  4. It starts at most one ready mechanic per tick, and never a new telegraph while one is pending. Normal attacks continue throughout.
- **Enrage** multiplies the creature's attack speed by `speedFactor` once `afterTicks` have passed since the pull.
- **Summons** are transient creatures added with `LevelInstance.addTransientCreature`, with instance ids `<bossInstance>/add-<n>`, spawned on the nearest free tiles to the boss on their sized grid. They aggro the boss's target, give XP and `defeated` quest events, drop no loot, never respawn, and are removed on death.
- **Reset.** `sendHome`, `resetHome`, defeat and containment call `EncounterController.reset`, which clears telegraphs and hazards, despawns live summons and returns the boss to phase 0 with its base attack and guard.
- A boss with any `telegraph` or `hazard` must stand in a `multiCombat` area, because those mechanics hit everyone on the tiles.

### Protocol

New server messages, broadcast near the boss:

- `encounter.telegraph { entityId, mechanicId, shape, tiles, resolvesAtTick }`
- `encounter.resolved { entityId, mechanicId }`
- `encounter.hazard { entityId, hazard, tiles }`, carrying the full tile set whenever it changes
- `encounter.phase { entityId, phase, announce }`
- `encounter.cleared { entityId }`

`EntitySnapshot` gains `phase?: number` and `enraged?: boolean`. A player whose interest gains a boss mid-fight is sent its pending telegraphs and hazards.

### Client

- `render/encounterLayer.ts` draws telegraph tiles that fill toward `resolvesAtTick`, and hazard tiles styled by kind. Hazards follow the existing light and material palette.
- The target panel shows a pip at each phase threshold and the current phase.
- `encounter.phase` posts its `announce` line as a system notice. An enraged boss gets an overhead mark.

### Fairness (checked)

`findEncounterIssues` runs inside `findContentIssues` and reports:

- a telegraph with `windupTicks` below 3, or below 4 for `body` and `ring`;
- a telegraph whose `maxHit` exceeds the tier cap: `TELEGRAPH_HIT_SHARE[tier]` of the reference integrity of a player at the boss's level, the same reference the combat balance tests use (tier 1–2: 25%, rising to 45% at tier 13);
- phases whose `belowIntegrity` values do not strictly descend within (0, 1);
- an `enables` id that names no mechanic, or a mechanic id used twice;
- a summon whose creature does not exist, is higher level than the boss, or has a `containment` or `encounter` of its own;
- a hazard whose `maxTiles` exceeds the walkable tiles of the boss's room;
- a boss with a `telegraph` or `hazard` placed outside a `multiCombat` area.

**Loose tier guide** (judgement, not checked): tier 1–2 bosses have at most one mechanic, a slow telegraph. Phases and summons appear from tier 3. Hazards and enrage appear from tier 8. Tier 10 and above combine three or more families.

### Roster

Tier is `tierForLevel(level)`. The numbers are a starting point for balance tests.

| Boss | Level | Tier | Size | Signature |
|---|---|---|---|---|
| The Understudy | 1 | 1 | 1 | None. It stays the tutorial's plain fight. |
| Hollow Warden | 4 | 1 | 2 | `body` slam, windup 6, cooldown 20. |
| The Foreman | 10 | 3 | 2 | Summons 2 Feral Maintenance Drones every 30 ticks, at most 2 alive. |
| The Sump Mother | 11 | 3 | 2 | Below 50%: summons 2 Sump Bloats once. A `ring` seep, reach 2. |
| The Curator | 16 | 5 | 1 | Below 50%: swaps attack style and guard line. |
| The Choir | 21 | 6 | 1 | A `ring` pulse, reach 3. Below 40%: switches to psionic. |
| The Last Archivist | 26 | 7 | 1 | A `line` redaction, reach 6. Below 50%: summons a Redactor. |
| The Stoker | 31 | 8 | 2 | A spreading `fire` hazard. Enrage after 120 ticks. |
| The Host | 37 | 9 | 2 | Phases at 66% and 33%, each swapping style and summoning 2 Knocklings. |
| The Postmaster | 40 | 10 | 1 | `circleOnTarget` parcels. Courier Echo adds. Below 50%: enables a second, shorter-cooldown parcel telegraph. |
| The Shift Foreman | 48 | 11 | 2 | A `cone`, reach 4. Deep Shift Wight adds. Enrage after 150 ticks. |
| The Salt Bishop | 49 | 11 | 2 | A `salt` hazard and a `line`. Phases at 60% and 25%. |
| The Almoner | 58 | 13 | 1 | Phases at 75%, 50% and 25%, cycling guard lines. `circleOnTarget`. |
| The Chief Physician | 59 | 13 | 1 | Three phases that unlock a `ring`, Ward Orderly adds and a `static` hazard. Enrage after 180 ticks. |

Every boss's area gains `multiCombat: true` where it lacks it.

## Testing

- **Shared unit tests:** footprint helpers; `findPath` with `isGoal`; the sized grid; nearest-tile range and melee adjacency for 2×2 targets; every telegraph shape at each facing; phase selection; deterministic hazard spread with a seeded random.
- **Server harness tests:**
  - A 2×2 creature does not path through a 1-wide gap.
  - A creature body blocks another creature's step, and that creature re-routes.
  - A player walks straight through a creature, and a player under a 2×2 must step out to attack it.
  - Wander never stops on a chokepoint.
  - A respawn onto an occupied home moves to a free tile.
  - A telegraph hits a player who stays and misses one who steps off.
  - A phase swaps attack and guard and enables its mechanics.
  - Summons are cleared and hazards removed on reset, defeat and containment.
  - Enrage changes attack timing after `afterTicks`.
  - The Knocking containment test and existing combat tests still pass.
- **Integrity tests:** each `findFootprintIssues` and `findEncounterIssues` rule is exercised with a failing fixture.
- **Performance:** the existing tick benchmark is re-run after Part 1. Body occupancy must not push the 300ms tick over budget at the main floor's player cap.
- Finish with `npm run typecheck` and `npm test`.

## Delivery

Two implementation plans, in order:

1. **Footprints and body blocking** (Part 1). This is engine-wide and must land first.
2. **Boss encounters and the roster** (Part 2). It depends on footprints for shapes and placement.

Update `ARCHITECTURE.md` (Combat, Containment) and `WORLD_DESIGN.md` (a new footprint and chokepoint rule under Difficulty and population, and `multiCombat` boss rooms) as each part lands.

## Out of scope

- Rotating long bodies (1×2 to 1×4).
- Sizes or collision for friendly NPCs and players.
- Any body blocking of players, by creatures or by other players.
- New boss models. Existing rigs are scaled.
