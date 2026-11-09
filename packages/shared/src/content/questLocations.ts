import type { DistrictId } from '../ids.ts';
import { npcIdsForObjective, objectIdsForObjective, type ActiveObjective } from '../quests/questGuidance.ts';
import type { DistrictDefinition } from '../world/district.ts';
import { districtObjects } from '../world/levelLayout.ts';
import type { GameContent } from './gameContent.ts';

function districtsWhere(content: GameContent, matches: (district: DistrictDefinition) => boolean): DistrictId[] {
  return [...content.districts.values()].filter(matches).map((district) => district.id);
}

function districtsForObjective(content: GameContent, { objective, done }: ActiveObjective): DistrictId[] {
  if (done) return [];
  switch (objective.type) {
    case 'enterArea':
      return [objective.districtId];
    case 'talkTo':
    case 'signal': {
      const npcIds = npcIdsForObjective(objective, content.npcs, content.dialogues);
      return districtsWhere(content, (district) => district.npcs.some((npc) => npcIds.has(npc.npcId)));
    }
    case 'obtainItem': {
      const npcIds = npcIdsForObjective(objective, content.npcs, content.dialogues);
      const objectIds = objectIdsForObjective(objective, content.worldObjects, content.recipes);
      return districtsWhere(
        content,
        (district) =>
          district.npcs.some((npc) => npcIds.has(npc.npcId)) || districtObjects(district, content.assemblies).some((object) => objectIds.has(object.objectId)),
      );
    }
    case 'interactWith':
      return districtsWhere(content, (district) =>
        districtObjects(district, content.assemblies).some((object) => (content.worldObjects.get(object.objectId)?.countsAs ?? object.objectId) === objective.objectId),
      );
    case 'defeat':
      return districtsWhere(content, (district) => (district.creatures ?? []).some((creature) => creature.creatureId === objective.creatureId));
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
