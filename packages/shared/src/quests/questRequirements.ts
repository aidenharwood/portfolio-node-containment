import { combatLevel, levelForExperience, SKILL_INFO, type SkillExperience } from '../character/skills.ts';
import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { DialogueId, NpcId, QuestId } from '../ids.ts';
import type { Condition } from '../rules/conditions.ts';
import type { QuestDefinition } from './questDefinition.ts';
import { questPointsEarned, type QuestLog } from './questProgress.ts';

export interface QuestRequirement {
  readonly label: string;
  readonly met: boolean;
  readonly recommended?: boolean;
}

export interface QuestRequirementContent {
  readonly quests: ReadonlyMap<QuestId, QuestDefinition>;
  readonly npcs: ReadonlyMap<NpcId, { readonly dialogueId?: DialogueId }>;
  readonly dialogues: ReadonlyMap<DialogueId, DialogueDefinition>;
}

const startsQuest = (dialogue: DialogueDefinition, nodeId: string, questId: QuestId): boolean => {
  const node = dialogue.nodes[nodeId];
  const effects = [...(node?.effects ?? []), ...(node?.options ?? []).flatMap((option) => option.effects ?? [])];
  return effects.some((effect) => effect.type === 'startQuest' && effect.questId === questId);
};

export function questOfferConditions(quest: QuestDefinition, content: QuestRequirementContent): Condition[] {
  const dialogueId = quest.offeredBy ? content.npcs.get(quest.offeredBy)?.dialogueId : undefined;
  const dialogue = dialogueId ? content.dialogues.get(dialogueId) : undefined;
  const entry = dialogue?.entries.find((candidate) => startsQuest(dialogue, candidate.node, quest.id));
  const conditions: Condition[] = [
    ...(quest.offerRequires ?? []).map((questId): Condition => ({ type: 'questCompleted', questId })),
    ...(entry?.conditions ?? []),
  ];
  const seen = new Set<string>();
  return conditions.filter((condition) => {
    if (condition.type === 'questNotStarted' && condition.questId === quest.id) return false;
    const key = JSON.stringify(condition);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function questRequirements(
  quest: QuestDefinition,
  log: QuestLog,
  skills: SkillExperience,
  content: QuestRequirementContent,
): QuestRequirement[] {
  const conditions = questOfferConditions(quest, content);
  const requirements = conditions.flatMap((condition): QuestRequirement[] => {
    switch (condition.type) {
      case 'questCompleted':
        return [{ label: `Complete ${content.quests.get(condition.questId)?.name ?? condition.questId}`, met: log[condition.questId]?.status === 'completed' }];
      case 'skillLevel':
        return [{ label: `${SKILL_INFO[condition.skill].name} level ${condition.atLeast}`, met: levelForExperience(skills[condition.skill]) >= condition.atLeast }];
      case 'combatLevel':
        return [{ label: `Combat level ${condition.atLeast}`, met: combatLevel(skills) >= condition.atLeast }];
      case 'questPoints':
        return [{ label: `${condition.atLeast} quest points`, met: questPointsEarned(log, content.quests) >= condition.atLeast }];
      default:
        return [];
    }
  });
  const hasCombat = conditions.some((condition) => condition.type === 'combatLevel');
  if (quest.recommendedLevel !== undefined && !hasCombat) {
    requirements.push({ label: `Combat level ${quest.recommendedLevel} (recommended)`, met: combatLevel(skills) >= quest.recommendedLevel, recommended: true });
  }
  return requirements;
}
