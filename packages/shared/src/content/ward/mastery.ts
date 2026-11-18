import { SKILL_IDS, SKILL_INFO, SKILL_LEVEL_CAP, type SkillId } from '../../character/skills.ts';
import type { GearMotif, GearVisual, ItemDefinition } from '../../gear/items.ts';
import type { StatBlock } from '../../gear/stats.ts';
import { gear } from '../gearItem.ts';

interface MasterySpec {
  readonly stats: StatBlock;
  readonly motif?: GearMotif;
  readonly colors: readonly [primary: string, secondary: string, emissive: string];
  readonly examine: string;
}

const MASTERY: Readonly<Record<SkillId, MasterySpec>> = {
  closeQuarters: { stats: { power: 4, armor: 8 }, motif: 'bulwark', colors: ['#8a5a4a', '#2a1a16', '#ff7a4a'], examine: 'A heavy mantle of plate scales, each dented by something that did not get up again.' },
  marksmanship: { stats: { accuracy: 4, deflection: 8 }, motif: 'skirmisher', colors: ['#4a6a5a', '#16241c', '#b6ff4f'], examine: 'A long grey mantle with a bullet-hole pattern stitched into the hem, every one of them a bullseye.' },
  psionics: { stats: { focus: 4, cognitiveWard: 8 }, motif: 'warden', colors: ['#6a4a9a', '#1c1430', '#c79bff'], examine: 'A mantle that hangs a half-step behind you, as if it were listening to a quieter room.' },
  fortitude: { stats: { armor: 6, deflection: 6, cognitiveWard: 6 }, colors: ['#7a6a5a', '#2a2420', '#ffd08a'], examine: 'A mantle that has been through every shift and every cold corridor, and has not once complained.' },
  containment: { stats: { cognitiveWard: 8, insight: 4 }, colors: ['#c8c0a8', '#3a3a34', '#ff5a3a'], examine: 'A white Directorate mantle with a red seal at the clasp. The seal has never been broken.' },
  research: { stats: { insight: 6, cognitiveWard: 4 }, colors: ['#8a9ab8', '#202838', '#4fe3ff'], examine: 'A mantle lined with pockets of annotated margins. Some of the notes are in your handwriting.' },
  engineering: { stats: { armor: 6, deflection: 6 }, colors: ['#b8864a', '#2e2216', '#ffcf4a'], examine: 'A canvas mantle hung with spanners, fuse wire and a spare battery. It weighs exactly what it should.' },
  salvage: { stats: { hazardShielding: 6, armor: 6 }, colors: ['#6a6a4a', '#24241a', '#b6ff4f'], examine: 'A mantle of reclaimed hazard tarp, patched from a dozen breach sites. It smells faintly of all of them.' },
  refining: { stats: { hazardShielding: 6, deflection: 6 }, colors: ['#9a7a5a', '#2e2218', '#ff9a4a'], examine: 'A smelter-grey mantle, scorched at the edges and still warm on a cold morning.' },
  biochemistry: { stats: { hazardShielding: 6, cognitiveWard: 6 }, colors: ['#5a9a7a', '#16281e', '#8affc0'], examine: 'A sterile mantle in a faint green tint. Something in the lining fizzes when you are not looking.' },
};

export const masteryMantleId = (skill: SkillId): string => `${skill.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-mastery-mantle`;

export const MASTERY_MANTLES: readonly ItemDefinition[] = SKILL_IDS.map((skill): ItemDefinition => {
  const spec = MASTERY[skill];
  const visual: GearVisual = { primary: spec.colors[0], secondary: spec.colors[1], emissive: spec.colors[2], ...(spec.motif ? { motif: spec.motif } : {}) };
  return {
    ...gear({
      id: masteryMantleId(skill),
      name: `${SKILL_INFO[skill].name} Mastery Mantle`,
      examine: spec.examine,
      rarity: 'classified',
      icon: 'cape',
      slot: 'back',
      stats: spec.stats,
      requires: { [skill]: SKILL_LEVEL_CAP },
      visual,
      value: 0,
      unique: true,
    }),
    mastery: skill,
  };
});

export const masteryFlag = (skill: SkillId): string => `mastery:${skill}`;
