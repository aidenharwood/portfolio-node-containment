import {
  chebyshevDistance,
  chunkKeyOf,
  chunkOf,
  interestSet,
  type ChunkKey,
  combatExperience,
  combatLevel,
  ignoresOutclassedPlayer,
  defeatExperience,
  scaledRespawnTicks,
  creatureAttackProfile,
  deriveCombatProfile,
  equipmentStats,
  hasLineOfSight,
  isWithinAttackRange,
  playerAttackProfile,
  rollAttack,
  samePoint,
  type GameContent,
  type InstanceId,
  type NoticeTone,
  type QuestEvent,
  type TilePoint,
} from '@containment/shared';
import type { Creature } from '../world/creature.ts';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { LevelInstance } from '../world/levelInstance.ts';
import type { EffectRunner } from './effectRunner.ts';

export interface CombatHost {
  raiseQuestEvent(player: Player, event: QuestEvent): void;
  notify(player: Player, tone: NoticeTone, text: string): void;
  recoverIncapacitated(player: Player): void;
  dropToGround(owner: Player, itemId: string, quantity: number, position: TilePoint): void;
}

const DEATH_ANIMATION_TICKS = 3;
const CHASE_REPATH_TICKS = 2;
const CREATURE_PATH_SEARCH_LIMIT = 400;
const REGENERATION_INTERVAL_TICKS = 20;
const OUT_OF_COMBAT_TICKS = 16;
const ENGAGEMENT_TICKS = 12;

export const SINGLE_WAY_TARGET_TAKEN = 'Someone else is already fighting that.';
export const SINGLE_WAY_UNDER_ATTACK = "You're already under attack.";

