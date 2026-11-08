import type {
  AreaId,
  CharacterId,
  CharacterRecord,
  ClientMessageOf,
  CraftingStation,
  GameContent,
  NoticeTone,
  QuestEvent,
  QuestId,
  TilePoint,
  DistrictId,
  WorldLocation,
} from '@containment/shared';
import { locate } from '@containment/shared';
import { Player, type MessageSink } from '../world/player.ts';
import type { LevelInstance } from '../world/levelInstance.ts';
import { World, type WorldHooks } from '../world/world.ts';
import { ChatController } from './chatController.ts';
import { CombatController, type CombatHost } from './combatController.ts';
import { CraftingController } from './craftingController.ts';
import { GatheringController, type GatheringHost } from './gatheringController.ts';
import { DialogueController } from './dialogueController.ts';
import { EffectRunner, type EffectHost } from './effectRunner.ts';
import { GearController } from './gearController.ts';
import { GroundItemController } from './groundItemController.ts';
import { InteractionController } from './interactionController.ts';
import { selfStateOf } from './playerContext.ts';
import { QuestTracker } from './questTracker.ts';
import { ShopController } from './shopController.ts';
import { StorageController } from './storageController.ts';

export type GameplayMessage = ClientMessageOf<
  | 'world.walk'
  | 'world.interact'
  | 'dialogue.continue'
  | 'dialogue.choose'
  | 'dialogue.close'
  | 'inventory.equip'
  | 'inventory.use'
  | 'inventory.drop'
  | 'world.pickup'
  | 'inventory.swap'
  | 'equipment.unequip'
  | 'chat.say'
  | 'shop.buy'
  | 'shop.sell'
  | 'shop.close'
  | 'crafting.make'
  | 'crafting.close'
  | 'storage.deposit'
  | 'storage.depositAll'
  | 'storage.withdraw'
  | 'storage.close'
>;

export interface CharacterStore {
  save(record: CharacterRecord): void;
}

export interface GameplayOptions {
  readonly tickMs: number;
  readonly autosaveIntervalMs: number;
  readonly random?: () => number;
  readonly combatRandom?: () => number;
  readonly gatheringRandom?: () => number;
  readonly levelCapacity?: number;
}

export class Gameplay implements EffectHost, GatheringHost, WorldHooks, CombatHost {
  readonly world: World;
  private readonly content: GameContent;
  private readonly store: CharacterStore;
  private readonly online = new Map<CharacterId, Player>();
  private readonly quests: QuestTracker;
  private readonly effects: EffectRunner;
  private readonly dialogues: DialogueController;
  private readonly interactions: InteractionController;
  private readonly gear: GearController;
  private readonly chat: ChatController;
  private readonly combat: CombatController;
  private readonly shops: ShopController;
  private readonly groundItems: GroundItemController;
  private readonly gathering: GatheringController;
  private readonly crafting: CraftingController;
  private readonly storage: StorageController;
  private tickNumber = 0;
  private readonly autosaveEveryTicks: number;
  private ticksSinceAutosave = 0;

  constructor(content: GameContent, store: CharacterStore, options: GameplayOptions) {
    this.content = content;
    this.store = store;
    this.world = new World(content, this, { tickMs: options.tickMs, random: options.random, capacityOverride: options.levelCapacity });
    this.effects = new EffectRunner(content, this);
    this.quests = new QuestTracker(content, (player, effects) => this.effects.apply(player, effects));
    this.dialogues = new DialogueController(content, this.world, this.effects, this);
    this.interactions = new InteractionController(content, this.world, this.dialogues, this.effects, this);
    this.gear = new GearController(content, this.world, this);
    this.chat = new ChatController(this.world);
    this.shops = new ShopController(content, this.world, this);
    this.groundItems = new GroundItemController(content, this.world, this);
    this.gathering = new GatheringController(content, this.world, this.effects, this, options.gatheringRandom ?? options.random ?? Math.random);
    this.crafting = new CraftingController(content, this.effects, this);
    this.storage = new StorageController(content, this);
    this.combat = new CombatController(content, this.world, this.effects, this, options.combatRandom ?? options.random ?? Math.random);
    this.autosaveEveryTicks = Math.max(1, Math.round(options.autosaveIntervalMs / options.tickMs));
  }

