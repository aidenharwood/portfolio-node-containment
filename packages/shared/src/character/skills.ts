export const SKILL_IDS = [
  'containment',
  'research',
  'engineering',
  'marksmanship',
  'closeQuarters',
  'psionics',
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
  readonly trainedBy: string;
}

export const SKILL_INFO: Readonly<Record<SkillId, SkillInfo>> = {
  containment: {
    name: 'Containment',
    shortName: 'Contain',
    summary: 'Securing, restraining and re-housing anomalous entities and objects.',
    trainedBy: 'Wearing creatures down and containing them before they recover.',
  },
  research: {
    name: 'Research',
    shortName: 'Research',
    summary: 'Studying anomalies, decoding artefacts and filing the paperwork nobody reads.',
    trainedBy: 'Studying creatures (first studies pay most) and sampling anomalous traces.',
  },
  engineering: {
    name: 'Engineering',
    shortName: 'Engineer',
    summary: 'Building, repairing and overclocking the hardware that keeps the walls standing.',
    trainedBy: 'Assembling gear at a fabricator.',
  },
  marksmanship: {
    name: 'Marksmanship',
    shortName: 'Marksman',
    summary: 'Accuracy with ranged armaments, from sidearms to suppression rigs.',
    trainedBy: 'Damaging, defeating and containing creatures with ranged weapons.',
  },
  closeQuarters: {
    name: 'Close Quarters',
    shortName: 'Close Qtrs',
    summary: 'Batons, blades and the art of not being grabbed.',
    trainedBy: 'Damaging, defeating and containing creatures in melee or unarmed.',
  },
  psionics: {
    name: 'Psionics',
    shortName: 'Psionics',
    summary: 'Projecting will through focus conduits, and enduring what projects back.',
    trainedBy: 'Damaging, defeating and containing creatures with focus conduits.',
  },
  fortitude: {
    name: 'Fortitude',
    shortName: 'Fortitude',
    summary: 'Endurance against injury, exposure and long shifts in cold corridors.',
    trainedBy: 'Damaging, defeating and containing creatures in any combat style.',
  },
  salvage: {
    name: 'Salvage',
    shortName: 'Salvage',
    summary: 'Recovering useful material from wreckage, breach sites and forgotten storerooms.',
    trainedBy: 'Salvaging scrap heaps, wrecks and residue, and dredging the basin.',
  },
  refining: {
    name: 'Refining',
    shortName: 'Refining',
    summary: 'Processing raw salvage into bars and raw fibre into cloth at a refinery.',
    trainedBy: 'Refining salvage into bars and fibre into cloth at a refinery.',
  },
  biochemistry: {
    name: 'Biochemistry',
    shortName: 'Biochem',
    summary: 'Growing, trapping and culturing what lives in the Ward, then cooking it into meals or synthesising it into medicine.',
    trainedBy: 'Harvesting, trapping and cutting organics, then cooking and synthesising them.',
  },
};

export const SKILL_LEVEL_CAP = 200;

export function experienceForLevel(level: number): number {
  const n = Math.max(0, Math.min(SKILL_LEVEL_CAP, level) - 1);
  return Math.floor(12 * n * n + 18 * n);
}

export function levelForExperience(experience: number): number {
  let level = 1;

  while (
    level < SKILL_LEVEL_CAP &&
    experience >= experienceForLevel(level + 1)
  ) {
    level++;
  }

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

export const COMBAT_SKILLS = ['closeQuarters', 'marksmanship', 'psionics', 'fortitude'] as const satisfies readonly SkillId[];

export function combatLevel(skills: SkillExperience): number {
  const fortitude = levelForExperience(skills.fortitude);
  const [best = 1, second = 1, third = 1] = [skills.closeQuarters, skills.marksmanship, skills.psionics]
    .map((experience) => levelForExperience(experience))
    .sort((a, b) => b - a);
  return Math.max(1, Math.floor(fortitude / 2 + best / 2 + (second + third) / 8));
}
