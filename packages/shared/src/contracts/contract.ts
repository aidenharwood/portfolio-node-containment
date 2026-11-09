import type { CreatureId } from '../combat/creatures.ts';
import type { ItemId } from '../ids.ts';
import type { Condition } from '../rules/conditions.ts';
import type { GameEffect } from '../rules/effects.ts';
import type { QuestEvent } from '../quests/questProgress.ts';

export type ContractId = string;

export const CONTRACT_CADENCES = ['daily', 'weekly'] as const;

export type ContractCadence = (typeof CONTRACT_CADENCES)[number];

export const CONTRACTS_OFFERED: Readonly<Record<ContractCadence, number>> = { daily: 3, weekly: 2 };

export const COMMENDATION_ITEM_ID: ItemId = 'directorate-commendation';

export type ContractObjective =
  | { readonly type: 'defeat'; readonly creatureIds: readonly CreatureId[]; readonly count: number }
  | { readonly type: 'contain'; readonly creatureIds: readonly CreatureId[]; readonly count: number }
  | { readonly type: 'gather'; readonly itemIds: readonly ItemId[]; readonly count: number }
  | { readonly type: 'craft'; readonly itemIds: readonly ItemId[]; readonly count: number };

export interface ContractDefinition {
  readonly id: ContractId;
  readonly name: string;
  readonly brief: string;
  readonly cadence: ContractCadence;
  readonly tier: number;
  readonly requires: readonly Condition[];
  readonly objective: ContractObjective;
  readonly commendations: number;
  readonly rewards: readonly GameEffect[];
  readonly rewardSummary: string;
}

export function contractProgressFrom(objective: ContractObjective, event: QuestEvent): number {
  switch (objective.type) {
    case 'defeat':
      return event.type === 'defeated' && objective.creatureIds.includes(event.creatureId) ? 1 : 0;
    case 'contain':
      return event.type === 'contained' && objective.creatureIds.includes(event.creatureId) ? 1 : 0;
    case 'gather':
      return event.type === 'gathered' && objective.itemIds.includes(event.itemId) ? event.count : 0;
    case 'craft':
      return event.type === 'crafted' && objective.itemIds.includes(event.itemId) ? event.count : 0;
  }
}
