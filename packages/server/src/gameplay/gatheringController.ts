import {
  addItem,
  depletionChance,
  gatherChance,
  isCardinallyAdjacent,
  levelForExperience,
  SKILL_INFO,
  type GameContent,
  type GatheringSource,
  type InstanceId,
} from '@containment/shared';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { PlacedObject, LevelInstance } from '../world/levelInstance.ts';
import type { EffectHost, EffectRunner } from './effectRunner.ts';

export interface GatheringHost extends EffectHost {
  sendActivity(player: Player, label: string | null, ticksPerAction?: number, remaining?: number | null): void;
}

export class GatheringController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly effects: EffectRunner;
  private readonly host: GatheringHost;
  private readonly random: () => number;

  constructor(content: GameContent, world: World, effects: EffectRunner, host: GatheringHost, random: () => number) {
    this.content = content;
    this.world = world;
    this.effects = effects;
    this.host = host;
    this.random = random;
  }

  start(player: Player, instanceId: InstanceId, interactionIndex: number, tick: number): void {
    const level = this.world.levelOf(player);
    const placed = level.objects.get(instanceId);
    const source = placed?.definition.interactions[interactionIndex]?.gather;
    if (!placed || !source) return;
    const refusal = this.refusal(player, level, placed, source);
    if (refusal) {
      this.host.notify(player, 'warning', refusal);
      return;
    }
    player.activity = { kind: 'gather', instanceId, interactionIndex, nextTick: tick + source.attemptTicks };
    this.host.sendActivity(player, `${source.progressVerb} the ${placed.definition.name}`, source.attemptTicks);
  }

  tick(tick: number): void {
    for (const level of this.world.instances()) {
      for (const [instanceId, until] of level.depletedUntil) {
        if (until > tick) continue;
        level.restoreNode(instanceId);
        const position = level.objects.get(instanceId)?.placement.position;
        if (position) level.broadcastNear(position, { type: 'world.objectDepleted', instanceId, depleted: false });
      }
      for (const player of level.players.values()) {
        const activity = player.activity;
        if (activity?.kind === 'gather' && tick >= activity.nextTick) this.attempt(player, level, activity.instanceId, activity.interactionIndex, tick);
      }
    }
  }

  private attempt(player: Player, level: LevelInstance, instanceId: InstanceId, interactionIndex: number, tick: number): void {
    const placed = level.objects.get(instanceId);
    const source = placed?.definition.interactions[interactionIndex]?.gather;
    if (!placed || !source || !isCardinallyAdjacent(player.position, placed.placement.position)) return this.stop(player);
    const refusal = this.refusal(player, level, placed, source);
    if (refusal) {
      this.host.notify(player, 'info', refusal);
      return this.stop(player);
    }

    player.activity = { kind: 'gather', instanceId, interactionIndex, nextTick: tick + source.attemptTicks };
    if (this.random() >= gatherChance(source, levelForExperience(player.record.skills[source.skill]))) return;

    const outcome = addItem(player.record.inventory, this.content.items, source.itemId, 1);
    if (outcome.added === 0) return this.stop(player);
    player.update({ inventory: outcome.inventory });
    const itemName = this.content.items.get(source.itemId)?.name ?? source.itemId;
    player.send({ type: 'chat.message', channel: 'system', text: `You gather some ${itemName}. (+${source.experience} ${SKILL_INFO[source.skill].name} XP)` });
    this.effects.awardExperience(player, source.skill, source.experience, false);
    this.host.raiseQuestEvent(player, { type: 'gathered', itemId: source.itemId, count: 1 });
    this.host.raiseQuestEvent(player, { type: 'loadoutChanged' });

    if (this.random() < depletionChance(source) && level.spendNodeCharge(instanceId, source.charges)) {
      level.depletedUntil.set(instanceId, tick + source.respawnTicks);
      level.broadcastNear(placed.placement.position, { type: 'world.objectDepleted', instanceId, depleted: true });
      this.host.notify(player, 'info', `The ${placed.definition.name} is exhausted for now.`);
      return this.stop(player);
    }
    if (addItem(player.record.inventory, this.content.items, source.itemId, 1).added === 0) {
      this.host.notify(player, 'info', 'Your inventory is full.');
      this.stop(player);
    }
  }

  stop(player: Player): void {
    this.interrupt(player);
  }

  interrupt(player: Player): boolean {
    if (player.activity?.kind !== 'gather') return false;
    player.activity = null;
    this.host.sendActivity(player, null);
    return true;
  }

  private refusal(player: Player, level: LevelInstance, placed: PlacedObject, source: GatheringSource): string | null {
    if (levelForExperience(player.record.skills[source.skill]) < source.level) {
      return `You need ${SKILL_INFO[source.skill].name} level ${source.level} to work the ${placed.definition.name}.`;
    }
    if (level.depletedUntil.has(placed.placement.instanceId)) return `The ${placed.definition.name} is exhausted. It will replenish soon.`;
    if (addItem(player.record.inventory, this.content.items, source.itemId, 1).added === 0) return 'Your inventory is full.';
    return null;
  }
}
