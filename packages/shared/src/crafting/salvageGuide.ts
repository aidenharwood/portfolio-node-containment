import type { GameContent } from '../content/gameContent.ts';
import type { ItemId, WorldObjectId } from '../ids.ts';
import type { WorldObjectDefinition } from '../world/entities.ts';
import type { GatheringSource } from './gathering.ts';
import type { SourceLocation } from './itemSources.ts';
import { skillGuide } from './skillGuide.ts';

export type SalvageGuideLocation = SourceLocation;

export interface SalvageGuideEntry {
  readonly objectId: WorldObjectId;
  readonly name: string;
  readonly verb: string;
  readonly level: number;
  readonly itemId: ItemId;
  readonly experience: number;
  readonly locations: readonly SalvageGuideLocation[];
}

export const salvageSourceOf = (definition: WorldObjectDefinition): GatheringSource | undefined =>
  definition.interactions.find((interaction) => interaction.gather?.skill === 'salvage')?.gather;

export function salvageGuide(content: GameContent): SalvageGuideEntry[] {
  const seen = new Set<WorldObjectId>();
  return skillGuide(content, 'salvage').flatMap((entry): SalvageGuideEntry[] => {
    if (entry.kind !== 'gather' || seen.has(entry.objectId)) return [];
    seen.add(entry.objectId);
    return [{ objectId: entry.objectId, name: entry.name, verb: entry.verb, level: entry.level, itemId: entry.itemId, experience: entry.experience, locations: entry.locations }];
  });
}
