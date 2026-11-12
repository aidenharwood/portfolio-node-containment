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
  | 'locker'
  | 'terminal'
  | 'crate'
  | 'lantern'
  | 'lightPillar'
  | 'transitLift'
  | 'bench'
  | 'ventPanel'
  | 'bulkhead'
  | 'kiosk'
  | 'serverRack'
  | 'planter'
  | 'warningSign'
  | 'nest'
  | 'junctionBox'
  | 'pipeCluster'
  | 'pumpHousing'
  | 'heater'
  | 'knockDoor'
  | 'scrapHeap'
  | 'textileBin'
  | 'mossBed'
  | 'severedConduit'
  | 'sporeBloom'
  | 'slagHeap'
  | 'saltSeam'
  | 'geodeCluster'
  | 'herbCabinet'
  | 'tinctureStill'
  | 'resinDrum'
  | 'storageLocker'
  | 'medBed'
  | 'stranglerVine'
  | 'seedVault'
  | 'wallLift'
  | 'refinery'
  | 'fabricator'
  | 'synthesiser'
  | 'cryoPod'
  | 'relayDish'
  | 'archiveShelf'
  | 'furnaceCore'
  | 'mirrorPane'
  | 'rimeCrystal'
  | 'inkPool'
  | 'emberSeam'
  | 'mirrorShard'
  | 'valveWheel'
  | 'tramStop'
  | 'anomaly'
  | 'stationApron'
  | 'refineryHopper'
  | 'refineryPress'
  | 'fabricatorFeeder'
  | 'fabricatorBench'
  | 'synthReagents'
  | 'synthColdStore'
  | 'liftPylon'
  | 'liftDeck'
  | 'liftDeckLeft'
  | 'liftDeckRight'
  | 'wallLiftFrameLeft'
  | 'wallLiftFrameRight'
  | 'riftShardsLeft'
  | 'riftShardsRight'
  | 'riftApron'
  | 'knockFrameLeft'
  | 'knockFrameRight'
  | 'bulkheadLeafLeft'
  | 'bulkheadLeafRight'
  | 'tramNoseLeft'
  | 'tramNoseRight'
  | 'tramDoor'
  | 'tramWindow'
  | 'bridgeSpan'
  | 'bridgeEndLeft'
  | 'bridgeEndRight'
  | 'catwalkSpan'
  | 'catwalkEnd'
  | 'litterPapers'
  | 'litterDebris'
  | 'litterPuddle'
  | 'litterRubble'
  | 'litterGravel'
  | 'cableRun'
  | 'cableRunEnd'
  | 'officeDesk'
  | 'wallShelf'
  | 'filingCabinet'
  | 'storageRack'
  | 'noticeBoard'
  | 'waterCooler'
  | 'barrel'
  | 'palletStack'
  | 'gasCylinders'
  | 'toolCart'
  | 'workbench'
  | 'canteenTable'
  | 'stool'
  | 'bunkBed'
  | 'vendingMachine'
  | 'trashBin'
  | 'cargoContainer'
  | 'generator'
  | 'trafficCone'
  | 'sandbags'
  | 'pottedFern'
  | 'specimenTank'
  | 'gurney'
  | 'sackPile'
  | 'mopBucket'
  | 'officeChair'
  | 'monitorBank'
  | 'cableSpool'
  | 'floorLamp'
  | 'crateStack'
  | 'bookTrolley'
  | 'mineCart'
  | 'pew'
  | 'candleStand'
  | 'wheelchair'
  | 'screenPartition'
  | 'mailSacks'
  | 'sortingCase'
  | 'worksBarrier'
  | 'surveyStake'
  | 'shutteredKiosk'
  | 'reservedPlot'
  | 'benchToppled'
  | 'planterToppled'
  | 'barricade'
  | 'debrisPile'
  | 'kioskBurnt'
  | 'collapsedSlab';

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
  readonly door?: DoorDefinition;
  readonly modelScale?: number;
  readonly light?: ObjectLight;
  readonly countsAs?: WorldObjectId;
  readonly interactions: readonly ObjectInteraction[];
}
