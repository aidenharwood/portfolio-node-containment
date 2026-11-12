import type { ContractLedger } from '../contracts/contractLedger.ts';
import type { AccountId, CharacterId, DistrictId } from '../ids.ts';
import type { FriendEntry } from '../social/friends.ts';
import type { EquipmentState } from '../gear/equipment.ts';
import type { InventoryState } from '../gear/inventory.ts';
import type { StorageState } from '../gear/storage.ts';
import type { QuestLog } from '../quests/questProgress.ts';
import type { WorldLocation } from '../world/level.ts';
import type { CharacterAppearance } from './appearance.ts';
import type { PronounSetId } from './pronouns.ts';
import type { SkillExperience } from './skills.ts';

export interface CharacterVitals {
  readonly integrity: number;
}

export interface CharacterRecord {
  readonly id: CharacterId;
  readonly accountId: AccountId;
  readonly name: string;
  readonly pronouns: PronounSetId;
  readonly appearance: CharacterAppearance;
  readonly skills: SkillExperience;
  readonly vitals: CharacterVitals;
  readonly inventory: InventoryState;
  readonly storage: StorageState;
  readonly equipment: EquipmentState;
  readonly quests: QuestLog;
  readonly flags: readonly string[];
  readonly friends: readonly FriendEntry[];
  readonly contracts: ContractLedger;
  readonly location: WorldLocation;
  readonly createdAt: number;
}

export interface CharacterSummary {
  readonly id: CharacterId;
  readonly name: string;
  readonly appearance: CharacterAppearance;
  readonly equipment: EquipmentState;
  readonly combatLevel: number;
  readonly districtId: DistrictId;
}
