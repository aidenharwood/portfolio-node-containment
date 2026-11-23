import type { DistrictId, ItemId } from '../ids.ts';
import { creatureIdsForObjective, npcIdsForObjective, objectIdsForObjective, type ActiveObjective } from '../quests/questGuidance.ts';
import type { DistrictDefinition } from '../world/district.ts';
import { districtObjects } from '../world/levelLayout.ts';
import type { GameContent } from './gameContent.ts';

function districtsWhere(content: GameContent, matches: (district: DistrictDefinition) => boolean): DistrictId[] {
  return [...content.districts.values()].filter(matches).map((district) => district.id);
}

function itemSourceDistricts(content: GameContent, itemId: ItemId): DistrictId[] {
  const fetch = { type: 'obtainItem', itemId, count: 1, label: '' } as const;
  const npcIds = npcIdsForObjective(fetch, content.npcs, content.dialogues, content.shops);
  const objectIds = objectIdsForObjective(fetch, content.worldObjects, content.recipes);
  const crafted = [...content.recipes.values()].some((recipe) => recipe.output.itemId === itemId);
  const stationIds = crafted ? objectIdsForObjective({ type: 'craft', itemId, count: 1, label: '' }, content.worldObjects, content.recipes) : new Set<string>();
  return districtsWhere(
    content,
    (district) =>
      district.npcs.some((npc) => npcIds.has(npc.npcId)) ||
      districtObjects(district, content.assemblies).some((object) => objectIds.has(object.objectId) || stationIds.has(object.objectId)),
  );
}

function districtsForObjective(content: GameContent, { objective, done }: ActiveObjective): DistrictId[] {
  if (done) return [];
  switch (objective.type) {
    case 'enterArea':
      return [objective.districtId];
    case 'talkTo':
    case 'signal': {
      const npcIds = npcIdsForObjective(objective, content.npcs, content.dialogues, content.shops);
      return districtsWhere(content, (district) => district.npcs.some((npc) => npcIds.has(npc.npcId)));
    }
    case 'obtainItem':
      return itemSourceDistricts(content, objective.itemId);
    case 'useItem':
    case 'equipItem':
      return itemSourceDistricts(content, objective.itemId);
    case 'craft': {
      const objectIds = objectIdsForObjective(objective, content.worldObjects, content.recipes);
      return districtsWhere(content, (district) => districtObjects(district, content.assemblies).some((object) => objectIds.has(object.objectId)));
    }
    case 'interactWith':
      return districtsWhere(content, (district) =>
        districtObjects(district, content.assemblies).some((object) => (content.worldObjects.get(object.objectId)?.countsAs ?? object.objectId) === objective.objectId),
      );
    case 'defeat':
    case 'contain':
      return districtsWhere(content, (district) => (district.creatures ?? []).some((creature) => creature.creatureId === objective.creatureId));
    case 'reach': {
      const objectIds = objectIdsForObjective(objective, content.worldObjects, content.recipes);
      const creatureIds = new Set(creatureIdsForObjective(objective));
      return districtsWhere(
        content,
        (district) =>
          (district.creatures ?? []).some((creature) => creatureIds.has(creature.creatureId)) ||
          districtObjects(district, content.assemblies).some((object) => objectIds.has(object.objectId)),
      );
    }
    case 'gather':
      return districtsWhere(content, (district) =>
        district.objects.some((object) =>
          (content.worldObjects.get(object.objectId)?.interactions ?? []).some((interaction) => interaction.gather?.itemId === objective.itemId),
        ),
      );
    default:
      return [];
  }
}

export function objectiveDistricts(objectives: readonly ActiveObjective[], content: GameContent): Set<DistrictId> {
  return new Set(objectives.flatMap((objective) => districtsForObjective(content, objective)));
}
