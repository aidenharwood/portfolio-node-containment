import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  STUDY_INTERACTION,
  STUDY_TICKS,
  studiedFlag,
  studyExperience,
  type CharacterRecord,
  type QuestProgress,
} from '@containment/shared';
import { createHarness, inRoom, type Harness, CONTENT } from './support/testHarness.ts';

const completed = (questId: string): QuestProgress => ({ questId, status: 'completed', stepIndex: 0, objectiveProgress: [] });

function researcher(researchLevel: number, flags: readonly string[] = []) {
  return (record: CharacterRecord): CharacterRecord => {
    const skills = createStartingSkills({ fortitude: experienceForLevel(40), research: experienceForLevel(researchLevel) });
    return {
      ...record,
      location: inRoom('fx-arena', 'landing'),
      quests: { 'live-fire': completed('live-fire') },
      skills,
      vitals: { integrity: maxIntegrityFor(skills) },
      flags: [...record.flags, ...flags],
    };
  };
}

const study = (harness: Harness) =>
  harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: STUDY_INTERACTION });

function tickUntilStudied(harness: Harness): void {
  for (let tick = 0; tick < STUDY_TICKS * 6 && harness.player.activity?.kind === 'study'; tick++) harness.gameplay.tick();
}

const warden = CONTENT.creatures.get('hollow-warden');

describe('studying anomalies', () => {
  test('the first study catalogues the specimen and pays discovery experience', () => {
    assert.ok(warden);
    const harness = createHarness({ prepare: researcher(warden.level) });
    const before = harness.player.record.skills.research;
    study(harness);
    tickUntilStudied(harness);
    assert.ok(harness.player.hasFlag(studiedFlag('hollow-warden')));
    assert.equal(harness.player.record.skills.research, before + studyExperience(warden, true));
    harness.gameplay.tick();
    assert.ok(harness.sink.last('player.state')?.self.studiedCreatures.includes('hollow-warden'));
  });

  test('restudying a catalogued specimen pays only field-note experience', () => {
    assert.ok(warden);
    const harness = createHarness({ prepare: researcher(warden.level, [studiedFlag('hollow-warden')]) });
    const before = harness.player.record.skills.research;
    study(harness);
    tickUntilStudied(harness);
    const gained = harness.player.record.skills.research - before;
    assert.equal(gained, studyExperience(warden, false));
    assert.ok(gained < studyExperience(warden, true) / 5);
  });

  test('a study is refused when Analysis is below the specimen level', () => {
    assert.ok(warden);
    const harness = createHarness({ prepare: researcher(warden.level - 1) });
    study(harness);
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /Analysis/);
  });

  test('a specimen that wanders out of view is followed and the study restarts', () => {
    assert.ok(warden);
    const harness = createHarness({ prepare: researcher(warden.level) });
    const specimen = harness.gameplay.world.levelOf(harness.player).creatureByInstance('arena-warden');
    assert.ok(specimen);
    study(harness);
    for (let tick = 0; tick < 10 && (harness.player.activity?.kind !== 'study' || harness.player.activity.dueTick === null); tick++) harness.gameplay.tick();
    const level = harness.gameplay.world.levelOf(harness.player);
    const home = specimen.position;
    const away = [...Array(12).keys()].flatMap((dx) => [-1, 1].map((sign) => ({ x: home.x + sign * (dx + 6), y: home.y })))
      .find((point) => level.creatureGrid.isWalkable(point) && level.pathBetween(harness.player.position, point, true) !== null);
    assert.ok(away);
    specimen.position = away;
    harness.gameplay.tick();
    assert.equal(harness.player.activity?.kind, 'study');
    assert.equal(harness.player.activity?.kind === 'study' ? harness.player.activity.dueTick : 'missing', null);
    specimen.position = home;
    tickUntilStudied(harness);
    assert.ok(harness.player.hasFlag(studiedFlag('hollow-warden')));
  });

  test('walking away abandons a study in progress', () => {
    assert.ok(warden);
    const harness = createHarness({ prepare: researcher(warden.level) });
    study(harness);
    harness.gameplay.tick();
    harness.send({ type: 'world.walk', target: harness.player.position });
    for (let tick = 0; tick < STUDY_TICKS * 2; tick++) harness.gameplay.tick();
    assert.ok(!harness.player.hasFlag(studiedFlag('hollow-warden')));
  });
});
