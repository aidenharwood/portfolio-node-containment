export const SKILL_IDS = [
  'containment',
  'research',
  'engineering',
  'marksmanship',
  'closeQuarters',
  'fortitude',
  'salvage',
  'refining',
  'biochemistry',
] as const;

export type SkillId = (typeof SKILL_IDS)[number];

export type SkillExperience = Readonly<Record<SkillId, number>>;

export interface SkillInfo {
  readonly name: string;
  readonly shortName: string;
  readonly summary: string;
}

export const SKILL_INFO: Readonly<Record<SkillId, SkillInfo>> = {
  containment: {
    name: 'Containment',
    shortName: 'Contain',
    summary: 'Securing, restraining and re-housing anomalous entities and objects.',
  },
  research: {
    name: 'Research',
    shortName: 'Research',
    summary: 'Studying anomalies, decoding artefacts and filing the paperwork nobody reads.',
  },
  engineering: {
    name: 'Engineering',
    shortName: 'Engineer',
    summary: 'Building, repairing and overclocking the hardware that keeps the walls standing.',
  },
  marksmanship: {
    name: 'Marksmanship',
    shortName: 'Marksman',
    summary: 'Accuracy with ranged armaments, from sidearms to suppression rigs.',
  },
  closeQuarters: {
    name: 'Close Quarters',
    shortName: 'Close Qtrs',
    summary: 'Batons, blades and the art of not being grabbed.',
  },
  fortitude: {
    name: 'Fortitude',
    shortName: 'Fortitude',
    summary: 'Endurance against injury, exposure and long shifts in cold corridors.',
  },
  salvage: {
    name: 'Salvage',
    shortName: 'Salvage',
    summary: 'Recovering useful material from wreckage, breach sites and forgotten storerooms.',
  },
  refining: {
    name: 'Refining',
    shortName: 'Refining',
    summary: 'Processing raw salvage and organics into clean base parts at a refinery.',
  },
  biochemistry: {
    name: 'Biochemistry',
    shortName: 'Biochem',
    summary: 'Synthesising medical supplies from refined compounds.',
  },
};

export const SKILL_LEVEL_CAP = 100;

export function experienceForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(SKILL_LEVEL_CAP, Math.floor(level)));
  const steps = clamped - 1;
  return Math.floor(25 * steps + 18 * steps ** 2.4);
}

export function levelForExperience(experience: number): number {
  let level = 1;
  while (level < SKILL_LEVEL_CAP && experienceForLevel(level + 1) <= experience) level++;
  return level;
}

export function levelProgress(experience: number): number {
  const level = levelForExperience(experience);
  if (level >= SKILL_LEVEL_CAP) return 1;
  const floor = experienceForLevel(level);
  const ceiling = experienceForLevel(level + 1);
  return (experience - floor) / (ceiling - floor);
}

export const normalizeSkills = (stored: Partial<SkillExperience>): SkillExperience =>
  Object.fromEntries(SKILL_IDS.map((id) => [id, stored[id] ?? 0])) as SkillExperience;

export const createStartingSkills = (bonusExperience: Partial<SkillExperience> = {}): SkillExperience =>
  Object.fromEntries(SKILL_IDS.map((id) => [id, bonusExperience[id] ?? 0])) as SkillExperience;

export const COMBAT_SKILLS = ['closeQuarters', 'marksmanship', 'fortitude'] as const satisfies readonly SkillId[];

export function combatLevel(skills: SkillExperience): number {
  const fortitude = levelForExperience(skills.fortitude);
  const melee = levelForExperience(skills.closeQuarters);
  const ranged = levelForExperience(skills.marksmanship);
  return Math.max(1, Math.floor(fortitude / 2 + Math.max(melee, ranged) / 2 + Math.min(melee, ranged) / 4));
}
