import type { GearMotif } from '../gear/items.ts';
import type { ItemId } from '../ids.ts';
import type { FootprintSize } from '../world/footprint.ts';
import type { EncounterDefinition } from './encounters.ts';
import type { CombatStyle } from './weapons.ts';

export type CreatureId = string;

export type CreatureModel =
  | 'placeholder'
  | 'canalRat'
  | 'pigeon'
  | 'strayDog'
  | 'trainingDrone'
  | 'crateWisp'
  | 'gutterMite'
  | 'siltEel'
  | 'scrapCrawler'
  | 'rustling'
  | 'lineMimic'
  | 'scrapMagpie'
  | 'lamplighter'
  | 'mothLantern'
  | 'glassHound'
  | 'hullKnocker'
  | 'tideWraith';

export interface LootEntry {
  readonly itemId: ItemId;
  readonly count: number;
  readonly chance: number;
}

export const CONTAINMENT_CLASSES = ['safe', 'euclid', 'keter'] as const;

export type ContainmentClass = (typeof CONTAINMENT_CLASSES)[number];

export interface ContainmentProfile {
  readonly containmentClass: ContainmentClass;
  readonly procedures: string;
  readonly experience: number;
  readonly loot: readonly LootEntry[];
  readonly requiredLevel?: number;
}

export interface CreatureAttack {
  readonly style: CombatStyle;
  readonly accuracy: number;
  readonly maxHit: number;
  readonly range: number;
  readonly speedTicks: number;
}

export interface CreatureDefinition {
  readonly id: CreatureId;
  readonly name: string;
  readonly designation?: string;
  readonly examine: string;
  readonly model: CreatureModel;
  readonly size?: FootprintSize;
  readonly level: number;
  readonly integrity: number;
  readonly defence: number;
  readonly attack: CreatureAttack;
  readonly guard?: GearMotif;
  readonly aggressive?: boolean;
  readonly relentless?: boolean;
  readonly aggroRadius: number;
  readonly leashRadius: number;
  readonly wanderRadius: number;
  readonly respawnTicks: number;
  readonly experience: number;
  readonly loot: readonly LootEntry[];
  readonly containment?: ContainmentProfile;
  readonly encounter?: EncounterDefinition;
}
