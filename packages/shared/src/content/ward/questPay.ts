import { experienceForLevel, SKILL_INFO, type SkillId } from '../../character/skills.ts';
import type { GameEffect } from '../../rules/effects.ts';

export const QUEST_PAY_FLAT_UNTIL = 10;
export const QUEST_PAY_GROWTH = 15;

export const levelStepAt = (level: number): number => experienceForLevel(level + 1) - experienceForLevel(level);

export const questLevelShare = (level: number): number => 1 + Math.max(0, level - QUEST_PAY_FLAT_UNTIL) / QUEST_PAY_GROWTH;

export interface QuestPay {
  readonly effect: GameEffect;
  readonly line: string;
}

export function questPay(skill: SkillId, level: number, weight: number): QuestPay {
  const amount = Math.round((levelStepAt(level) * questLevelShare(level) * weight) / 100) * 100;
  return { effect: { type: 'grantExperience', skill, amount }, line: `${amount} ${SKILL_INFO[skill].name} XP` };
}

export function styleQuestPay(level: number, weight: number): QuestPay {
  const amount = Math.round((levelStepAt(level) * questLevelShare(level) * weight) / 100) * 100;
  return styleExperiencePay(amount);
}

export const styleExperiencePay = (amount: number): QuestPay => ({ effect: { type: 'grantStyleExperience', amount }, line: `${amount} combat XP (your weapon's skill)` });
