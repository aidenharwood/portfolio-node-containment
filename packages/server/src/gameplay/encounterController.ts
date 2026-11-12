import {
  activeMechanicIds,
  hasLineOfSight,
  phaseIndexFor,
  seedHazard,
  spreadHazard,
  telegraphTiles,
  tileKey,
  footprintCentre,
  type AttackProfile,
  type BossMechanic,
  type EncounterDefinition,
  type GameContent,
  type HazardMechanic,
  type SummonMechanic,
  type TelegraphMechanic,
  type TilePoint,
} from '@containment/shared';
import type { Creature } from '../world/creature.ts';
import type { EncounterState } from '../world/encounterState.ts';
import type { LevelInstance } from '../world/levelInstance.ts';
import type { Player } from '../world/player.ts';

export interface EncounterHost {
  strike(creature: Creature, player: Player, attack: AttackProfile, level: LevelInstance, tick: number): void;
  scorch(creature: Creature, player: Player, damage: number, level: LevelInstance, tick: number): void;
}

const OPENING_DELAY_TICKS = 4;

export class EncounterController {
  private readonly content: GameContent;
  private readonly host: EncounterHost;
  private readonly random: () => number;

  constructor(content: GameContent, host: EncounterHost, random: () => number) {
    this.content = content;
    this.host = host;
    this.random = random;
  }

  update(creature: Creature, level: LevelInstance, target: Player, tick: number): void {
    const state = creature.encounter;
    const encounter = creature.definition.encounter;
    if (!state || !encounter || !creature.isAlive) return;
    if (state.pulledAtTick === null) this.pull(state, encounter, tick);
    this.advancePhase(creature, state, encounter, level, tick);
    const active = activeMechanicIds(encounter, state.phase);
    this.resolveTelegraph(creature, state, encounter, level, tick);
    this.updateHazards(creature, state, encounter, active, level, tick);
    this.updateEnrage(creature, state, encounter, active, level, tick);
    this.updateSummons(creature, state, encounter, active, level, tick);
    this.startTelegraph(creature, state, encounter, active, level, target, tick);
  }

  reset(creature: Creature, level: LevelInstance): void {
    const state = creature.encounter;
    if (!state?.engaged) return;
    for (const entityId of state.summons) {
      const add = level.creatures.get(entityId);
      if (add) level.removeCreature(add);
    }
    state.clear();
    level.broadcastNear(creature.position, { type: 'encounter.cleared', entityId: creature.entityId });
  }

  private pull(state: EncounterState, encounter: EncounterDefinition, tick: number): void {
    state.pulledAtTick = tick;
    for (const mechanic of encounter.mechanics) {
      const opening = mechanic.kind === 'telegraph' ? Math.ceil(mechanic.cooldownTicks / 2) : OPENING_DELAY_TICKS;
      state.readyAtTick.set(mechanic.id, tick + opening);
    }
  }

  private advancePhase(creature: Creature, state: EncounterState, encounter: EncounterDefinition, level: LevelInstance, tick: number): void {
    const reached = phaseIndexFor(encounter, creature.integrity / creature.definition.integrity);
    while (state.phase < reached) {
      const before = activeMechanicIds(encounter, state.phase);
      state.phase++;
      const phase = encounter.phases![state.phase - 1]!;
      level.broadcastNear(creature.position, { type: 'encounter.phase', entityId: creature.entityId, phase: state.phase, announce: phase.announce });
      for (const id of phase.enables) {
        if (!before.has(id)) state.readyAtTick.set(id, tick);
      }
    }
  }

  private resolveTelegraph(creature: Creature, state: EncounterState, encounter: EncounterDefinition, level: LevelInstance, tick: number): void {
    const pending = state.pending;
    if (!pending || tick < pending.resolvesAtTick) return;
    state.pending = null;
    const mechanic = this.mechanic(encounter, pending.mechanicId);
    level.broadcastNear(creature.position, { type: 'encounter.resolved', entityId: creature.entityId, mechanicId: pending.mechanicId });
    if (mechanic?.kind !== 'telegraph') return;
    const struck = new Set(pending.tiles.map(tileKey));
    const attack: AttackProfile = { style: mechanic.style, accuracy: mechanic.accuracy, maxHit: mechanic.maxHit, range: 0, speedTicks: 0 };
    for (const player of [...level.players.values()]) {
      if (!player.isIncapacitated && !player.isRidingTram && struck.has(tileKey(player.position))) this.host.strike(creature, player, attack, level, tick);
    }
  }

  private startTelegraph(
    creature: Creature,
    state: EncounterState,
    encounter: EncounterDefinition,
    active: ReadonlySet<string>,
    level: LevelInstance,
    target: Player,
    tick: number,
  ): void {
    if (state.pending) return;
    const ready = encounter.mechanics.find(
      (mechanic): mechanic is TelegraphMechanic => mechanic.kind === 'telegraph' && active.has(mechanic.id) && tick >= (state.readyAtTick.get(mechanic.id) ?? tick),
    );
    if (!ready) return;
    const centre = footprintCentre(creature.position, creature.size);
    const eye = { x: Math.round(centre.x), y: Math.round(centre.y) };
    const isOpen = (point: TilePoint) => level.grid.isWalkable(point) && hasLineOfSight(level.layout, eye, point);
    const tiles = telegraphTiles(ready.shape, ready.reach, creature.position, creature.size, creature.facing, target.position, isOpen);
    state.readyAtTick.set(ready.id, tick + ready.windupTicks + ready.cooldownTicks);
    if (tiles.length === 0) return;
    const resolvesAtTick = tick + ready.windupTicks;
    state.pending = { mechanicId: ready.id, tiles, resolvesAtTick };
    level.broadcastNear(creature.position, {
      type: 'encounter.telegraph',
      entityId: creature.entityId,
      mechanicId: ready.id,
      shape: ready.shape,
      style: ready.style,
      tiles,
      resolvesAtTick,
      windupTicks: ready.windupTicks,
    });
  }

