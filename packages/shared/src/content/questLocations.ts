import type { DistrictId } from '../ids.ts';
import type { TrackedObjective } from '../quests/questGuidance.ts';
import type { DistrictDefinition } from '../world/district.ts';
import type { GameContent } from './gameContent.ts';

function districtsWhere(content: GameContent, matches: (district: DistrictDefinition) => boolean): DistrictId[] {
  return [...content.districts.values()].filter(matches).map((district) => district.id);
}

function districtsForObjective(content: GameContent, { objective, done }: TrackedObjective): DistrictId[] {
  if (done) return [];
  switch (objective.type) {
    case 'enterArea':
      return [objective.districtId];
    case 'talkTo':
      return districtsWhere(content, (district) => district.npcs.some((npc) => npc.npcId === objective.npcId));
    case 'signal': {
      const npcId = objective.npcId;
      return npcId ? districtsWhere(content, (district) => district.npcs.some((npc) => npc.npcId === npcId)) : [];
    }
    case 'interactWith':
      return districtsWhere(content, (district) => district.objects.some((object) => object.objectId === objective.objectId));
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

export function objectiveDistricts(objectives: readonly TrackedObjective[], content: GameContent): Set<DistrictId> {
  return new Set(objectives.flatMap((objective) => districtsForObjective(content, objective)));
}