  isOnline(characterId: CharacterId): boolean {
    return this.online.has(characterId);
  }

  get onlineCount(): number {
    return this.online.size;
  }

  enterWorld(record: CharacterRecord, sink: MessageSink): Player {
    const existing = this.online.get(record.id);
    if (existing) {
      this.leaveWorld(existing);
      existing.sink.detach('This operative was deployed from another connection.');
    }
    const player = new Player(existing?.persistableRecord() ?? record, sink);
    this.online.set(record.id, player);
    this.world.spawn(player);
    this.quests.handle(player, { type: 'loadoutChanged' });
    this.quests.resumeFollowUps(player);
    this.flush(player);
    player.send({ type: 'chat.message', channel: 'system', text: `Welcome to Site Meridian, ${player.record.name}.` });
    return player;
  }

  leaveWorld(player: Player): void {
    if (this.online.get(player.record.id) !== player) return;
    this.dialogues.close(player);
    this.stopActivities(player);
    this.world.despawn(player);
    this.chat.forget(player);
    this.online.delete(player.record.id);
    this.store.save(player.persistableRecord());
  }

  handle(player: Player, message: GameplayMessage): void {
    switch (message.type) {
      case 'world.walk':
        this.dialogues.close(player);
        this.shops.close(player);
        this.stopActivities(player);
        this.combat.disengage(player);
        player.pendingInteraction = null;
        this.world.walk(player, message.target);
        break;
      case 'world.interact':
        this.stopActivities(player);
        if (message.targetKind === 'creature') {
          this.dialogues.close(player);
          this.combat.engage(player, message.instanceId, this.tickNumber);
          break;
        }
        this.combat.disengage(player);
        this.interactions.request(player, {
          kind: message.targetKind,
          instanceId: message.instanceId,
          interactionIndex: message.interactionIndex,
        });
        break;
      case 'dialogue.continue':
        this.dialogues.continue(player);
        break;
      case 'dialogue.choose':
        this.dialogues.choose(player, message.optionIndex);
        break;
      case 'dialogue.close':
        this.dialogues.close(player);
        break;
      case 'inventory.equip':
        this.gear.equip(player, message.slotIndex);
        break;
      case 'inventory.drop':
        this.gear.drop(player, message.slotIndex);
        break;
      case 'world.pickup':
        this.dialogues.close(player);
        this.stopActivities(player);
        this.combat.disengage(player);
        this.interactions.request(player, { kind: 'groundItem', instanceId: message.groundItemId, interactionIndex: 0 });
        break;
      case 'inventory.use':
        this.gear.use(player, message.slotIndex, this.tickNumber);
        break;
      case 'inventory.swap':
        this.gear.swap(player, message.from, message.to);
        break;
      case 'equipment.unequip':
        this.gear.unequip(player, message.slot);
        break;
      case 'chat.say':
        this.chat.say(player, message.text);
        break;
      case 'shop.buy':
        this.shops.buy(player, message.itemId, message.quantity);
        break;
      case 'shop.sell':
        this.shops.sell(player, message.slotIndex, message.quantity);
        break;
      case 'shop.close':
        this.shops.close(player);
        break;
      case 'crafting.make':
        this.gathering.stop(player);
        this.crafting.make(player, message.recipeId, message.quantity, this.tickNumber);
        break;
      case 'crafting.close':
        this.crafting.close(player);
        break;
      case 'storage.deposit':
        this.storage.deposit(player, message.slotIndex, message.quantity);
        break;
      case 'storage.depositAll':
        this.storage.depositAll(player);
        break;
      case 'storage.withdraw':
        this.storage.withdraw(player, message.itemId, message.quantity);
        break;
      case 'storage.close':
        this.storage.close(player);
        break;
    }
    this.flush(player);
  }

