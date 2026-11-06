import { areConditionsMet, isCardinallyAdjacent, samePoint, type GameContent, type TilePoint } from '@containment/shared';
import type { PendingInteraction, Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { ZoneInstance } from '../world/zoneInstance.ts';
import type { DialogueController } from './dialogueController.ts';
import type { EffectHost, EffectRunner } from './effectRunner.ts';

export interface InteractionHost extends EffectHost {
  pickUp(player: Player, groundItemId: string): void;
  groundItemPosition(player: Player, groundItemId: string): TilePoint | null;
  startGathering(player: Player, instanceId: string, interactionIndex: number): void;
}
import { conditionContextFor } from './playerContext.ts';

const MAX_REPATH_ATTEMPTS = 4;

export const objectUseFlag = (zoneId: string, instanceId: string, interactionIndex: number): string =>
  `object-used:${zoneId}:${instanceId}:${interactionIndex}`;

export class InteractionController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly dialogues: DialogueController;
  private readonly effects: EffectRunner;
  private readonly host: InteractionHost;

  constructor(content: GameContent, world: World, dialogues: DialogueController, effects: EffectRunner, host: InteractionHost) {
    this.content = content;
    this.world = world;
    this.dialogues = dialogues;
    this.effects = effects;
    this.host = host;
  }

  request(player: Player, pending: Omit<PendingInteraction, 'repathAttempts'>): void {
    const target = this.targetPosition(player, pending);
    if (!target) return;
    this.dialogues.close(player);
    player.pendingInteraction = { ...pending, repathAttempts: 0 };
    if (pending.kind === 'groundItem') {
      if (samePoint(player.position, target)) {
        player.path = [];
        this.resolveArrival(player);
      } else if (!this.world.walk(player, target)) {
        player.pendingInteraction = null;
        this.host.notify(player, 'warning', "You can't reach that.");
      }
      return;
    }
    if (isCardinallyAdjacent(player.position, target)) {
      player.path = [];
      this.resolveArrival(player);
      return;
    }
    if (!this.world.approach(player, target)) {
      player.pendingInteraction = null;
      this.host.notify(player, 'warning', "You can't reach that.");
    }
  }

  resolveArrival(player: Player): void {
    const pending = player.pendingInteraction;
    if (!pending) return;
    const zone = this.world.zoneOf(player);
    const target = this.targetPosition(player, pending);
    if (!target) {
      player.pendingInteraction = null;
      return;
    }
    if (pending.kind === 'groundItem') {
      player.pendingInteraction = null;
      if (samePoint(player.position, target) || isCardinallyAdjacent(player.position, target)) this.host.pickUp(player, pending.instanceId);
      return;
    }
    if (isCardinallyAdjacent(player.position, target)) {
      player.pendingInteraction = null;
      this.world.face(player, target);
      this.execute(player, zone, pending);
      return;
    }
    if (pending.repathAttempts >= MAX_REPATH_ATTEMPTS || !this.world.approach(player, target)) {
      player.pendingInteraction = null;
      this.host.notify(player, 'warning', "You can't reach that.");
      return;
    }
    player.pendingInteraction = { ...pending, repathAttempts: pending.repathAttempts + 1 };
  }

  private execute(player: Player, zone: ZoneInstance, pending: PendingInteraction): void {
    if (pending.kind === 'npc') {
      const npc = zone.npcs.get(pending.instanceId);
      if (!npc) return;
      if (pending.interactionIndex === 1 && npc.definition.shopId) {
        this.host.openShop(player, npc.definition.shopId, npc.placement.instanceId);
        return;
      }
      this.dialogues.open(player, npc);
      return;
    }

    const placed = zone.objects.get(pending.instanceId);
    const interaction = placed?.definition.interactions[pending.interactionIndex];
    if (!placed || !interaction) return;

    const useFlag = objectUseFlag(zone.id, pending.instanceId, pending.interactionIndex);
    if (interaction.oncePerCharacter && player.hasFlag(useFlag)) {
      this.host.notify(player, 'info', interaction.alreadyUsedText ?? 'Nothing more to do here.');
      return;
    }
    if (!areConditionsMet(interaction.conditions, conditionContextFor(player, this.content))) {
      this.host.notify(player, 'warning', interaction.failureText ?? 'Nothing happens.');
      return;
    }

    if (interaction.gather) {
      this.host.startGathering(player, pending.instanceId, pending.interactionIndex);
      return;
    }

    if (interaction.oncePerCharacter) player.update({ flags: [...player.record.flags, useFlag] });
    this.effects.apply(player, interaction.effects);
    this.host.raiseQuestEvent(player, { type: 'interactedWith', objectId: placed.definition.id });
  }

  private targetPosition(player: Player, pending: Pick<PendingInteraction, 'kind' | 'instanceId'>): TilePoint | null {
    const zone = this.world.zoneOf(player);
    if (pending.kind === 'groundItem') return this.host.groundItemPosition(player, pending.instanceId);
    if (pending.kind === 'npc') return zone.npcs.get(pending.instanceId)?.position ?? null;
    return zone.objects.get(pending.instanceId)?.placement.position ?? null;
  }
}
