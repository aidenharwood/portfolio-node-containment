import type { GameContent } from '../content/gameContent.ts';
import type { ItemId, WorldObjectId } from '../ids.ts';
import type { WorldObjectDefinition } from '../world/entities.ts';
import type { GatheringSource } from './gathering.ts';
import { placementLocations, type SourceLocation } from './itemSources.ts';

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

const salvageInteractionOf = (definition: WorldObjectDefinition) =>
  definition.interactions.find((interaction) => interaction.gather?.skill === 'salvage');

export const salvageSourceOf = (definition: WorldObjectDefinition): GatheringSource | undefined => salvageInteractionOf(definition)?.gather;

const locationsOf = (objectId: WorldObjectId, content: GameContent): SalvageGuideLocation[] =>
  placementLocations(content, (level) => level.objects.filter((placement) => placement.objectId === objectId).map((placement) => placement.position));

export function salvageGuide(content: GameContent): SalvageGuideEntry[] {
  const entries: SalvageGuideEntry[] = [];
  for (const definition of content.worldObjects.values()) {
    const interaction = salvageInteractionOf(definition);
    const source = interaction?.gather;
    if (!interaction || !source) continue;
    entries.push({
      objectId: definition.id,
      name: definition.name,
      verb: interaction.verb,
      level: source.level,
      itemId: source.itemId,
      experience: source.experience,
      locations: locationsOf(definition.id, content),
    });
  }
  return entries.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
