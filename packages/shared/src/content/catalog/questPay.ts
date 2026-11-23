import { experienceStepAt, SKILL_INFO, type SkillId } from '../../character/skills.ts';
import type { GameEffect } from '../../rules/effects.ts';

export const QUEST_PAY_ROUNDING = 10;

export const QUEST_PAY_SHARE = 0.18;

export const levelStepAt = experienceStepAt;

export const questPayAmount = (level: number, weight: number): number => Math.max(QUEST_PAY_ROUNDING, Math.round((levelStepAt(level) * QUEST_PAY_SHARE * weight) / QUEST_PAY_ROUNDING) * QUEST_PAY_ROUNDING);

export interface QuestPay {
  readonly effect: GameEffect;
  readonly line: string;
}

export function questPay(skill: SkillId, level: number, weight: number): QuestPay {
  const amount = questPayAmount(level, weight);
  return { effect: { type: 'grantExperience', skill, amount }, line: `${amount} ${SKILL_INFO[skill].name} XP` };
}

export function styleQuestPay(level: number, weight: number): QuestPay {
  return styleExperiencePay(questPayAmount(level, weight));
}

export const styleExperiencePay = (amount: number): QuestPay => ({ effect: { type: 'grantStyleExperience', amount }, line: `${amount} combat XP (your weapon's skill)` });
