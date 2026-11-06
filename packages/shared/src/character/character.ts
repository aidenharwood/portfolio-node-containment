import type { AccountId, CharacterId, ZoneId } from '../ids.ts';
import type { EquipmentState } from '../gear/equipment.ts';
import type { InventoryState } from '../gear/inventory.ts';
import type { StorageState } from '../gear/storage.ts';
import type { QuestLog } from '../quests/questProgress.ts';
import type { TilePoint } from '../world/geometry.ts';
import type { CharacterAppearance } from './appearance.ts';
import type { PronounSetId } from './pronouns.ts';
import type { SkillExperience } from './skills.ts';

export interface ZoneLocation {
  readonly zoneId: ZoneId;
  readonly position: TilePoint;
}

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
  readonly location: ZoneLocation;
  readonly createdAt: number;
}

export interface CharacterSummary {
  readonly id: CharacterId;
  readonly name: string;
  readonly appearance: CharacterAppearance;
  readonly equipment: EquipmentState;
  readonly operativeRating: number;
  readonly zoneId: ZoneId;
}