  private updateHazards(
    creature: Creature,
    state: EncounterState,
    encounter: EncounterDefinition,
    active: ReadonlySet<string>,
    level: LevelInstance,
    tick: number,
  ): void {
    const isOpen = (point: TilePoint) => level.grid.isWalkable(point) && !level.isSafe(point);
    for (const mechanic of encounter.mechanics) {
      if (mechanic.kind !== 'hazard' || !active.has(mechanic.id)) continue;
      const tiles = state.hazards.get(mechanic.id);
      const next = tiles === undefined ? this.seed(mechanic, creature, isOpen, tick, state) : this.spread(mechanic, tiles, isOpen, tick, state);
      if (next !== tiles && next) {
        state.hazards.set(mechanic.id, next);
        level.broadcastNear(creature.position, { type: 'encounter.hazard', entityId: creature.entityId, mechanicId: mechanic.id, hazard: mechanic.hazard, tiles: next });
      }
      const burning = new Set((next ?? []).map(tileKey));
      for (const player of [...level.players.values()]) {
        if (!player.isIncapacitated && !player.isRidingTram && burning.has(tileKey(player.position))) this.host.scorch(creature, player, mechanic.damagePerTick, level, tick);
      }
    }
  }

  private seed(mechanic: HazardMechanic, creature: Creature, isOpen: (point: TilePoint) => boolean, tick: number, state: EncounterState): readonly TilePoint[] | undefined {
    if (tick < (state.readyAtTick.get(mechanic.id) ?? tick)) return undefined;
    state.readyAtTick.set(mechanic.id, tick + mechanic.spreadEveryTicks);
    return seedHazard(creature.position, creature.size, mechanic.seedTiles, isOpen, this.random);
  }

  private spread(mechanic: HazardMechanic, tiles: readonly TilePoint[], isOpen: (point: TilePoint) => boolean, tick: number, state: EncounterState): readonly TilePoint[] {
    if (tick < (state.readyAtTick.get(mechanic.id) ?? tick) || tiles.length >= mechanic.maxTiles) return tiles;
    state.readyAtTick.set(mechanic.id, tick + mechanic.spreadEveryTicks);
    return spreadHazard(tiles, isOpen, mechanic.maxTiles, this.random);
  }

  private updateEnrage(
    creature: Creature,
    state: EncounterState,
    encounter: EncounterDefinition,
    active: ReadonlySet<string>,
    level: LevelInstance,
    tick: number,
  ): void {
    if (state.enraged || state.pulledAtTick === null) return;
    const enrage = encounter.mechanics.find((mechanic) => mechanic.kind === 'enrage' && active.has(mechanic.id));
    if (enrage?.kind !== 'enrage' || tick - state.pulledAtTick < enrage.afterTicks) return;
    state.enraged = true;
    state.enrageFactor = enrage.speedFactor;
    level.broadcastNear(creature.position, { type: 'encounter.enraged', entityId: creature.entityId });
  }

  private updateSummons(
    creature: Creature,
    state: EncounterState,
    encounter: EncounterDefinition,
    active: ReadonlySet<string>,
    level: LevelInstance,
    tick: number,
  ): void {
    for (const entityId of [...state.summons]) {
      if (!level.creatures.has(entityId)) state.summons.delete(entityId);
    }
    for (const mechanic of encounter.mechanics) {
      if (mechanic.kind !== 'summon' || !active.has(mechanic.id)) continue;
      if (mechanic.everyTicks === undefined) {
        if (state.firedSummons.has(mechanic.id)) continue;
        state.firedSummons.add(mechanic.id);
        this.summon(mechanic, creature, state, level);
        continue;
      }
      if (tick < (state.readyAtTick.get(mechanic.id) ?? tick)) continue;
      state.readyAtTick.set(mechanic.id, tick + mechanic.everyTicks);
      this.summon(mechanic, creature, state, level);
    }
  }

  private summon(mechanic: SummonMechanic, creature: Creature, state: EncounterState, level: LevelInstance): void {
    const definition = this.content.creatures.get(mechanic.creatureId);
    if (!definition) return;
    const alive = [...state.summons].filter((entityId) => {
      const add = level.creatures.get(entityId);
      return add?.isAlive === true && add.definition.id === mechanic.creatureId;
    }).length;
    const count = Math.min(mechanic.count, mechanic.maxAlive - alive);
    for (let index = 0; index < count; index++) {
      const add = level.addTransientCreature(definition, creature.position, creature);
      add.targetId = creature.targetId;
      state.summons.add(add.entityId);
    }
  }

  private mechanic(encounter: EncounterDefinition, id: string): BossMechanic | undefined {
    return encounter.mechanics.find((mechanic) => mechanic.id === id);
  }
}
