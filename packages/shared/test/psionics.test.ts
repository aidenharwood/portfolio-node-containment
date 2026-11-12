import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ARMOUR_TIERS } from '../src/content/armourLines.ts';
import {
  COMBAT_STYLE_INFO,
  COMBAT_STYLES,
  combatExperience,
  combatLevel,
  createStartingSkills,
  defeatExperience,
  experienceForLevel,
  GAME_CONTENT,
  gearLineOf,
  playerAttackProfile,
  styleBeating,
  type CombatStyle,
  type ItemDefinition,
  type StatBlock,
} from '../src/index.ts';

const items = GAME_CONTENT.items;

describe('the combat triangle', () => {
  test('melee beats ranged, ranged beats psionic and psionic beats melee', () => {
    assert.equal(COMBAT_STYLE_INFO.melee.beats, 'ranged');
    assert.equal(COMBAT_STYLE_INFO.ranged.beats, 'psionic');
    assert.equal(COMBAT_STYLE_INFO.psionic.beats, 'melee');
    for (const style of COMBAT_STYLES) assert.equal(COMBAT_STYLE_INFO[styleBeating(style)].beats, style);
  });

  test('psionic hits train Psionics and Fortitude', () => {
    assert.deepEqual(combatExperience('psionic', 3).map((award) => award.skill), ['psionics', 'fortitude']);
    assert.equal(defeatExperience('psionic', 30)[0]?.skill, 'psionics');
  });

  test('combat level counts the best style in full and the other two lightly', () => {
    const level = (closeQuarters: number, marksmanship: number, psionics: number) =>
      combatLevel(createStartingSkills({
        fortitude: experienceForLevel(20),
        closeQuarters: experienceForLevel(closeQuarters),
        marksmanship: experienceForLevel(marksmanship),
        psionics: experienceForLevel(psionics),
      }));
    assert.equal(level(40, 1, 1), Math.floor(10 + 20 + 2 / 8));
    assert.equal(level(1, 1, 40), level(40, 1, 1));
    assert.equal(level(40, 40, 40), Math.floor(10 + 20 + 80 / 8));
  });

  test('a focus attacks with the psionic rating from range', () => {
    const skills = createStartingSkills({ psionics: experienceForLevel(12) });
    const attack = playerAttackProfile(skills, { primary: 'coldvigil-focus' }, items);
    assert.equal(attack.style, 'psionic');
    assert.equal(attack.weapon, 'focus');
    assert.ok(attack.range > 1);
    assert.equal(attack.accuracy, 12 + (items.get('coldvigil-focus')?.equipment?.stats.focus ?? 0));
  });
});

describe('armour lines on the triangle', () => {
  const defenceOf = (pieces: readonly ItemDefinition[], style: CombatStyle): number =>
    pieces.reduce((sum, item) => sum + (item.equipment?.stats[COMBAT_STYLE_INFO[style].defenceStat as keyof StatBlock] ?? 0), 0);

  test('in every tier each light line leads against its own style and trails against the style that beats it', () => {
    for (const tier of ARMOUR_TIERS) {
      const pieces = (line: string) =>
        [...items.values()].filter((item) => item.equipment?.slot !== 'primary' && item.equipment?.slot !== 'implant' && item.equipment?.visual.motif === line && item.equipment.requirements?.skills && Object.values(item.equipment.requirements.skills).includes(tier.level));
      const lines = { skirmisher: pieces('skirmisher'), warden: pieces('warden') };
      for (const [line, own] of [['skirmisher', 'ranged'], ['warden', 'psionic']] as const) {
        const set = lines[line];
        assert.ok(set.length >= 6, `${tier.level} ${line} has ${set.length} pieces`);
        const weakTo = styleBeating(own);
        const otherLine = line === 'skirmisher' ? lines.warden : lines.skirmisher;
        assert.ok(defenceOf(set, own) > defenceOf(otherLine, own), `${tier.level} ${line} leads against ${own}`);
        assert.ok(defenceOf(set, weakTo) < defenceOf(otherLine, weakTo), `${tier.level} ${line} trails against ${weakTo}`);
      }
    }
  });

  test('the Warden line and psionic kit belong to Psionics', () => {
    const warden = [...items.values()].filter((item) => item.equipment?.visual.motif === 'warden' && !item.equipment.weapon);
    assert.ok(warden.length > 0);
    for (const item of warden) assert.ok(item.equipment?.requirements?.skills?.psionics, item.id);
    assert.equal(gearLineOf(items.get('coldvigil-amplifier')!), 'warden');
  });
});

describe('psionic weapons', () => {
  test('every armour tier has a focus, a resonator and their variants, all in the Warden line', () => {
    for (const tier of ARMOUR_TIERS) {
      const slug = tier.warden.name.toLowerCase();
      for (const suffix of ['focus', 'resonator', 'sceptre', 'chime']) {
        const item = items.get(`${slug}-${suffix}`);
        assert.ok(item?.equipment?.weapon, `${slug}-${suffix}`);
        assert.equal(item.equipment.visual.motif, 'warden', item.id);
        assert.equal(item.equipment.requirements?.skills?.psionics, tier.level, item.id);
        assert.ok(GAME_CONTENT.recipes.get(`fabricator:${item.id}`), `recipe for ${item.id}`);
      }
    }
  });

  test('psionic weapons rise with their tier', () => {
    const focus = ARMOUR_TIERS.map((tier) => items.get(`${tier.warden.name.toLowerCase()}-focus`)?.equipment?.stats.focus ?? 0);
    for (let index = 1; index < focus.length; index++) assert.ok(focus[index]! > focus[index - 1]!, `tier ${index}`);
  });
});

describe('psionic anomalies', () => {
  test('psionic attackers are warded, so ranged fire is the answer to them', () => {
    const psionic = [...GAME_CONTENT.creatures.values()].filter((creature) => creature.attack.style === 'psionic');
    assert.ok(psionic.length >= 9);
    for (const creature of psionic) assert.equal(creature.guard, 'warden', creature.id);
  });
});
