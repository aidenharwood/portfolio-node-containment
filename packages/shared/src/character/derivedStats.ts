import type { StatId } from '../gear/stats.ts';
import { levelForExperience, type SkillExperience } from './skills.ts';

export const PROFILE_STAT_IDS = [
  'integrity',
  'meleeRating',
  'rangedRating',
  'psionicRating',
  'meleeDefence',
  'rangedDefence',
  'psionicDefence',
  'hazardResistance',
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
  meleeRating: { name: 'Melee Rating', derivation: 'Close Quarters level + Power.', gearStat: 'power' },
  rangedRating: { name: 'Ranged Rating', derivation: 'Marksmanship level + Accuracy.', gearStat: 'accuracy' },
  psionicRating: { name: 'Psionic Rating', derivation: 'Psionics level + Focus.', gearStat: 'focus' },
  meleeDefence: { name: 'Melee Defence', derivation: 'Half Fortitude level + Armor.', gearStat: 'armor' },
  rangedDefence: { name: 'Ranged Defence', derivation: 'Half Fortitude level + Deflection.', gearStat: 'deflection' },
  psionicDefence: { name: 'Psionic Defence', derivation: 'Half Fortitude level + Cognitive Ward.', gearStat: 'cognitiveWard' },
  hazardResistance: { name: 'Hazard Resistance', derivation: 'Half Fortitude level + Hazard Shielding.', gearStat: 'hazardShielding' },
  analysis: { name: 'Analysis', derivation: 'Research level + Insight. Study anomalies whose level is at or below it.', gearStat: 'insight' },
};

export const maxIntegrityFor = (skills: SkillExperience): number => 20 + levelForExperience(skills.fortitude) * 4;

export function deriveCombatProfile(skills: SkillExperience, gear: Readonly<Record<StatId, number>>): CombatProfile {
  const level = (experience: number) => levelForExperience(experience);
  const guard = Math.floor(level(skills.fortitude) / 2);
  return {
    integrity: maxIntegrityFor(skills),
    meleeRating: level(skills.closeQuarters) + gear.power,
    rangedRating: level(skills.marksmanship) + gear.accuracy,
    psionicRating: level(skills.psionics) + gear.focus,
    meleeDefence: guard + gear.armor,
    rangedDefence: guard + gear.deflection,
    psionicDefence: guard + gear.cognitiveWard,
    hazardResistance: guard + gear.hazardShielding,
    analysis: level(skills.research) + gear.insight,
  };
}
