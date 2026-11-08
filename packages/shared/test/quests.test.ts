import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { advanceQuest, trackedQuest, GAME_CONTENT, npcQuestMarker, startQuest, type QuestDefinition, type QuestStateProbe } from '../src/index.ts';

const quest: QuestDefinition = {
  id: 'sample',
  name: 'Sample',
  category: 'side',
  summary: '',
  rewards: [],
  rewardSummary: [],
  steps: [
    { id: 'greet', journal: '', objectives: [{ type: 'talkTo', npcId: 'guide', label: '' }] },
    { id: 'fetch', journal: '', objectives: [{ type: 'obtainItem', itemId: 'widget', count: 2, label: '' }] },
    { id: 'return', journal: '', objectives: [{ type: 'talkTo', npcId: 'guide', label: '' }] },
  ],
};

const probeWith = (widgets: number): QuestStateProbe => ({
  countItem: (itemId) => (itemId === 'widget' ? widgets : 0),
  isEquipped: () => false,
});

describe('quest progression', () => {
  test('starts on the first step with no progress', () => {
    const { progress } = startQuest(quest, probeWith(0));
    assert.equal(progress.stepIndex, 0);
    assert.deepEqual(progress.objectiveProgress, [0]);
  });

  test('a single event only advances the current step, never the next', () => {
    const started = startQuest(quest, probeWith(2)).progress;
    const advanced = advanceQuest(quest, started, { type: 'talkedTo', npcId: 'guide' }, probeWith(2));
    assert.deepEqual(
      advanced.completedSteps.map((step) => step.id),
      ['greet', 'fetch'],
    );
    assert.equal(advanced.progress.stepIndex, 2);
    assert.equal(advanced.questCompleted, false);
  });

  test('state objectives track current holdings rather than accumulating', () => {
    const atFetch = advanceQuest(quest, startQuest(quest, probeWith(0)).progress, { type: 'talkedTo', npcId: 'guide' }, probeWith(1));
    assert.equal(atFetch.progress.stepIndex, 1);
    assert.deepEqual(atFetch.progress.objectiveProgress, [1]);
    const dropped = advanceQuest(quest, atFetch.progress, { type: 'loadoutChanged' }, probeWith(0));
    assert.deepEqual(dropped.progress.objectiveProgress, [0]);
  });

  test('completes the quest after the final step', () => {
    let progress = startQuest(quest, probeWith(2)).progress;
    progress = advanceQuest(quest, progress, { type: 'talkedTo', npcId: 'guide' }, probeWith(2)).progress;
    const finished = advanceQuest(quest, progress, { type: 'talkedTo', npcId: 'guide' }, probeWith(2));
    assert.equal(finished.questCompleted, true);
    assert.equal(finished.progress.status, 'completed');
  });

  test('ignores events for unrelated targets', () => {
    const started = startQuest(quest, probeWith(0)).progress;
    const unchanged = advanceQuest(quest, started, { type: 'talkedTo', npcId: 'stranger' }, probeWith(0));
    assert.equal(unchanged.progress.stepIndex, 0);
    assert.equal(unchanged.completedSteps.length, 0);
  });
});

test('an NPC only advertises a quest once the quests it requires are complete', () => {
  const done = (questId: string) => ({ questId, status: 'completed' as const, stepIndex: 0, objectiveProgress: [] });
  assert.equal(npcQuestMarker('artificer-duval', {}, GAME_CONTENT.quests, null), 'available', 'Rimeguard is offered straight away');
  const rimeguardTaken = { rimeguard: done('rimeguard') };
  assert.equal(npcQuestMarker('artificer-duval', rimeguardTaken, GAME_CONTENT.quests, null), null, 'Servo Salvage waits for Cold Storage');
  assert.equal(npcQuestMarker('artificer-duval', { ...rimeguardTaken, 'cold-storage': done('cold-storage') }, GAME_CONTENT.quests, null), 'available');
  assert.equal(npcQuestMarker('archivist-sel', {}, GAME_CONTENT.quests, null), null, 'the Council does not call before Halvorsen is found');
});

test('the tracked quest is the preferred active quest, falling back to the first active one', () => {
  const other: QuestDefinition = { ...quest, id: 'other', name: 'Other', category: 'main' };
  const quests = new Map([[quest.id, quest], [other.id, other]]);
  const log = {
    [quest.id]: startQuest(quest, probeWith(0)).progress,
    [other.id]: startQuest(other, probeWith(0)).progress,
  };
  assert.equal(trackedQuest(log, quests, 'sample')?.quest.id, 'sample');
  assert.equal(trackedQuest(log, quests, null)?.quest.id, 'other');
  assert.equal(trackedQuest(log, quests, 'missing')?.quest.id, 'other');
  assert.equal(trackedQuest({}, quests, 'sample'), undefined);
});
