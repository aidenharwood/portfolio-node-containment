import type { FurnishingProfile } from '../content/furnishingCatalogue.ts';
import type { CharacterAppearance } from '../character/appearance.ts';
import type { GatheringSource } from '../crafting/gathering.ts';
import type { DialogueId, ItemId, NpcId, WorldObjectId } from '../ids.ts';
import type { Condition } from '../rules/conditions.ts';
import type { GameEffect } from '../rules/effects.ts';
import type { DoorDefinition } from './doors.ts';

export interface NpcDefinition {
  readonly id: NpcId;
  readonly name: string;
  readonly title: string;
  readonly examine: string;
  readonly appearance: CharacterAppearance;
  readonly gear: readonly ItemId[];
  readonly dialogueId?: DialogueId;
  readonly shopId?: string;
  readonly wanderRadius: number;
}

export type WorldObjectModel =
  | 'placeholder'
  | 'streetLamp'
  | 'bollard'
  | 'streetBench'
  | 'litterBin'
  | 'vendingMachine'
  | 'dumpster'
  | 'streetTree'
  | 'utilityPole'
  | 'parkedCar'
  | 'foodStall'
  | 'checkpointBarrier'
  | 'steamVent'
  | 'neonSign'
  | 'shopAwning'
  | 'securityCamera'
  | 'noticeBoard'
  | 'directorateSign'
  | 'counter'
  | 'shelving'
  | 'table'
  | 'chair'
  | 'bed'
  | 'storageLocker'
  | 'containmentCell'
  | 'keycardReader'
  | 'clockTower'
  | 'washingLine'
  | 'exchangePost'
  | 'contractBoard'
  | 'marketStall'
  | 'headframe'
  | 'mooringPost'
  | 'liftDoor'
  | 'allotmentBed'
  | 'washer'
  | 'chimney'
  | 'scrapHeap'
  | 'magnetCrane'
  | 'beachedHull'
  | 'lockGate'
  | 'cordonGate';

export interface ObjectInteraction {
  readonly verb: string;
  readonly conditions?: readonly Condition[];
  readonly failureText?: string;
  readonly effects: readonly GameEffect[];
  readonly oncePerCharacter?: boolean;
  readonly alreadyUsedText?: string;
  readonly gather?: GatheringSource;
}

export interface ObjectLight {
  readonly radius: number;
  readonly color: string;
  readonly intensity: number;
  readonly flicker?: boolean;
}

export interface WorldObjectDefinition {
  readonly id: WorldObjectId;
  readonly name: string;
  readonly examine: string;
  readonly model: WorldObjectModel;
  readonly blocksMovement: boolean;
  readonly deck?: boolean;
  readonly footprint?: { readonly width: number; readonly height: number };
  readonly furnishing?: FurnishingProfile;
  readonly door?: DoorDefinition;
  readonly modelScale?: number;
  readonly light?: ObjectLight;
  readonly countsAs?: WorldObjectId;
  readonly interactions: readonly ObjectInteraction[];
}
