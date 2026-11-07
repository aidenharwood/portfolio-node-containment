import type { ItemId } from '../ids.ts';
import type { CombatStyle } from './weapons.ts';

export type CreatureId = string;

export type CreatureModel = 'trainingDrone' | 'gloamMite' | 'hollowWarden' | 'staticWraith' | 'pipeLeech' | 'rustHound' | 'foreman' | 'thornCrawler' | 'sporeDrifter';

export interface LootEntry {
  readonly itemId: ItemId;
  readonly count: number;
  readonly chance: number;
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
  readonly level: number;
  readonly integrity: number;
  readonly defence: number;
  readonly attack: CreatureAttack;
  readonly aggressive?: boolean;
  readonly aggroRadius: number;
  readonly leashRadius: number;
  readonly wanderRadius: number;
  readonly respawnTicks: number;
  readonly experience: number;
  readonly loot: readonly LootEntry[];
}
