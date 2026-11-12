import type { GameContent } from '../content/gameContent.ts';
import type { DistrictId, ItemId, LevelId, WorldObjectId } from '../ids.ts';
import type { WorldObjectDefinition } from '../world/entities.ts';
import type { GatheringSource } from './gathering.ts';

export interface SalvageGuideLocation {
  readonly levelId: LevelId;
  readonly levelName: string;
  readonly districtId: DistrictId | null;
  readonly districtName: string;
  readonly count: number;
}

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

function locationsOf(objectId: WorldObjectId, content: GameContent): SalvageGuideLocation[] {
  const locations: SalvageGuideLocation[] = [];
  for (const level of content.levels.values()) {
    const counts = new Map<DistrictId | null, number>();
    for (const placement of level.objects) {
      if (placement.objectId !== objectId) continue;
      const districtId = level.layout.districtAt(placement.position) ?? null;
      counts.set(districtId, (counts.get(districtId) ?? 0) + 1);
    }
    const here = [...counts].map(([districtId, count]) => ({
      levelId: level.id,
      levelName: level.name,
      districtId,
      districtName: districtId ? (content.districts.get(districtId)?.name ?? '') : '',
      count,
    }));
    locations.push(...here.sort((a, b) => a.districtName.localeCompare(b.districtName)));
  }
  return locations;
}

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
