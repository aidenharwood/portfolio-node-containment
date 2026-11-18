import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  containmentLevelFor,
  GAME_CONTENT,
  nextSkillUnlocks,
  SKILL_IDS,
  SKILL_LEVEL_CAP,
  skillGuide,
  skillGuideLabel,
  skillGuides,
  skillMilestones,
  deriveCombatProfile,
  maxIntegrityFor,
  createStartingSkills,
  experienceForLevel,
  skillUnlocksBetween,
  summariseUnlocks,
  type ContractDefinition,
  type SkillGuideEntry,
  type SkillId,
} from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const entry = (name: string, level: number): SkillGuideEntry => ({ kind: 'quest', name, level, questId: name });

describe('skill guide', () => {
  test('has a guide for every skill, sorted by level', () => {
    const guides = skillGuides(FIXTURE_CONTENT);
    for (const skill of SKILL_IDS) {
      const entries = guides.get(skill);
      assert.ok(entries, skill);
      entries.slice(1).forEach((current, index) => assert.ok((entries[index]?.level ?? 0) <= current.level, skill));
    }
  });

  test('lists every recipe under its crafting skill and level', () => {
    for (const recipe of FIXTURE_CONTENT.recipes.values()) {
      const found = skillGuide(FIXTURE_CONTENT, recipe.skill).find((candidate) => candidate.kind === 'recipe' && candidate.recipeId === recipe.id);
      assert.equal(found?.level, recipe.level, recipe.id);
    }
  });

  test('lists every gather source under its skill', () => {
    for (const object of FIXTURE_CONTENT.worldObjects.values()) {
      for (const interaction of object.interactions) {
        if (!interaction.gather) continue;
        const found = skillGuide(FIXTURE_CONTENT, interaction.gather.skill).find((candidate) => candidate.kind === 'gather' && candidate.objectId === object.id);
        assert.equal(found?.level, interaction.gather.level, object.id);
      }
    }
  });

  test('lists gear under each skill it requires', () => {
    const badge = skillGuide(FIXTURE_CONTENT, 'containment').find((candidate) => candidate.kind === 'equip' && candidate.itemId === 'warden-badge');
    assert.equal(badge?.level, 3);
    for (const item of FIXTURE_CONTENT.items.values()) {
      for (const [skill, level] of Object.entries(item.equipment?.requirements?.skills ?? {})) {
        const found = skillGuide(FIXTURE_CONTENT, skill as SkillId).find((candidate) => candidate.kind === 'equip' && candidate.itemId === item.id);
        assert.equal(found?.level, level, item.id);
      }
    }
  });

  test('lists containable creatures under Containment and every creature under Research', () => {
    const contain = skillGuide(FIXTURE_CONTENT, 'containment').filter((candidate) => candidate.kind === 'contain');
    const study = skillGuide(FIXTURE_CONTENT, 'research').filter((candidate) => candidate.kind === 'study');
    const creatures = [...FIXTURE_CONTENT.creatures.values()];
    assert.equal(contain.length, creatures.filter((creature) => creature.containment).length);
    assert.equal(study.length, creatures.length);
    for (const creature of creatures) {
      if (creature.containment) assert.equal(contain.find((candidate) => candidate.kind === 'contain' && candidate.creatureId === creature.id)?.level, containmentLevelFor(creature));
      assert.equal(study.find((candidate) => candidate.kind === 'study' && candidate.creatureId === creature.id)?.level, creature.level);
    }
  });

  test('shows each mastery mantle as an unlock at the cap with a claim hint', () => {
    for (const skill of SKILL_IDS) {
      const mantle = [...GAME_CONTENT.items.values()].find((item) => item.mastery === skill);
      assert.ok(mantle, skill);
      const found = skillGuide(GAME_CONTENT, skill).find((candidate) => candidate.kind === 'equip' && candidate.itemId === mantle.id);
      assert.equal(found?.level, SKILL_LEVEL_CAP, skill);
      assert.ok(found && nextSkillUnlocks(skillGuide(GAME_CONTENT, skill), SKILL_LEVEL_CAP - 1).includes(found), skill);
      assert.equal(found && skillGuideLabel(found), 'Mastery mantle (claim at the contract board)');
    }
  });

  test('lists contracts gated by a skill level', () => {
    const gated: ContractDefinition = {
      id: 'daily:test-gate',
      name: 'Test Gate',
      brief: '',
      cadence: 'daily',
      tier: 1,
      requires: [{ type: 'skillLevel', skill: 'refining', atLeast: 7 }],
      objective: { type: 'craft', itemIds: ['scrap-bar'], count: 1 },
      commendations: 0,
      rewards: [],
      rewardSummary: '',
    };
    const contracts = new Map(FIXTURE_CONTENT.contracts);
    contracts.set(gated.id, gated);
    const found = skillGuide({ ...FIXTURE_CONTENT, contracts }, 'refining').find((candidate) => candidate.kind === 'contract');
    assert.equal(found?.level, 7);
    assert.equal(found && skillGuideLabel(found), 'Contract: Test Gate');
  });

  test('finds skill-gated quests in the shipped content', () => {
    const quest = skillGuide(GAME_CONTENT, 'engineering').find((candidate) => candidate.kind === 'quest');
    assert.ok(quest);
    assert.ok(quest.level > 1);
  });

  test('every shipped skill except Fortitude has something to unlock', () => {
    for (const skill of SKILL_IDS) {
      if (skill === 'fortitude') continue;
      assert.ok(skillGuide(GAME_CONTENT, skill).length > 0, skill);
    }
  });

  test('lists skill reach objectives as story entries', () => {
    let checked = 0;
    for (const quest of GAME_CONTENT.quests.values()) {
      for (const step of quest.steps) {
        for (const objective of step.objectives) {
          if (objective.type !== 'reach' || objective.measure === 'combat' || objective.measure === 'questPoints') continue;
          const found = skillGuide(GAME_CONTENT, objective.measure).find((candidate) => candidate.kind === 'story' && candidate.questId === quest.id && candidate.level === objective.level);
          assert.ok(found, `${quest.id} ${objective.measure}`);
          assert.equal(skillGuideLabel(found), `Story: ${quest.name}`);
          checked++;
        }
      }
    }
    assert.ok(checked > 0);
  });

  test('never maps combat level reach objectives onto a single skill', () => {
    for (const skill of SKILL_IDS) {
      for (const candidate of skillGuide(GAME_CONTENT, skill)) {
        if (candidate.kind !== 'story') continue;
        const quest = GAME_CONTENT.quests.get(candidate.questId);
        const matches = quest?.steps.some((step) => step.objectives.some((objective) => objective.type === 'reach' && objective.measure === skill && objective.level === candidate.level));
        assert.ok(matches, `${skill} ${candidate.name}`);
      }
    }
  });

  test('lists every creature as a fight entry for the three combat styles only', () => {
    for (const skill of SKILL_IDS) {
      const fights = skillGuide(FIXTURE_CONTENT, skill).filter((candidate) => candidate.kind === 'fight');
      const expected = ['closeQuarters', 'marksmanship', 'psionics'].includes(skill) ? FIXTURE_CONTENT.creatures.size : 0;
      assert.equal(fights.length, expected, skill);
    }
    const fight = skillGuide(FIXTURE_CONTENT, 'closeQuarters').find((candidate) => candidate.kind === 'fight');
    assert.ok(fight);
    assert.equal(skillGuideLabel(fight), `Fight ${fight.name}`);
  });

  test('fight entries are not unlocks', () => {
    const fight: SkillGuideEntry = { kind: 'fight', name: 'Thing', level: 5, creatureId: 'thing', locations: [] };
    const entries = [entry('A', 1), fight, entry('B', 9)];
    assert.deepEqual(skillUnlocksBetween(entries, 1, 9).map((candidate) => candidate.name), ['B']);
    assert.deepEqual(nextSkillUnlocks(entries, 1).map((candidate) => candidate.name), ['B']);
    assert.deepEqual(nextSkillUnlocks([fight], 1), []);
  });

  test('derives Fortitude milestones from the combat profile', () => {
    const at = (level: number) => createStartingSkills({ fortitude: experienceForLevel(level) });
    const perLevel = maxIntegrityFor(at(2)) - maxIntegrityFor(at(1));
    const lines = skillMilestones('fortitude');
    assert.equal(lines.length, 3);
    assert.ok(lines[0]?.startsWith(`+${perLevel} integrity`));
    assert.ok(lines[1]?.includes('every 2 levels'));
    assert.ok(lines[2]?.includes('+1 combat level every 2 levels'));
    const noGear = { armor: 0, deflection: 0, hazardShielding: 0, cognitiveWard: 0, power: 0, accuracy: 0, focus: 0, insight: 0 };
    assert.equal(deriveCombatProfile(at(4), noGear).meleeDefence - deriveCombatProfile(at(2), noGear).meleeDefence, 1);
    assert.deepEqual(skillMilestones('salvage'), []);
  });

  test('finds unlocks between levels and the next unlock', () => {
    const entries = [entry('A', 1), entry('B', 5), entry('C', 5), entry('D', 9)];
    assert.deepEqual(skillUnlocksBetween(entries, 4, 9).map((candidate) => candidate.name), ['B', 'C', 'D']);
    assert.deepEqual(skillUnlocksBetween(entries, 5, 8), []);
    assert.deepEqual(nextSkillUnlocks(entries, 1).map((candidate) => candidate.name), ['B', 'C']);
    assert.deepEqual(nextSkillUnlocks(entries, 9), []);
  });

  test('summarises long unlock lists', () => {
    const entries = ['A', 'B', 'C', 'D', 'E'].map((name) => entry(name, 2));
    assert.equal(summariseUnlocks(entries), 'Quest: A, Quest: B, Quest: C and 2 more');
    assert.equal(summariseUnlocks(entries.slice(0, 2)), 'Quest: A, Quest: B');
    assert.equal(summariseUnlocks(entries, 1), 'Quest: A and 4 more');
  });
});
