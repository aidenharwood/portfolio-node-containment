import type { CharacterAppearance } from '../character/appearance.ts';
import type { CombatProfile } from '../character/derivedStats.ts';
import type { CreatureId } from '../combat/creatures.ts';
import type { WeaponKind } from '../combat/weapons.ts';
import type { CraftingStation } from '../crafting/recipes.ts';
import type { CharacterSummary } from '../character/character.ts';
import type { PronounSetId } from '../character/pronouns.ts';
import type { SkillExperience } from '../character/skills.ts';
import type { EquipmentState } from '../gear/equipment.ts';
import type { InventoryState } from '../gear/inventory.ts';
import type { StorageState } from '../gear/storage.ts';
import type { MarketAccess, MarketOrder, MarketQuote } from '../economy/market.ts';
import type { ContractLedger } from '../contracts/contractLedger.ts';
import type { FriendView } from '../social/friends.ts';
import type { PartyView } from '../social/party.ts';
import type { StatId } from '../gear/stats.ts';
import type { CharacterId, DistrictId, EntityId, ItemId, LevelId, NpcId, TramStationId, WorldObjectId } from '../ids.ts';
import type { ChunkKey } from '../world/chunks.ts';
import type { QuestLog } from '../quests/questProgress.ts';
import type { Facing, TilePoint } from '../world/geometry.ts';

export interface EntityVitals {
  readonly integrity: number;
  readonly maxIntegrity: number;
}

export interface EntitySnapshot {
  readonly id: EntityId;
  readonly kind: 'player' | 'npc' | 'creature';
  readonly name: string;
  readonly title: string;
  readonly position: TilePoint;
  readonly facing: Facing;
  readonly appearance: CharacterAppearance | null;
  readonly gear: readonly ItemId[];
  readonly npcId?: NpcId;
  readonly creatureId?: CreatureId;
  readonly level?: number;
  readonly vitals?: EntityVitals;
}

export interface GroundItemSnapshot {
  readonly id: string;
  readonly itemId: ItemId;
  readonly quantity: number;
  readonly position: TilePoint;
  readonly owned: boolean;
}

export interface EntityMovement {
  readonly entityId: EntityId;
  readonly position: TilePoint;
  readonly facing: Facing;
}

export interface SelfState {
  readonly characterId: CharacterId;
  readonly name: string;
  readonly pronouns: PronounSetId;
  readonly skills: SkillExperience;
  readonly inventory: InventoryState;
  readonly storage: StorageState;
  readonly equipment: EquipmentState;
  readonly quests: QuestLog;
  readonly stats: Readonly<Record<StatId, number>>;
  readonly profile: CombatProfile;
  readonly vitals: EntityVitals;
  readonly combatLevel: number;
  readonly discoveredStations: readonly TramStationId[];
  readonly visitedLevels: readonly LevelId[];
  readonly visitedDistricts: readonly DistrictId[];
  readonly openDoors: readonly WorldObjectId[];
  readonly openPassages: readonly WorldObjectId[];
  readonly studiedCreatures: readonly CreatureId[];
  readonly contracts: ContractLedger;
}

export interface DialogueView {
  readonly speakerName: string;
  readonly speakerTitle: string;
  readonly speaker: 'npc' | 'player';
  readonly text: string;
  readonly options: readonly { readonly index: number; readonly text: string }[] | null;
}

export interface PlayerActivityView {
  readonly label: string;
  readonly ticksPerAction: number;
  readonly remaining: number | null;
}

export type ChatChannel = 'local' | 'party' | 'site' | 'whisper' | 'system' | 'quest';

export type NoticeTone = 'info' | 'success' | 'warning';

