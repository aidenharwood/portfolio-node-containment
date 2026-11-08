import type { CharacterRecord, DistrictId, GameContent, WorldLocation } from '@containment/shared';

const districtAt = (content: GameContent, location: WorldLocation): DistrictId | undefined =>
  content.levels.get(location.levelId)?.layout.toLocalPoint(location.position)?.districtId;

export function returnUnfinishedTrainee(record: CharacterRecord, content: GameContent): CharacterRecord {
  const start = content.newCharacter.startingLocation;
  const here = districtAt(content, record.location);
  if (here === districtAt(content, start)) return record;
  const stillTraining = Object.values(record.quests).some((progress) => {
    const quest = content.quests.get(progress.questId);
    const step = quest?.steps[progress.stepIndex];
    const headingHere = step?.objectives.some((objective) => objective.type === 'enterArea' && objective.districtId === here) ?? false;
    return progress.status === 'active' && quest?.category === 'tutorial' && step !== undefined && !headingHere;
  });
  return stillTraining ? { ...record, location: start } : record;
}
