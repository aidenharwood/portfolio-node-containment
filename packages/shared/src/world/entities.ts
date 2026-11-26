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
  | 'pathLight'
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
  | 'neonSignCyan'
  | 'neonSignAcid'
  | 'floodMast'
  | 'holoBillboard'
  | 'burnBarrel'
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
  | 'cordonGate'
  | 'secureCell'
  | 'labBench'
  | 'barricade'
  | 'scrapPile'
  | 'dredgeWinch'
  | 'eelTrap'
  | 'reedBed'
  | 'anomalyTrace'
  | 'refinery'
  | 'fabricator'
  | 'synthesiser'
  | 'cooker'
  | 'cat'
  | 'hatch'
  | 'sluiceValve'
  | 'gateLeaf'
  | 'gantryCrane'
  | 'windpump'
  | 'directorateSpire'
  | 'bellTower'
  | 'coolingTower'
  | 'divingBell'
  | 'lighthouse'
  | 'precursorNeedle'
  | 'precursorPylon'
  | 'glassBell'
  | 'tramNoseLeft'
  | 'tramNoseRight'
  | 'tramDoor'
  | 'tramWindow'
  | 'bridgeSpan'
  | 'bridgeEndLeft'
  | 'bridgeEndRight'
  | 'catwalkSpan'
  | 'catwalkEnd'
  | 'departureBoard'
  | 'maglevPylon'
  | 'maglevSpan'
  | 'maglevSpanEnd'
  | 'siphonTrestle'
  | 'siphonPipe'
  | 'ribFoot'
  | 'ribArch'
  | 'ringFoot'
  | 'ringArch'
  | 'uplinkDish'
  | 'uplinkCable'
  | 'broadleafTree'
  | 'birchTree'
  | 'orchardTree'
  | 'windbentPine'
  | 'deadTree'
  | 'bush'
  | 'hedgerow'
  | 'fieldWall'
  | 'hayBale'
  | 'boulder'
  | 'rockOutcrop'
  | 'obsidianOutcrop'
  | 'glassCrystals'
  | 'fusedShards'
  | 'scrapMound'
  | 'tyreHeap'
  | 'wreckedPanel'
  | 'overgrownPlanter'
  | 'rubbleHeap'
  | 'ruinWall'
  | 'treeStump'
  | 'fallenLog'
  | 'wildflowers'
  | 'tallGrass'
  | 'bladeSign'
  | 'acUnit'
  | 'wallVent'
  | 'rollShutter'
  | 'holoPanel'
  | 'cableRun'
  | 'streetStall'
  | 'trashBags'
  | 'parkedBike';

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
  readonly beam?: number;
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
