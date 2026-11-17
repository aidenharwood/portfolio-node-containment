import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, pendingQuest, questRequirements, SKILL_IDS, trackedQuest, type QuestLog, type SkillExperience } from '../src/index.ts';

const done = (...ids: string[]): QuestLog =>
  Object.fromEntries(ids.map((questId) => [questId, { questId, status: 'completed' as const, stepIndex: 0, objectiveProgress: [] }]));

const fresh = Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as SkillExperience;

describe('quest requirements', () => {
  test('lists prerequisite quests and dialogue gates', () => {
    const quest = GAME_CONTENT.quests.get('bottom-up');
    assert.ok(quest);
    const requirements = questRequirements(quest, {}, fresh, GAME_CONTENT);
    const labels = requirements.map((requirement) => requirement.label);
    assert.ok(labels.includes(`Complete ${GAME_CONTENT.quests.get('valve-trouble')?.name}`));
    assert.ok(labels.includes('Engineering level 25'));
    assert.ok(requirements.every((requirement) => !requirement.met || requirement.recommended));
  });

  test('a completed prerequisite is met', () => {
    const quest = GAME_CONTENT.quests.get('bottom-up');
    assert.ok(quest);
    const requirements = questRequirements(quest, done('last-train-in', 'valve-trouble'), fresh, GAME_CONTENT);
    assert.ok(requirements.filter((requirement) => requirement.label.startsWith('Complete')).every((requirement) => requirement.met));
  });
});

describe('tracking an unstarted quest', () => {
  test('routes to the quest giver', () => {
    const tracked = trackedQuest({}, GAME_CONTENT.quests, 'lost-cat', GAME_CONTENT.npcs);
    assert.equal(tracked?.quest.id, 'lost-cat');
    const objective = tracked?.objectives[0]?.objective;
    assert.equal(objective?.type, 'talkTo');
    assert.equal(objective?.type === 'talkTo' && objective.npcId, 'pell');
  });

  test('a started quest is not pending', () => {
    const log: QuestLog = { 'lost-cat': { questId: 'lost-cat', status: 'active', stepIndex: 0, objectiveProgress: [0] } };
    assert.equal(pendingQuest(log, GAME_CONTENT.quests, 'lost-cat'), undefined);
    assert.equal(pendingQuest(done('lost-cat'), GAME_CONTENT.quests, 'lost-cat'), undefined);
  });
});
