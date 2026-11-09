import type { StatId } from '../gear/stats.ts';
import { levelForExperience, type SkillExperience } from './skills.ts';

export const PROFILE_STAT_IDS = [
  'integrity',
  'meleeRating',
  'rangedRating',
  'defence',
  'hazardResistance',
  'cognitiveResistance',
  'analysis',
] as const;

export type ProfileStatId = (typeof PROFILE_STAT_IDS)[number];

export type CombatProfile = Readonly<Record<ProfileStatId, number>>;

export interface ProfileStatInfo {
  readonly name: string;
  readonly derivation: string;
  readonly gearStat?: StatId;
}

export const PROFILE_STAT_INFO: Readonly<Record<ProfileStatId, ProfileStatInfo>> = {
  integrity: { name: 'Integrity', derivation: 'Maximum health. 20 + 4 per Fortitude level.' },
  meleeRating: { name: 'Melee Rating', derivation: 'Close Quarters level + weapon Power.', gearStat: 'power' },
  rangedRating: { name: 'Ranged Rating', derivation: 'Marksmanship level + weapon Accuracy.', gearStat: 'accuracy' },
  defence: { name: 'Defence', derivation: 'Half Fortitude level + Armor.', gearStat: 'armor' },
  hazardResistance: { name: 'Hazard Resistance', derivation: 'Half Fortitude level + Hazard Shielding.', gearStat: 'hazardShielding' },
  cognitiveResistance: { name: 'Cognitive Resistance', derivation: 'Half Containment level + Cognitive Ward.', gearStat: 'cognitiveWard' },
  analysis: { name: 'Analysis', derivation: 'Research level + Insight. Study anomalies whose level is at or below it.', gearStat: 'insight' },
};

export const maxIntegrityFor = (skills: SkillExperience): number => 20 + levelForExperience(skills.fortitude) * 4;

export function deriveCombatProfile(skills: SkillExperience, gear: Readonly<Record<StatId, number>>): CombatProfile {
  const level = (experience: number) => levelForExperience(experience);
  const fortitude = level(skills.fortitude);
  return {
    integrity: maxIntegrityFor(skills),
    meleeRating: level(skills.closeQuarters) + gear.power,
    rangedRating: level(skills.marksmanship) + gear.accuracy,
    defence: Math.floor(fortitude / 2) + gear.armor,
    hazardResistance: Math.floor(fortitude / 2) + gear.hazardShielding,
    cognitiveResistance: Math.floor(level(skills.containment) / 2) + gear.cognitiveWard,
    analysis: level(skills.research) + gear.insight,
  };
}