  tick(): void {
    this.world.tick();
    this.combat.tick(++this.tickNumber);
    this.groundItems.tick(this.tickNumber);
    this.gathering.tick(this.tickNumber);
    this.crafting.tick(this.tickNumber, this.online.values());
    for (const player of this.online.values()) this.flush(player);
    if (++this.ticksSinceAutosave >= this.autosaveEveryTicks) {
      this.ticksSinceAutosave = 0;
      this.saveAll();
    }
  }

  saveAll(): void {
    for (const player of this.online.values()) this.store.save(player.persistableRecord());
  }

  startQuest(player: Player, questId: QuestId): void {
    this.quests.start(player, questId);
  }

  raiseQuestEvent(player: Player, event: QuestEvent): void {
    this.quests.handle(player, event);
  }

  dropToGround(owner: Player, itemId: string, quantity: number, position: TilePoint): void {
    this.groundItems.drop(this.world.levelOf(owner), { itemId, quantity, position, ownerId: owner.entityId });
  }

  pickUp(player: Player, groundItemId: string): void {
    this.groundItems.pickup(player, groundItemId);
  }

  groundItemPosition(player: Player, groundItemId: string): TilePoint | null {
    return this.groundItems.positionOf(player, groundItemId);
  }

  combatIsMulti(level: LevelInstance, point: TilePoint): boolean {
    return this.combat.isMultiCombat(level, point);
  }

  openCrafting(player: Player, station: CraftingStation): void {
    this.shops.close(player);
    this.crafting.open(player, station);
  }

  startGathering(player: Player, instanceId: string, interactionIndex: number): void {
    this.crafting.close(player);
    this.gathering.start(player, instanceId, interactionIndex, this.tickNumber);
  }

  sendActivity(player: Player, label: string | null, ticksPerAction = 0, remaining: number | null = null): void {
    player.send({ type: 'player.activity', activity: label ? { label, ticksPerAction, remaining } : null });
  }

  openStorage(player: Player): void {
    this.shops.close(player);
    this.crafting.close(player);
    this.storage.open(player);
  }

  private stopActivities(player: Player): void {
    this.gathering.stop(player);
    this.crafting.close(player);
    this.storage.close(player);
  }

  openShop(player: Player, shopId: string, keeperInstanceId: string | null): void {
    this.shops.open(player, shopId, keeperInstanceId);
  }

  teleport(player: Player, location: WorldLocation): void {
    this.shops.close(player);
    this.stopActivities(player);
    this.dialogues.close(player);
    this.combat.disengage(player);
    this.world.transfer(player, location);
  }

  notify(player: Player, tone: NoticeTone, text: string): void {
    player.send({ type: 'notice', tone, text });
    player.send({ type: 'chat.message', channel: 'system', text });
  }

  recoverIncapacitated(player: Player): void {
    const level = this.world.levelOf(player).definition;
    const fallen = this.content.districts.get(this.world.districtOf(player) ?? level.definition.spawn.districtId);
    const recoveryDistrictId = fallen?.recovery?.districtId ?? level.definition.spawn.districtId;
    const recovery = (fallen?.recovery && locate(this.content, fallen.recovery.districtId, fallen.recovery.position)) || { levelId: level.id, position: level.spawn };
    const recoveryName = this.content.districts.get(recoveryDistrictId)?.name ?? level.name;
    this.dialogues.close(player);
    this.world.transfer(player, recovery);
    player.setIntegrity(player.maxIntegrity);
    this.notify(player, 'warning', `You were incapacitated. Medical recovered you to the ${recoveryName}.`);
  }

  onAreaEntered(player: Player, districtId: DistrictId, areaId: AreaId): void {
    this.quests.handle(player, { type: 'enteredArea', districtId, areaId });
  }

  onPathCompleted(player: Player): void {
    this.interactions.resolveArrival(player);
  }

  private flush(player: Player): void {
    if (player.consumeStateDirty()) player.send({ type: 'player.state', self: selfStateOf(player, this.content) });
  }
}