export type ServerMessage =
  | { readonly type: 'auth.accepted'; readonly token: string; readonly username: string }
  | { readonly type: 'auth.rejected'; readonly reason: string }
  | { readonly type: 'auth.loggedOut' }
  | { readonly type: 'character.roster'; readonly characters: readonly CharacterSummary[]; readonly maxCharacters: number }
  | { readonly type: 'character.rejected'; readonly errors: readonly string[] }
  | {
      readonly type: 'world.entered';
      readonly levelId: LevelId;
      readonly selfEntityId: EntityId;
      readonly entities: readonly EntitySnapshot[];
      readonly groundItems: readonly GroundItemSnapshot[];
      readonly depletedObjects: readonly string[];
      readonly tickMs: number;
      readonly layer: number;
    }
  | { readonly type: 'world.entitySpawned'; readonly entity: EntitySnapshot }
  | { readonly type: 'world.entityDespawned'; readonly entityId: EntityId }
  | {
      readonly type: 'world.chunksEntered';
      readonly chunks: readonly ChunkKey[];
      readonly entities: readonly EntitySnapshot[];
      readonly groundItems: readonly GroundItemSnapshot[];
      readonly depletedObjects: readonly string[];
    }
  | { readonly type: 'world.chunksLeft'; readonly chunks: readonly ChunkKey[] }
  | { readonly type: 'world.tick'; readonly movements: readonly EntityMovement[] }
  | { readonly type: 'world.entityGearChanged'; readonly entityId: EntityId; readonly gear: readonly ItemId[] }
  | { readonly type: 'world.speech'; readonly entityId: EntityId; readonly text: string }
  | { readonly type: 'player.state'; readonly self: SelfState }
  | { readonly type: 'player.vitals'; readonly vitals: EntityVitals; readonly targetId: EntityId | null }
  | {
      readonly type: 'combat.hit';
      readonly attackerId: EntityId;
      readonly targetId: EntityId;
      readonly outcome: 'hit' | 'miss';
      readonly damage: number;
      readonly style: 'melee' | 'ranged';
      readonly weapon?: WeaponKind;
      readonly vitals: EntityVitals;
    }
  | { readonly type: 'combat.death'; readonly entityId: EntityId; readonly containedBy?: EntityId }
  | { readonly type: 'world.groundItemAdded'; readonly item: GroundItemSnapshot }
  | { readonly type: 'world.groundItemRemoved'; readonly id: string }
  | { readonly type: 'shop.opened'; readonly shopId: string }
  | { readonly type: 'shop.closed' }
  | { readonly type: 'crafting.opened'; readonly station: CraftingStation }
  | { readonly type: 'crafting.closed' }
  | { readonly type: 'storage.opened' }
  | { readonly type: 'storage.closed' }
  | { readonly type: 'market.opened'; readonly access: MarketAccess }
  | { readonly type: 'market.state'; readonly orders: readonly MarketOrder[]; readonly quotes: readonly MarketQuote[] }
  | { readonly type: 'market.closed' }
  | { readonly type: 'player.activity'; readonly activity: PlayerActivityView | null }
  | { readonly type: 'world.objectDepleted'; readonly instanceId: string; readonly depleted: boolean }
  | { readonly type: 'tram.mapOpened'; readonly stationId: TramStationId }
  | { readonly type: 'tram.departed'; readonly originStationId: TramStationId; readonly destinationStationId: TramStationId; readonly rideTicks: number }
  | { readonly type: 'tram.arrived'; readonly stationId: TramStationId }
  | { readonly type: 'dialogue.opened'; readonly view: DialogueView }
  | { readonly type: 'dialogue.closed' }
  | { readonly type: 'chat.message'; readonly channel: ChatChannel; readonly author?: string; readonly recipient?: string; readonly text: string }
  | { readonly type: 'party.invited'; readonly inviterId: CharacterId; readonly inviterName: string }
  | { readonly type: 'party.state'; readonly party: PartyView | null }
  | { readonly type: 'friends.state'; readonly friends: readonly FriendView[] }
  | { readonly type: 'contracts.opened' }
  | { readonly type: 'contracts.closed' }
  | { readonly type: 'notice'; readonly tone: NoticeTone; readonly text: string }
  | { readonly type: 'error'; readonly message: string };

export type ServerMessageType = ServerMessage['type'];

export type ServerMessageOf<T extends ServerMessageType> = Extract<ServerMessage, { type: T }>;
