import type {
  AreaId,
  CharacterId,
  CharacterRecord,
  ClientMessageOf,
  CraftingStation,
  FriendEntry,
  GameContent,
  NoticeTone,
  QuestEvent,
  QuestId,
  TilePoint,
  DistrictId,
  LevelId,
  WorldLocation,
  WorldObjectId,
} from '@containment/shared';
import { CONTAIN_INTERACTION, locate, STUDY_INTERACTION, visitedLevelFlag } from '@containment/shared';
import { returnUnfinishedTrainee } from '../characters/traineePlacement.ts';
import { Player, type MessageSink } from '../world/player.ts';
import type { LevelInstance } from '../world/levelInstance.ts';
import { World, type WorldHooks } from '../world/world.ts';
import { CombatController, type CombatHost } from './combatController.ts';
import { ContractController } from './contractController.ts';
import { CraftingController } from './craftingController.ts';
import { GatheringController, type GatheringHost } from './gatheringController.ts';
import { DialogueController } from './dialogueController.ts';
import { EffectRunner, type EffectHost } from './effectRunner.ts';
import { GearController } from './gearController.ts';
import { GroundItemController } from './groundItemController.ts';
import { InteractionController } from './interactionController.ts';
import { createMemoryMarketStore, MarketController, type MarketStore } from './marketController.ts';
import { openDoorsOf, selfStateOf } from './playerContext.ts';
import { QuestTracker } from './questTracker.ts';
import { ResearchController } from './researchController.ts';
import { ShopController } from './shopController.ts';
import { SocialController, type SocialHost } from './socialController.ts';
import { StorageController } from './storageController.ts';
import { TramController, type TramHost } from './tramController.ts';

export type GameplayMessage = ClientMessageOf<
  | 'world.walk'
  | 'world.interact'
  | 'dialogue.continue'
  | 'dialogue.choose'
  | 'dialogue.close'
  | 'inventory.equip'
  | 'inventory.use'
  | 'inventory.drop'
  | 'inventory.destroy'
  | 'world.pickup'
  | 'inventory.swap'
  | 'equipment.unequip'
  | 'chat.say'
  | 'chat.whisper'
  | 'party.invite'
  | 'party.accept'
  | 'party.decline'
  | 'party.leave'
  | 'party.kick'
  | 'party.promote'
  | 'friends.add'
  | 'friends.remove'
  | 'contracts.claim'
  | 'contracts.close'
  | 'shop.buy'
  | 'shop.sell'
  | 'shop.close'
  | 'crafting.make'
  | 'crafting.close'
  | 'storage.deposit'
  | 'storage.depositAll'
  | 'storage.withdraw'
  | 'storage.close'
  | 'market.place'
  | 'market.cancel'
  | 'market.collect'
  | 'market.close'
  | 'tram.board'
>;

const CONTRACT_REFRESH_TICKS = 200;

const SOCIAL_MESSAGE_TYPES = new Set<GameplayMessage['type']>(['chat.say', 'chat.whisper', 'party.invite', 'party.accept', 'party.decline', 'party.leave', 'party.kick', 'party.promote', 'friends.add', 'friends.remove']);

export interface CharacterStore {
  save(record: CharacterRecord): void;
  findByName(name: string): FriendEntry | null;
}

export interface GameplayOptions {
  readonly tickMs: number;
  readonly autosaveIntervalMs: number;
  readonly random?: () => number;
  readonly combatRandom?: () => number;
  readonly gatheringRandom?: () => number;
  readonly levelCapacity?: number;
  readonly market?: MarketStore;
  readonly now?: () => number;
}

