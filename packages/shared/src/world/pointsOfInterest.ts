import type { DialogueId, NpcId, WorldObjectId } from '../ids.ts';
import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { GameEffect } from '../rules/effects.ts';
import type { NpcDefinition, WorldObjectDefinition } from './entities.ts';
import type { TilePoint } from './geometry.ts';
import type { ResolvedLevel } from './levelLayout.ts';

export const POINT_OF_INTEREST_KINDS = ['tram', 'passage', 'contracts', 'shop', 'market', 'storage', 'crafting', 'medical', 'quest', 'gathering'] as const;

export type PointOfInterestKind = (typeof POINT_OF_INTEREST_KINDS)[number];

export const POINT_OF_INTEREST_LABELS: Readonly<Record<PointOfInterestKind, string>> = {
  tram: 'Tram stop',
  passage: 'Lift or passage',
  shop: 'Shop',
  market: 'Market',
  storage: 'Storage',
  crafting: 'Crafting station',
  contracts: 'Contracts',
  medical: 'Medical',
  quest: 'Quest giver',
  gathering: 'Resource',
};

export interface PointOfInterest {
  readonly kind: PointOfInterestKind;
  readonly name: string;
  readonly position: TilePoint;
}

export interface PointOfInterestSources {
  readonly npcs: ReadonlyMap<NpcId, NpcDefinition>;
  readonly worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>;
  readonly dialogues: ReadonlyMap<DialogueId, DialogueDefinition>;
}

const MERGE_DISTANCE = 10;

const EFFECT_KINDS: Partial<Record<GameEffect['type'], PointOfInterestKind>> = {
  openTramMap: 'tram',
  discoverStation: 'tram',
  openShop: 'shop',
  openMarket: 'market',
  openStorage: 'storage',
  openCrafting: 'crafting',
  openContracts: 'contracts',
  restoreIntegrity: 'medical',
  teleport: 'passage',
  startQuest: 'quest',
};

const rank = (kind: PointOfInterestKind): number => POINT_OF_INTEREST_KINDS.indexOf(kind);

function strongest(kinds: readonly (PointOfInterestKind | undefined)[]): PointOfInterestKind | undefined {
  return kinds.filter((kind): kind is PointOfInterestKind => kind !== undefined).sort((a, b) => rank(a) - rank(b))[0];
}

const effectKinds = (effects: readonly GameEffect[] | undefined): (PointOfInterestKind | undefined)[] =>
  (effects ?? []).map((effect) => EFFECT_KINDS[effect.type]);

export function objectPointOfInterestKind(object: WorldObjectDefinition): PointOfInterestKind | undefined {
  return strongest(object.interactions.flatMap((interaction) => [...effectKinds(interaction.effects), interaction.gather ? 'gathering' : undefined]));
}

export function npcPointOfInterestKind(npc: NpcDefinition, dialogues: ReadonlyMap<DialogueId, DialogueDefinition>): PointOfInterestKind | undefined {
  if (npc.shopId) return 'shop';
  const dialogue = npc.dialogueId ? dialogues.get(npc.dialogueId) : undefined;
  if (!dialogue) return undefined;
  return strongest(Object.values(dialogue.nodes).flatMap((node) => [...effectKinds(node.effects), ...(node.options ?? []).flatMap((option) => effectKinds(option.effects))]));
}

export function pointsOfInterest(level: ResolvedLevel, sources: PointOfInterestSources): PointOfInterest[] {
  const found: PointOfInterest[] = [];
  const add = (kind: PointOfInterestKind | undefined, name: string, position: TilePoint) => {
    if (!kind) return;
    const near = found.some((point) => point.kind === kind && point.name === name && Math.abs(point.position.x - position.x) <= MERGE_DISTANCE && Math.abs(point.position.y - position.y) <= MERGE_DISTANCE);
    if (!near) found.push({ kind, name, position });
  };
  for (const placement of level.npcs) {
    const npc = sources.npcs.get(placement.npcId);
    if (npc) add(npcPointOfInterestKind(npc, sources.dialogues), npc.name, placement.position);
  }
  for (const placement of level.objects) {
    const object = sources.worldObjects.get(placement.objectId);
    if (object) add(objectPointOfInterestKind(object), object.name, placement.position);
  }
  return found;
}
