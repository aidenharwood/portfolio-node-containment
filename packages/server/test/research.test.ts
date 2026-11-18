import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  createDefaultDraft,
  createStartingSkills,
  experienceForLevel,
  maxIntegrityFor,
  REPEAT_STUDY_COOLDOWN_TICKS,
  STUDY_INTERACTION,
  STUDY_TICKS,
  studiedFlag,
  studyExperience,
  type CharacterRecord,
  type QuestProgress,
} from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import type { Player } from '../src/world/player.ts';
import { createHarness, inRoom, RecordingSink, type Harness, CONTENT } from './support/testHarness.ts';

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
    assert.ok(gained < studyExperience(warden, true) / 4);
  });

  test('a noted specimen refuses a second study until it respawns', () => {
    assert.ok(warden);
    const harness = createHarness({ prepare: researcher(warden.level) });
    const specimen = harness.gameplay.world.levelOf(harness.player).creatureByInstance('arena-warden');
    assert.ok(specimen);
    study(harness);
    tickUntilStudied(harness);
    assert.ok(specimen.notedBy.has(harness.player.record.id));
    const afterFirst = harness.player.record.skills.research;
    study(harness);
    assert.equal(harness.player.activity, null);
    assert.match(harness.sink.last('notice')?.text ?? '', /already have notes on this one/);
    for (let tick = 0; tick < STUDY_TICKS * 2; tick++) harness.gameplay.tick();
    assert.equal(harness.player.record.skills.research, afterFirst);
    specimen.state = 'despawned';
    specimen.diedAtTick = 0;
    specimen.respawnDelayTicks = 1;
    for (let tick = 0; tick < 5 && specimen.state === 'despawned'; tick++) harness.gameplay.tick();
    assert.equal(specimen.state, 'alive');
    assert.equal(specimen.notedBy.size, 0);
    for (let tick = 0; tick < REPEAT_STUDY_COOLDOWN_TICKS; tick++) harness.gameplay.tick();
    study(harness);
    tickUntilStudied(harness);
    assert.equal(harness.player.record.skills.research - afterFirst, Math.round(studyExperience(warden, true) * 0.2));
  });

  test('repeat notes on fresh spawns are rate limited per character', () => {
    assert.ok(warden);
    const harness = createHarness({ prepare: researcher(warden.level, [studiedFlag('hollow-warden')]) });
    const specimen = harness.gameplay.world.levelOf(harness.player).creatureByInstance('arena-warden');
    assert.ok(specimen);
    const before = harness.player.record.skills.research;
    study(harness);
    tickUntilStudied(harness);
    const first = harness.player.record.skills.research - before;
    assert.equal(first, studyExperience(warden, false));
    for (let tick = 0; tick < 50 - STUDY_TICKS; tick++) harness.gameplay.tick();
    specimen.notedBy.clear();
    const afterFirst = harness.player.record.skills.research;
    study(harness);
    assert.equal(harness.player.activity, null);
    assert.equal(harness.sink.last('notice')?.text, 'Your notes need a minute to settle.');
    for (let tick = 0; tick < STUDY_TICKS * 2; tick++) harness.gameplay.tick();
    assert.equal(harness.player.record.skills.research, afterFirst);
    for (let tick = 0; tick < REPEAT_STUDY_COOLDOWN_TICKS; tick++) harness.gameplay.tick();
    study(harness);
    tickUntilStudied(harness);
    assert.equal(harness.player.record.skills.research - afterFirst, studyExperience(warden, false));
  });

  test('each character is limited by their own last note', () => {
    assert.ok(warden);
    const flags = [studiedFlag('hollow-warden')];
    const harness = createHarness({ prepare: researcher(warden.level, flags) });
    const created = createCharacterRecord({ ...createDefaultDraft(), name: 'Second Operative' }, { id: 'character-2', accountId: 'account-2' }, CONTENT);
    const otherSink = new RecordingSink();
    const other = harness.gameplay.enterWorld(researcher(warden.level, flags)({ ...created, quests: {} }), otherSink);
    const specimen = harness.gameplay.world.levelOf(harness.player).creatureByInstance('arena-warden');
    assert.ok(specimen);
    assert.equal(harness.gameplay.world.levelOf(other), harness.gameplay.world.levelOf(harness.player));
    const studyAs = (player: Player) =>
      harness.gameplay.handle(player, { type: 'world.interact', targetKind: 'creature', instanceId: 'arena-warden', interactionIndex: STUDY_INTERACTION });
    const finish = (player: Player) => {
      for (let tick = 0; tick < STUDY_TICKS * 6 && player.activity?.kind === 'study'; tick++) harness.gameplay.tick();
    };
    const freshSpawn = () => specimen.notedBy.clear();

    const mineBefore = harness.player.record.skills.research;
    studyAs(harness.player);
    finish(harness.player);
    assert.equal(harness.player.record.skills.research - mineBefore, studyExperience(warden, false));
    const firstNote = harness.player.lastNoteTick;
    assert.ok(firstNote > -Infinity);
    assert.equal(other.lastNoteTick, -Infinity);

    for (let tick = 0; tick < 20; tick++) harness.gameplay.tick();
    freshSpawn();
    const otherBefore = other.record.skills.research;
    studyAs(other);
    finish(other);
    assert.equal(other.record.skills.research - otherBefore, studyExperience(warden, false));
    assert.equal(harness.player.lastNoteTick, firstNote);
    assert.ok(other.lastNoteTick > firstNote);

    freshSpawn();
    const mineAfter = harness.player.record.skills.research;
    studyAs(harness.player);
    assert.equal(harness.player.activity, null);
    assert.equal(harness.sink.last('notice')?.text, 'Your notes need a minute to settle.');
    studyAs(other);
    assert.equal(other.activity, null);
    assert.equal(otherSink.last('notice')?.text, 'Your notes need a minute to settle.');
    assert.equal(harness.player.record.skills.research, mineAfter);

    for (let tick = 0; tick < REPEAT_STUDY_COOLDOWN_TICKS - (other.lastNoteTick - firstNote); tick++) harness.gameplay.tick();
    freshSpawn();
    const otherHeld = other.record.skills.research;
    studyAs(other);
    assert.equal(other.activity, null);
    assert.equal(other.record.skills.research, otherHeld);
    studyAs(harness.player);
    finish(harness.player);
    assert.equal(harness.player.record.skills.research - mineAfter, studyExperience(warden, false));
  });

  test('a first study is never rate limited', () => {
    assert.ok(warden);
    const harness = createHarness({ prepare: researcher(warden.level) });
    harness.player.lastNoteTick = 0;
    const before = harness.player.record.skills.research;
    study(harness);
    tickUntilStudied(harness);
    assert.equal(harness.player.record.skills.research - before, studyExperience(warden, true));
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