export class CombatController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly effects: EffectRunner;
  private readonly host: CombatHost;
  private readonly random: () => number;

  constructor(content: GameContent, world: World, effects: EffectRunner, host: CombatHost, random: () => number) {
    this.content = content;
    this.world = world;
    this.effects = effects;
    this.host = host;
    this.random = random;
  }

  engage(player: Player, instanceId: InstanceId, tick: number): void {
    const level = this.world.levelOf(player);
    const creature = level.creatureByInstance(instanceId);
    if (!creature?.isAlive || !level.isInterestOf(player, creature.position)) return;
    const refusal = this.singleWayRefusal(player, creature, level, tick);
    if (refusal) {
      this.host.notify(player, 'warning', refusal);
      return;
    }
    player.pendingInteraction = null;
    player.combatTargetId = creature.entityId;
    player.lastChaseTarget = null;
    player.sendVitals();
  }

  disengage(player: Player): void {
    if (player.combatTargetId === null) return;
    player.combatTargetId = null;
    player.lastChaseTarget = null;
    player.sendVitals();
  }

  tick(tick: number): void {
    for (const level of this.world.instances()) {
      const watched = level.watchedChunks();
      for (const creature of level.creatures.values()) this.updateCreature(creature, level, tick, watched);
      for (const player of [...level.players.values()]) {
        if (level.players.has(player.entityId)) this.updatePlayer(player, level, tick);
      }
      if (tick % REGENERATION_INTERVAL_TICKS === 0) this.regenerate(level, tick);
    }
  }

  private updatePlayer(player: Player, level: LevelInstance, tick: number): void {
    if (player.combatTargetId === null) return;
    const creature = level.creatures.get(player.combatTargetId);
    if (!creature?.isAlive) {
      this.disengage(player);
      return;
    }

    const attack = playerAttackProfile(player.record.skills, player.record.equipment, this.content.items);
    const sightline = (from: TilePoint, to: TilePoint) => hasLineOfSight(level.layout, from, to);
    if (isWithinAttackRange(attack, player.position, creature.position, sightline)) {
      player.path = [];
      player.lastChaseTarget = null;
      if (tick < player.nextAttackTick) return;
      const refusal = this.singleWayRefusal(player, creature, level, tick);
      if (refusal) {
        this.host.notify(player, 'warning', refusal);
        this.disengage(player);
        return;
      }
      this.engageBoth(player, creature, tick);
      this.world.face(player, creature.position);
      player.nextAttackTick = tick + attack.speedTicks;
      player.lastCombatTick = tick;
      const outcome = rollAttack(attack, creature.definition.defence, this.random);
      creature.integrity = Math.max(0, creature.integrity - outcome.damage);
      if (outcome.damage > 0) creature.contributors.add(player.entityId);
      level.broadcastNear(creature.position, {
        type: 'combat.hit',
        attackerId: player.entityId,
        targetId: creature.entityId,
        outcome: outcome.hit ? 'hit' : 'miss',
        damage: outcome.damage,
        style: attack.style,
        vitals: creature.vitals(),
      });
      for (const award of combatExperience(attack.style, outcome.damage)) {
        this.effects.awardExperience(player, award.skill, award.amount, false);
      }
      if (creature.targetId === null) {
        creature.targetId = player.entityId;
        creature.returningHome = false;
      }
      if (creature.integrity <= 0) this.defeatCreature(creature, level, player, tick);
      return;
    }

    const chaseStale = !player.lastChaseTarget || !samePoint(player.lastChaseTarget, creature.position);
    if (player.path.length === 0 || chaseStale) {
      if (!this.world.approach(player, creature.position)) {
        this.host.notify(player, 'warning', "You can't reach that.");
        this.disengage(player);
        return;
      }
      player.lastChaseTarget = creature.position;
    }
  }

  private updateCreature(creature: Creature, level: LevelInstance, tick: number, watched: ReadonlySet<ChunkKey>): void {
    if (creature.state === 'dying' && tick >= creature.diedAtTick + DEATH_ANIMATION_TICKS) {
      creature.state = 'despawned';
      level.broadcastNear(creature.position, { type: 'world.entityDespawned', entityId: creature.entityId });
      return;
    }
    if (creature.state === 'despawned' && tick >= creature.diedAtTick + creature.respawnDelayTicks) {
      creature.respawn();
      level.broadcastNear(creature.position, { type: 'world.entitySpawned', entity: creature.snapshot() });
      return;
    }
    if (!creature.isAlive) return;

    const isWatched = watched.has(chunkKeyOf(creature.position));
    if (creature.targetId && this.targetAbandoned(creature, level)) {
      if (isWatched) this.sendHome(creature, level);
      else {
        this.resetHome(creature);
        level.broadcastNear(creature.position, { type: 'world.entitySpawned', entity: creature.snapshot() });
      }
    }
    if (!isWatched) return;

    const definition = creature.definition;
    if (!creature.returningHome && chebyshevDistance(creature.position, creature.home) > definition.leashRadius) this.sendHome(creature, level);
    if (creature.returningHome) {
      if (samePoint(creature.position, creature.home) || creature.path.length === 0) creature.returningHome = false;
      return;
    }

    let target = creature.targetId ? level.players.get(creature.targetId) : undefined;
    if (target && this.playerBusyElsewhere(target, creature, level, tick)) target = undefined;
    if (creature.targetId && (!target || target.isIncapacitated)) {
      creature.targetId = null;
      target = undefined;
    }
    if (!target && definition.aggressive) {
      target = this.findAggroTarget(creature, level, tick);
      if (target) creature.targetId = target.entityId;
    }
    if (!target) return;

    const attack = creatureAttackProfile(definition);
    const sightline = (from: TilePoint, to: TilePoint) => hasLineOfSight(level.layout, from, to);
    if (isWithinAttackRange(attack, creature.position, target.position, sightline)) {
      creature.path = [];
      if (tick < creature.nextAttackTick) return;
      creature.nextAttackTick = tick + attack.speedTicks;
      this.world.faceNpc(creature, target.position, level);
      this.resolveCreatureAttack(creature, target, level, tick);
      return;
    }

    if (tick - creature.lastPathTick >= CHASE_REPATH_TICKS) {
      creature.lastPathTick = tick;
      creature.path = level.pathBetween(creature.position, target.position, true, CREATURE_PATH_SEARCH_LIMIT) ?? [];
    }
  }

  private resolveCreatureAttack(creature: Creature, player: Player, level: LevelInstance, tick: number): void {
    const defence = deriveCombatProfile(player.record.skills, equipmentStats(player.record.equipment, this.content.items)).defence;
    const outcome = rollAttack(creatureAttackProfile(creature.definition), defence, this.random);
    this.engageBoth(player, creature, tick);
    player.lastCombatTick = tick;
    player.setIntegrity(player.integrity - outcome.damage);
    level.broadcastNear(player.position, {
      type: 'combat.hit',
      attackerId: creature.entityId,
      targetId: player.entityId,
      outcome: outcome.hit ? 'hit' : 'miss',
      damage: outcome.damage,
      style: creature.definition.attack.style,
      vitals: player.vitals(),
    });

    if (player.isIncapacitated) {
      this.incapacitate(player, level);
      return;
    }
    const idle = player.combatTargetId === null && player.path.length === 0 && !player.pendingInteraction && !player.dialogue;
    if (idle) {
      player.combatTargetId = creature.entityId;
      player.sendVitals();
    }
  }

  private defeatCreature(creature: Creature, level: LevelInstance, killer: Player, tick: number): void {
    creature.state = 'dying';
    creature.diedAtTick = tick;
    creature.respawnDelayTicks = scaledRespawnTicks(creature.definition.respawnTicks, level.players.size);
    creature.targetId = null;
    creature.engagedWith = null;
    creature.path = [];
    level.broadcastNear(creature.position, { type: 'combat.death', entityId: creature.entityId });

    for (const player of level.players.values()) {
      if (player.combatTargetId === creature.entityId) this.disengage(player);
    }

    const credited = new Set([...creature.contributors, killer.entityId]);
    creature.contributors.clear();
    for (const entityId of credited) {
      const player = level.players.get(entityId);
      if (player) this.rewardDefeat(player, creature, creature.position);
    }
  }

  private rewardDefeat(player: Player, creature: Creature, position: TilePoint): void {
    const style = playerAttackProfile(player.record.skills, player.record.equipment, this.content.items).style;
    for (const award of defeatExperience(style, creature.definition.experience)) {
      this.effects.awardExperience(player, award.skill, award.amount, false);
    }
    const loot = creature.definition.loot.filter((entry) => this.random() < entry.chance);
    if (loot.length > 0) {
      for (const entry of loot) this.host.dropToGround(player, entry.itemId, entry.count, position);
      const names = loot.map((entry) => `${entry.count > 1 ? `${entry.count} × ` : ''}${this.content.items.get(entry.itemId)?.name ?? entry.itemId}`);
      player.send({ type: 'chat.message', channel: 'system', text: `Loot dropped: ${names.join(', ')}` });
    }
    this.host.raiseQuestEvent(player, { type: 'defeated', creatureId: creature.definition.id });
  }

  private incapacitate(player: Player, level: LevelInstance): void {
    level.broadcastNear(player.position, { type: 'combat.death', entityId: player.entityId });
    for (const creature of level.creatures.values()) {
      if (creature.targetId === player.entityId) this.sendHome(creature, level);
    }
    player.combatTargetId = null;
    player.path = [];
    this.host.recoverIncapacitated(player);
  }

  private targetAbandoned(creature: Creature, level: LevelInstance): boolean {
    const target = creature.targetId ? level.players.get(creature.targetId) : undefined;
    return !target || !interestSet(chunkOf(creature.position)).has(chunkKeyOf(target.position));
  }

  private resetHome(creature: Creature): void {
    creature.targetId = null;
    creature.engagedWith = null;
    creature.contributors.clear();
    creature.returningHome = false;
    creature.integrity = creature.definition.integrity;
    creature.path = [];
    creature.position = creature.home;
  }

  private sendHome(creature: Creature, level: LevelInstance): void {
    creature.targetId = null;
    creature.engagedWith = null;
    creature.contributors.clear();
    creature.returningHome = true;
    creature.integrity = creature.definition.integrity;
    creature.path = level.pathBetween(creature.position, creature.home, false, CREATURE_PATH_SEARCH_LIMIT) ?? [];
  }

  isMultiCombat(level: LevelInstance, point: TilePoint): boolean {
    return level.areasAt(point).some((area) => area.multiCombat === true);
  }

  private singleWayRefusal(player: Player, creature: Creature, level: LevelInstance, tick: number): string | null {
    if (this.isMultiCombat(level, creature.position)) return null;
    const rival = creature.engagedWith;
    if (rival && rival !== player.entityId && tick < creature.engagedUntilTick && level.players.get(rival)?.isIncapacitated === false) {
      return SINGLE_WAY_TARGET_TAKEN;
    }
    if (this.playerBusyElsewhere(player, creature, level, tick)) return SINGLE_WAY_UNDER_ATTACK;
    return null;
  }

  private playerBusyElsewhere(player: Player, creature: Creature, level: LevelInstance, tick: number): boolean {
    if (this.isMultiCombat(level, creature.position)) return false;
    const other = player.engagedWith;
    if (!other || other === creature.entityId || tick >= player.engagedUntilTick) return false;
    return level.creatures.get(other)?.isAlive === true;
  }

  private engageBoth(player: Player, creature: Creature, tick: number): void {
    player.engagedWith = creature.entityId;
    player.engagedUntilTick = tick + ENGAGEMENT_TICKS;
    creature.engagedWith = player.entityId;
    creature.engagedUntilTick = tick + ENGAGEMENT_TICKS;
  }

  private findAggroTarget(creature: Creature, level: LevelInstance, tick: number): Player | undefined {
    let closest: Player | undefined;
    let closestDistance = Infinity;
    const creatureBusy = creature.engagedWith !== null && tick < creature.engagedUntilTick && !this.isMultiCombat(level, creature.position);
    for (const player of level.players.values()) {
      if (player.isIncapacitated) continue;
      if (ignoresOutclassedPlayer(creature.definition.level, combatLevel(player.record.skills))) continue;
      if (creatureBusy && creature.engagedWith !== player.entityId) continue;
      if (this.playerBusyElsewhere(player, creature, level, tick)) continue;
      const distance = chebyshevDistance(creature.position, player.position);
      if (distance > creature.definition.aggroRadius || distance >= closestDistance) continue;
      if (!hasLineOfSight(level.layout, creature.position, player.position)) continue;
      closest = player;
      closestDistance = distance;
    }
    return closest;
  }

  private regenerate(level: LevelInstance, tick: number): void {
    for (const player of level.players.values()) {
      if (player.integrity >= player.maxIntegrity || tick - player.lastCombatTick < OUT_OF_COMBAT_TICKS) continue;
      player.setIntegrity(player.integrity + 1);
    }
  }
}
