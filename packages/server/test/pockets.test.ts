import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visitedLevelFlag, type CharacterRecord, type QuestProgress } from '@containment/shared';
import { anchor, at, createHarness, districtOf, localInRoom } from './support/testHarness.ts';

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

const beside = (overgrowthDone: boolean) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location: anchor('hydroponics', 'foldReturn'),
  quests: overgrowthDone ? { ...record.quests, overgrowth: completed('overgrowth') } : record.quests,
});

test('the Verdance anomaly stays shut until Overgrowth is done', () => {
  const harness = createHarness({ prepare: beside(false) });
  harness.interactWithObject('hydro-fold-anomaly/1,0');
  assert.equal(harness.player.levelId, 'main-floor');
  assert.match(harness.sink.last('notice')?.text ?? '', /flinches away/);
});

test('stepping through the anomaly enters the pocket and charts it on the world map', () => {
  const harness = createHarness({ prepare: beside(true) });
  harness.interactWithObject('hydro-fold-anomaly/1,0');
  assert.equal(harness.player.levelId, 'verdant-fold');
  assert.equal(districtOf(harness.player), 'verdant-fold');
  assert.ok(harness.player.hasFlag(visitedLevelFlag('verdant-fold')));
  assert.ok(harness.sink.messages.some((message) => message.type === 'notice' && /world map/.test(message.text)));
  harness.gameplay.tick();
  assert.ok(harness.sink.last('player.state')?.self.visitedLevels.includes('verdant-fold'));
});

test('the pocket only announces itself on the first visit', () => {
  const harness = createHarness({ prepare: (record) => ({ ...beside(true)(record), flags: [...record.flags, visitedLevelFlag('verdant-fold')] }) });
  harness.interactWithObject('hydro-fold-anomaly/1,0');
  assert.equal(harness.player.levelId, 'verdant-fold');
  assert.ok(!harness.sink.messages.some((message) => message.type === 'notice' && /world map/.test(message.text)));
});

test('the seam leads back to the Heart Bed', () => {
  const harness = createHarness({ prepare: beside(true) });
  harness.interactWithObject('hydro-fold-anomaly/1,0');
  harness.interactWithObject('fold-exit/1,0');
  assert.equal(harness.player.levelId, 'main-floor');
  assert.equal(districtOf(harness.player), 'hydroponics');
});

test('the heartwood teaches once per operative', () => {
  const harness = createHarness({ prepare: beside(true) });
  harness.interactWithObject('hydro-fold-anomaly/1,0');
  const before = harness.player.record.skills.research;
  harness.interactWithObject('fold-heartwood');
  assert.equal(harness.player.record.skills.research, before + 220);
  harness.interactWithObject('fold-heartwood');
  assert.equal(harness.player.record.skills.research, before + 220);
});