export class Gameplay implements EffectHost, GatheringHost, WorldHooks, CombatHost, TramHost, SocialHost {
  readonly world: World;
  private readonly content: GameContent;
  private readonly store: CharacterStore;
  private readonly online = new Map<CharacterId, Player>();
  private readonly quests: QuestTracker;
  private readonly effects: EffectRunner;
  private readonly dialogues: DialogueController;
  private readonly interactions: InteractionController;
  private readonly gear: GearController;
  private readonly social: SocialController;
  private readonly contracts: ContractController;
  private readonly now: () => number;
  private readonly combat: CombatController;
  private readonly shops: ShopController;
  private readonly groundItems: GroundItemController;
  private readonly gathering: GatheringController;
  private readonly crafting: CraftingController;
  private readonly storage: StorageController;
  private readonly market: MarketController;
  private readonly trams: TramController;
  private readonly research: ResearchController;
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
    this.now = options.now ?? Date.now;
    this.social = new SocialController(content, this.world, this);
    this.contracts = new ContractController(content, this.effects, this, this.now);
    this.shops = new ShopController(content, this.world, this);
    this.groundItems = new GroundItemController(content, this.world, this);
    this.gathering = new GatheringController(content, this.world, this.effects, this, options.gatheringRandom ?? options.random ?? Math.random);
    this.crafting = new CraftingController(content, this.effects, this);
    this.storage = new StorageController(content, this);
    this.market = new MarketController(content, this.world, this, options.market ?? createMemoryMarketStore(), (characterId) => this.online.get(characterId));
    this.trams = new TramController(content, this.world, this);
    this.research = new ResearchController(content, this.world, this.effects, this);
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
    const player = new Player(existing?.persistableRecord() ?? returnUnfinishedTrainee(record, this.content), sink);
    this.online.set(record.id, player);
    this.world.spawn(player);
    this.quests.handle(player, { type: 'loadoutChanged' });
    this.quests.resumeFollowUps(player);
    this.contracts.refresh(player, true);
    this.social.arrive(player);
    this.flush(player);
    player.send({ type: 'chat.message', channel: 'system', text: `Welcome to Site Meridian, ${player.record.name}.` });
    return player;
  }

  leaveWorld(player: Player): void {
    if (this.online.get(player.record.id) !== player) return;
    this.combat.recover(player);
    this.dialogues.close(player);
    const tramArrival = this.trams.pendingArrival(player);
    this.stopActivities(player);
    this.world.despawn(player);
    if (tramArrival) player.relocate(tramArrival);
    this.market.forget(player);
    this.online.delete(player.record.id);
    this.social.depart(player);
    this.store.save(player.persistableRecord());
  }

  handle(player: Player, message: GameplayMessage): void {
    if ((player.incapacitatedAtTick !== null || player.isRidingTram) && !SOCIAL_MESSAGE_TYPES.has(message.type)) return;
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
          if (message.interactionIndex === STUDY_INTERACTION) {
            this.combat.disengage(player);
            this.research.study(player, message.instanceId);
          } else if (message.interactionIndex === CONTAIN_INTERACTION) this.combat.contain(player, message.instanceId, this.tickNumber);
          else this.combat.engage(player, message.instanceId, this.tickNumber);
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
      case 'inventory.destroy':
        this.gear.destroy(player, message.slotIndex);
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
        this.social.say(player, message.text, message.channel ?? 'local', this.now());
        break;
      case 'chat.whisper':
        this.social.whisper(player, message.to, message.text, this.now());
        break;
      case 'party.invite':
        this.social.invite(player, message.name);
        break;
      case 'party.accept':
        this.social.acceptInvite(player, message.inviterId);
        break;
      case 'party.decline':
        this.social.declineInvite(player, message.inviterId);
        break;
      case 'party.leave':
        this.social.leave(player);
        break;
      case 'party.kick':
        this.social.kick(player, message.characterId);
        break;
      case 'party.promote':
        this.social.promote(player, message.characterId);
        break;
      case 'friends.add':
        this.social.addFriend(player, message.name);
        break;
      case 'friends.remove':
        this.social.removeFriend(player, message.characterId);
        break;
      case 'contracts.claim':
        this.contracts.claim(player, message.cadence, message.contractId);
        this.store.save(player.persistableRecord());
        break;
      case 'contracts.close':
        this.contracts.close(player);
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
      case 'market.place':
        this.market.place(player, { side: message.side, itemId: message.itemId, price: message.price, quantity: message.quantity });
        this.store.save(player.persistableRecord());
        break;
      case 'market.cancel':
        this.market.cancel(player, message.orderId);
        this.store.save(player.persistableRecord());
        break;
      case 'market.collect':
        this.market.collect(player, message.orderId);
        this.store.save(player.persistableRecord());
        break;
      case 'market.close':
        this.market.close(player);
        break;
      case 'tram.board':
        this.dialogues.close(player);
        this.shops.close(player);
        this.stopActivities(player);
        this.combat.disengage(player);
        this.trams.board(player, message.destinationStationId, this.tickNumber);
        break;
    }
    this.flush(player);
  }

  tick(): void {
    this.world.tick();
    this.combat.tick(++this.tickNumber);
    this.groundItems.tick(this.tickNumber);
    this.gathering.tick(this.tickNumber);
    this.research.tick(this.tickNumber);
    this.crafting.tick(this.tickNumber, this.online.values());
    this.trams.tick(this.tickNumber);
    this.social.tick(this.tickNumber);
    if (this.tickNumber % CONTRACT_REFRESH_TICKS === 0) for (const player of this.online.values()) this.contracts.refresh(player, true);
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
    this.contracts.handle(player, event);
  }

  onlinePlayer(characterId: CharacterId): Player | undefined {
    return this.online.get(characterId);
  }

  onlinePlayers(): Iterable<Player> {
    return this.online.values();
  }

  findCharacter(name: string): FriendEntry | null {
    return this.store.findByName(name);
  }

  partyMatesOf(player: Player): readonly Player[] {
    return this.social.partyMatesOf(player);
  }

  openContracts(player: Player): void {
    this.shops.close(player);
    this.crafting.close(player);
    this.storage.close(player);
    this.market.close(player);
    this.contracts.open(player);
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
    this.market.close(player);
    this.storage.open(player);
  }

  openMarket(player: Player): void {
    this.shops.close(player);
    this.crafting.close(player);
    this.storage.close(player);
    this.market.open(player);
  }

  forgetCharacter(characterId: CharacterId): void {
    this.market.removeOwner(characterId);
  }

  private stopActivities(player: Player): void {
    this.trams.cancelBoarding(player);
    this.gathering.stop(player);
    this.research.stop(player);
    this.crafting.close(player);
    this.storage.close(player);
    this.market.close(player);
    this.contracts.close(player);
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

  openTramMap(player: Player): void {
    this.trams.openMap(player);
  }

  discoverStation(player: Player, stationId: string): void {
    this.trams.discover(player, stationId);
  }

  withdrawFromCombat(player: Player): void {
    this.combat.disengage(player);
  }

  onDamaged(player: Player): void {
    if (this.trams.cancelBoarding(player)) this.notify(player, 'warning', 'You were hit, so you stepped back from the tram.');
  }

  openDoorsFor(player: Player): ReadonlySet<WorldObjectId> {
    return openDoorsOf(player, this.content);
  }

  onLevelEntered(player: Player, levelId: LevelId): void {
    const firstVisit = player.addFlag(visitedLevelFlag(levelId));
    const level = this.content.levels.get(levelId);
    if (firstVisit && level?.definition.kind === 'pocket') this.notify(player, 'info', `You have slipped into ${level.name}. It is on your world map now.`);
  }

  notify(player: Player, tone: NoticeTone, text: string): void {
    player.send({ type: 'notice', tone, text });
  }

  onIncapacitated(player: Player): void {
    this.shops.close(player);
    this.stopActivities(player);
    this.dialogues.close(player);
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
    this.trams.discoverByArea(player, districtId, areaId);
    this.quests.handle(player, { type: 'enteredArea', districtId, areaId });
  }

  onPathCompleted(player: Player): void {
    this.interactions.resolveArrival(player);
  }

  private flush(player: Player): void {
    if (player.consumeStateDirty()) player.send({ type: 'player.state', self: selfStateOf(player, this.content) });
  }
}
