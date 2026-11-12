import {
  areConditionsMet,
  assemblyInstanceOf,
  countItem,
  destroyedQuantity,
  doorKeyOf,
  doorOpenedFlag,
  forgetDestroyed,
  interactionGrantsQuestItem,
  isCardinallyAdjacent,
  isDoorOpenFor,
  manhattanDistance,
  objectUseFlag,
  pathThroughDoor,
  samePoint,
  storedCount,
  type GameContent,
  type ObjectInteraction,
  type TilePoint,
} from '@containment/shared';
import type { PendingInteraction, Player } from '../world/player.ts';
import type { World } from '../world/world.ts';
import type { LevelInstance, PlacedObject } from '../world/levelInstance.ts';
import type { DialogueController } from './dialogueController.ts';
import type { EffectHost, EffectRunner } from './effectRunner.ts';

export interface InteractionHost extends EffectHost {
  pickUp(player: Player, groundItemId: string): void;
  groundItemPosition(player: Player, groundItemId: string): TilePoint | null;
  startGathering(player: Player, instanceId: string, interactionIndex: number): void;
}
import { conditionContextFor, openDoorsOf } from './playerContext.ts';

const MAX_REPATH_ATTEMPTS = 4;

interface ApproachTarget {
  readonly instanceId: string;
  readonly position: TilePoint;
}

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
    if (!target || !this.world.levelOf(player).isInterestOf(player, target)) return;
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
    const approach = pending.kind === 'object' ? this.approachObject(player, pending.instanceId, pending.interactionIndex) : this.approachTile(player, pending.instanceId, target);
    if (!approach) {
      player.pendingInteraction = null;
      this.host.notify(player, 'warning', "You can't reach that.");
      return;
    }
    player.pendingInteraction = { ...pending, instanceId: approach.instanceId, repathAttempts: 0 };
    if (isCardinallyAdjacent(player.position, approach.position)) {
      player.path = [];
      this.resolveArrival(player);
    }
  }

  private approachTile(player: Player, instanceId: string, position: TilePoint): ApproachTarget | null {
    return isCardinallyAdjacent(player.position, position) || this.world.approach(player, position) ? { instanceId, position } : null;
  }

  private approachObject(player: Player, instanceId: string, interactionIndex: number): ApproachTarget | null {
    for (const candidate of this.approachCandidates(this.world.levelOf(player), instanceId, interactionIndex, player.position)) {
      if (this.approachTile(player, candidate.instanceId, candidate.position)) return candidate;
    }
    return null;
  }

  private approachCandidates(level: LevelInstance, instanceId: string, interactionIndex: number, from: TilePoint): ApproachTarget[] {
    const clicked = level.objects.get(instanceId);
    if (!clicked) return [];
    const own = { instanceId, position: clicked.placement.position };
    const assembly = assemblyInstanceOf(instanceId);
    const verb = clicked.definition.interactions[interactionIndex]?.verb;
    if (!assembly || !verb) return [own];
    const siblings = [...level.objects.values()]
      .filter(({ placement, definition }) => placement.instanceId !== instanceId && assemblyInstanceOf(placement.instanceId) === assembly && definition.interactions[interactionIndex]?.verb === verb)
      .map(({ placement }) => ({ instanceId: placement.instanceId, position: placement.position }))
      .sort((a, b) => manhattanDistance(from, a.position) - manhattanDistance(from, b.position));
    return [own, ...siblings];
  }

  resolveArrival(player: Player): void {
    const pending = player.pendingInteraction;
    if (!pending) return;
    const level = this.world.levelOf(player);
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
      this.execute(player, level, pending);
      return;
    }
    if (pending.repathAttempts >= MAX_REPATH_ATTEMPTS || !this.world.approach(player, target)) {
      player.pendingInteraction = null;
      this.host.notify(player, 'warning', "You can't reach that.");
      return;
    }
    player.pendingInteraction = { ...pending, repathAttempts: pending.repathAttempts + 1 };
  }

  private execute(player: Player, level: LevelInstance, pending: PendingInteraction): void {
    if (pending.kind === 'npc') {
      const npc = level.npcs.get(pending.instanceId);
      if (!npc) return;
      if (pending.interactionIndex === 1 && npc.definition.shopId) {
        this.host.openShop(player, npc.definition.shopId, npc.placement.instanceId);
        return;
      }
      this.dialogues.open(player, npc);
      return;
    }

    const placed = level.objects.get(pending.instanceId);
    const interaction = placed?.definition.interactions[pending.interactionIndex];
    if (!placed || !interaction) return;
    if (placed.definition.door) {
      this.passDoor(player, level, placed, interaction);
      return;
    }

    if (this.reissueDestroyedItems(player, interaction)) return;

    const useFlag = objectUseFlag(level.layout.districtAt(placed.placement.position) ?? level.id, pending.instanceId, pending.interactionIndex);
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
    this.host.raiseQuestEvent(player, { type: 'interactedWith', objectId: placed.definition.countsAs ?? placed.definition.id });
  }

  private passDoor(player: Player, level: LevelInstance, placed: PlacedObject, interaction: ObjectInteraction): void {
    const { door } = placed.definition;
    const id = doorKeyOf(placed.definition);
    if (!door || !isDoorOpenFor(id, door, conditionContextFor(player, this.content))) {
      this.host.notify(player, 'warning', interaction.failureText ?? 'The door is locked.');
      return;
    }
    if (player.addFlag(doorOpenedFlag(id))) this.effects.apply(player, interaction.effects);
    const grid = level.gridWithDoors(openDoorsOf(player, this.content));
    player.path = pathThroughDoor(grid, level.layout, level.doors, player.position, placed.placement.position);
    this.host.raiseQuestEvent(player, { type: 'interactedWith', objectId: id });
  }

  private reissueDestroyedItems(player: Player, interaction: ObjectInteraction): boolean {
    const granted = interactionGrantsQuestItem(this.content, interaction);
    const destroyed = granted.filter((itemId) => destroyedQuantity(player.record.flags, itemId) > 0);
    if (destroyed.length === 0) return false;
    const missing = destroyed
      .filter((itemId) => countItem(player.record.inventory, itemId) === 0 && storedCount(player.record.storage, itemId) === 0)
      .map((itemId) => ({ itemId, count: destroyedQuantity(player.record.flags, itemId) }));
    player.update({ flags: forgetDestroyed(player.record.flags, destroyed) });
    if (missing.length === 0) return false;
    this.effects.apply(player, [
      ...missing.map(({ itemId, count }) => ({ type: 'giveItem' as const, itemId, count })),
      { type: 'notify', text: `You recover a replacement ${missing.map(({ itemId }) => this.content.items.get(itemId)?.name ?? itemId).join(' and ')}.` },
    ]);
    return true;
  }

  private targetPosition(player: Player, pending: Pick<PendingInteraction, 'kind' | 'instanceId'>): TilePoint | null {
    const level = this.world.levelOf(player);
    if (pending.kind === 'groundItem') return this.host.groundItemPosition(player, pending.instanceId);
    if (pending.kind === 'npc') return level.npcs.get(pending.instanceId)?.position ?? null;
    return level.objects.get(pending.instanceId)?.placement.position ?? null;
  }
}
