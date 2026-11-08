import {
  chebyshevDistance,
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
import type { ZoneInstance } from '../world/zoneInstance.ts';
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
    const zone = this.world.zoneOf(player);
    const creature = zone.creatureByInstance(instanceId);
    if (!creature?.isAlive) return;
    const refusal = this.singleWayRefusal(player, creature, zone, tick);
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
    for (const zone of this.world.instances()) {
      for (const creature of zone.creatures.values()) this.updateCreature(creature, zone, tick);
      for (const player of [...zone.players.values()]) {
        if (zone.players.has(player.entityId)) this.updatePlayer(player, zone, tick);
      }
      if (tick % REGENERATION_INTERVAL_TICKS === 0) this.regenerate(zone, tick);
    }
  }

  private updatePlayer(player: Player, zone: ZoneInstance, tick: number): void {
    if (player.combatTargetId === null) return;
    const creature = zone.creatures.get(player.combatTargetId);
    if (!creature?.isAlive) {
      this.disengage(player);
      return;
    }

    const attack = playerAttackProfile(player.record.skills, player.record.equipment, this.content.items);
    const sightline = (from: TilePoint, to: TilePoint) => hasLineOfSight(zone.layout, from, to);
    if (isWithinAttackRange(attack, player.position, creature.position, sightline)) {
      player.path = [];
      player.lastChaseTarget = null;
      if (tick < player.nextAttackTick) return;
      const refusal = this.singleWayRefusal(player, creature, zone, tick);
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
      zone.broadcast({
        type: 'combat.hit',
        attackerId: player.entityId,
        targetId: creature.entityId,
        outcome: outcome.hit ? 'hit' : 'miss',
        damage: outcome.damage,
        style: attack.style,
        ...(attack.weapon ? { weapon: attack.weapon } : {}),
        vitals: creature.vitals(),
      });
      for (const award of combatExperience(attack.style, outcome.damage)) {
        this.effects.awardExperience(player, award.skill, award.amount, false);
      }
      if (creature.targetId === null) {
        creature.targetId = player.entityId;
        creature.returningHome = false;
      }
      if (creature.integrity <= 0) this.defeatCreature(creature, zone, player, tick);
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

  private updateCreature(creature: Creature, zone: ZoneInstance, tick: number): void {
    if (creature.state === 'dying' && tick >= creature.diedAtTick + DEATH_ANIMATION_TICKS) {
      creature.state = 'despawned';
      zone.broadcast({ type: 'world.entityDespawned', entityId: creature.entityId });
      return;
    }
    if (creature.state === 'despawned' && tick >= creature.diedAtTick + creature.respawnDelayTicks) {
      creature.respawn();
      zone.broadcast({ type: 'world.entitySpawned', entity: creature.snapshot() });
      return;
    }
    if (!creature.isAlive) return;

    const definition = creature.definition;
    if (!creature.returningHome && chebyshevDistance(creature.position, creature.home) > definition.leashRadius) this.sendHome(creature, zone);
    if (creature.returningHome) {
      if (samePoint(creature.position, creature.home) || creature.path.length === 0) creature.returningHome = false;
      return;
    }

    let target = creature.targetId ? zone.players.get(creature.targetId) : undefined;
    if (target && this.playerBusyElsewhere(target, creature, zone, tick)) target = undefined;
    if (creature.targetId && (!target || target.isIncapacitated)) {
      creature.targetId = null;
      target = undefined;
    }
    if (!target && definition.aggressive) {
      target = this.findAggroTarget(creature, zone, tick);
      if (target) creature.targetId = target.entityId;
    }
    if (!target) return;

    const attack = creatureAttackProfile(definition);
    const sightline = (from: TilePoint, to: TilePoint) => hasLineOfSight(zone.layout, from, to);
    if (isWithinAttackRange(attack, creature.position, target.position, sightline)) {
      creature.path = [];
      if (tick < creature.nextAttackTick) return;
      creature.nextAttackTick = tick + attack.speedTicks;
      this.world.faceNpc(creature, target.position, zone);
      this.resolveCreatureAttack(creature, target, zone, tick);
      return;
    }

    if (tick - creature.lastPathTick >= CHASE_REPATH_TICKS) {
      creature.lastPathTick = tick;
      creature.path = zone.pathBetween(creature.position, target.position, true, CREATURE_PATH_SEARCH_LIMIT) ?? [];
    }
  }

  private resolveCreatureAttack(creature: Creature, player: Player, zone: ZoneInstance, tick: number): void {
    const defence = deriveCombatProfile(player.record.skills, equipmentStats(player.record.equipment, this.content.items)).defence;
    const outcome = rollAttack(creatureAttackProfile(creature.definition), defence, this.random);
    this.engageBoth(player, creature, tick);
    player.lastCombatTick = tick;
    player.setIntegrity(player.integrity - outcome.damage);
    zone.broadcast({
      type: 'combat.hit',
      attackerId: creature.entityId,
      targetId: player.entityId,
      outcome: outcome.hit ? 'hit' : 'miss',
      damage: outcome.damage,
      style: creature.definition.attack.style,
      vitals: player.vitals(),
    });

    if (player.isIncapacitated) {
      this.incapacitate(player, zone);
      return;
    }
    const idle = player.combatTargetId === null && player.path.length === 0 && !player.pendingInteraction && !player.dialogue;
    if (idle) {
      player.combatTargetId = creature.entityId;
      player.sendVitals();
    }
  }

  private defeatCreature(creature: Creature, zone: ZoneInstance, killer: Player, tick: number): void {
    creature.state = 'dying';
    creature.diedAtTick = tick;
    creature.respawnDelayTicks = scaledRespawnTicks(creature.definition.respawnTicks, zone.players.size);
    creature.targetId = null;
    creature.engagedWith = null;
    creature.path = [];
    zone.broadcast({ type: 'combat.death', entityId: creature.entityId });

    for (const player of zone.players.values()) {
      if (player.combatTargetId === creature.entityId) this.disengage(player);
    }

    const credited = new Set([...creature.contributors, killer.entityId]);
    creature.contributors.clear();
    for (const entityId of credited) {
      const player = zone.players.get(entityId);
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

  private incapacitate(player: Player, zone: ZoneInstance): void {
    zone.broadcast({ type: 'combat.death', entityId: player.entityId });
    for (const creature of zone.creatures.values()) {
      if (creature.targetId === player.entityId) this.sendHome(creature, zone);
    }
    player.combatTargetId = null;
    player.path = [];
    this.host.recoverIncapacitated(player);
  }

  private sendHome(creature: Creature, zone: ZoneInstance): void {
    creature.targetId = null;
    creature.engagedWith = null;
    creature.contributors.clear();
    creature.returningHome = true;
    creature.integrity = creature.definition.integrity;
    creature.path = zone.pathBetween(creature.position, creature.home, false, CREATURE_PATH_SEARCH_LIMIT) ?? [];
  }

  isMultiCombat(zone: ZoneInstance, point: TilePoint): boolean {
    return zone.areasAt(point).some((area) => area.multiCombat === true);
  }

  private singleWayRefusal(player: Player, creature: Creature, zone: ZoneInstance, tick: number): string | null {
    if (this.isMultiCombat(zone, creature.position)) return null;
    const rival = creature.engagedWith;
    if (rival && rival !== player.entityId && tick < creature.engagedUntilTick && zone.players.get(rival)?.isIncapacitated === false) {
      return SINGLE_WAY_TARGET_TAKEN;
    }
    if (this.playerBusyElsewhere(player, creature, zone, tick)) return SINGLE_WAY_UNDER_ATTACK;
    return null;
  }

  private playerBusyElsewhere(player: Player, creature: Creature, zone: ZoneInstance, tick: number): boolean {
    if (this.isMultiCombat(zone, creature.position)) return false;
    const other = player.engagedWith;
    if (!other || other === creature.entityId || tick >= player.engagedUntilTick) return false;
    return zone.creatures.get(other)?.isAlive === true;
  }

  private engageBoth(player: Player, creature: Creature, tick: number): void {
    player.engagedWith = creature.entityId;
    player.engagedUntilTick = tick + ENGAGEMENT_TICKS;
    creature.engagedWith = player.entityId;
    creature.engagedUntilTick = tick + ENGAGEMENT_TICKS;
  }

  private findAggroTarget(creature: Creature, zone: ZoneInstance, tick: number): Player | undefined {
    let closest: Player | undefined;
    let closestDistance = Infinity;
    const creatureBusy = creature.engagedWith !== null && tick < creature.engagedUntilTick && !this.isMultiCombat(zone, creature.position);
    for (const player of zone.players.values()) {
      if (player.isIncapacitated) continue;
      if (ignoresOutclassedPlayer(creature.definition.level, combatLevel(player.record.skills))) continue;
      if (creatureBusy && creature.engagedWith !== player.entityId) continue;
      if (this.playerBusyElsewhere(player, creature, zone, tick)) continue;
      const distance = chebyshevDistance(creature.position, player.position);
      if (distance > creature.definition.aggroRadius || distance >= closestDistance) continue;
      if (!hasLineOfSight(zone.layout, creature.position, player.position)) continue;
      closest = player;
      closestDistance = distance;
    }
    return closest;
  }

  private regenerate(zone: ZoneInstance, tick: number): void {
    for (const player of zone.players.values()) {
      if (player.integrity >= player.maxIntegrity || tick - player.lastCombatTick < OUT_OF_COMBAT_TICKS) continue;
      player.setIntegrity(player.integrity + 1);
    }
  }
}
