import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  createStartingSkills,
  experienceForLevel,
  isInFootprint,
  maxIntegrityFor,
  tileKey,
  type BossMechanic,
  type CharacterRecord,
  type EncounterDefinition,
  type TilePoint,
} from '@containment/shared';
import { Creature } from '../src/world/creature.ts';
import { anchor, createHarness, inRoom, type Harness } from './support/testHarness.ts';

const veteran = (record: CharacterRecord): CharacterRecord => {
  const skills = createStartingSkills({ fortitude: experienceForLevel(60) });
  return { ...record, location: inRoom('sector-two', 'inner-chamber', { x: 4, y: 4 }), skills, vitals: { integrity: maxIntegrityFor(skills) } };
};

const slam: BossMechanic = { kind: 'telegraph', id: 'slam', shape: 'body', reach: 1, windupTicks: 5, cooldownTicks: 10, style: 'psionic', accuracy: 1000, maxHit: 6 };

function stage(encounter: EncounterDefinition): { harness: Harness; boss: Creature } {
  const harness = createHarness({ prepare: veteran });
  const level = harness.gameplay.world.levelOf(harness.player);
  const original = level.creatureByInstance('s2-warden');
  assert.ok(original);
  const boss = new Creature(original.placement, { ...original.definition, integrity: 10_000, aggressive: true, encounter });
  level.creatures.set(boss.entityId, boss);
  level.rebuildBodies();
  harness.approach('s2-warden');
  boss.targetId = harness.player.entityId;
  return { harness, boss };
}

const psionicHitsOn = (harness: Harness) =>
  harness.sink.messages.filter((message) => message.type === 'combat.hit' && message.targetId === harness.player.entityId && message.style === 'psionic' && message.damage > 0).length;

const summonsOf = (harness: Harness, boss: Creature) =>
  [...harness.gameplay.world.levelOf(harness.player).creatures.values()].filter((creature) => creature.summoner === boss.entityId);

function freeTileOutside(harness: Harness, avoid: ReadonlySet<string>, boss: Creature): TilePoint {
  const level = harness.gameplay.world.levelOf(harness.player);
  for (let radius = 3; radius < 12; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const point = { x: boss.position.x + dx, y: boss.position.y + radius };
      if (level.grid.isWalkable(point) && !level.isSafe(point) && !avoid.has(tileKey(point)) && !isInFootprint(point, boss.position, boss.size)) return point;
    }
  }
  throw new Error('no free tile');
}

describe('boss encounters', () => {
  test('a telegraph hits a player who stays on its tiles', () => {
    const { harness, boss } = stage({ mechanics: [slam] });
    harness.ticksUntil(() => harness.sink.messages.some((message) => message.type === 'encounter.telegraph'), 40);
    const telegraph = harness.sink.last('encounter.telegraph');
    assert.ok(telegraph && telegraph.tiles.some((tile) => tileKey(tile) === tileKey(harness.player.position)));
    harness.ticksUntil(() => harness.sink.messages.some((message) => message.type === 'encounter.resolved'), 10);
    assert.ok(psionicHitsOn(harness) > 0);
    assert.ok(boss.isAlive);
  });

  test('a telegraph misses a player who steps off before it lands', () => {
    const { harness, boss } = stage({ mechanics: [slam] });
    harness.ticksUntil(() => harness.sink.messages.some((message) => message.type === 'encounter.telegraph'), 40);
    const telegraph = harness.sink.last('encounter.telegraph')!;
    const away = freeTileOutside(harness, new Set(telegraph.tiles.map(tileKey)), boss);
    harness.gameplay.teleport(harness.player, { levelId: harness.player.levelId, position: away });
    harness.player.path = [];
    harness.ticksUntil(() => harness.sink.messages.some((message) => message.type === 'encounter.resolved'), 10);
    assert.equal(psionicHitsOn(harness), 0);
  });

  test('a phase swaps the attack and announces itself', () => {
    const { harness, boss } = stage({
      mechanics: [],
      phases: [{ belowIntegrity: 0.5, announce: 'It turns its gaze inward.', attack: { style: 'psionic', accuracy: 20, maxHit: 4, range: 5, speedTicks: 5 }, enables: [] }],
    });
    assert.equal(boss.attackProfile().style, boss.definition.attack.style);
    boss.integrity = 4000;
    harness.gameplay.tick();
    const phase = harness.sink.last('encounter.phase');
    assert.equal(phase?.phase, 1);
    assert.equal(phase?.announce, 'It turns its gaze inward.');
    assert.equal(boss.attackProfile().style, 'psionic');
    assert.equal(boss.snapshot().phase, 1);
  });

  test('summoned adds join the fight and vanish when the boss resets', () => {
    const { harness, boss } = stage({ mechanics: [{ kind: 'summon', id: 'mites', creatureId: 'gloam-mite', count: 2, maxAlive: 2 }] });
    harness.gameplay.tick();
    assert.equal(summonsOf(harness, boss).length, 2);
    assert.ok(summonsOf(harness, boss).every((add) => add.targetId === harness.player.entityId));
    harness.gameplay.teleport(harness.player, anchor('meridian-atrium', 'recovery'));
    harness.ticksUntil(() => boss.encounter?.engaged === false, 20);
    assert.equal(summonsOf(harness, boss).length, 0);
  });

  test('adds vanish when the boss falls', () => {
    const { harness, boss } = stage({ mechanics: [{ kind: 'summon', id: 'mites', creatureId: 'gloam-mite', count: 2, maxAlive: 2 }] });
    harness.gameplay.tick();
    assert.equal(summonsOf(harness, boss).length, 2);
    boss.integrity = 1;
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 0 });
    harness.ticksUntil(() => !boss.isAlive, 40);
    assert.equal(summonsOf(harness, boss).length, 0);
    assert.ok(harness.sink.messages.some((message) => message.type === 'encounter.cleared'));
  });

  test('hazards burn players standing on them and clear on reset', () => {
    const hazard: BossMechanic = { kind: 'hazard', id: 'seep', hazard: 'coolant', seedTiles: 3, spreadEveryTicks: 3, damagePerTick: 2, maxTiles: 10 };
    const { harness, boss } = stage({ mechanics: [hazard] });
    harness.ticksUntil(() => boss.encounter!.hazards.has('seep'), 20);
    const tiles = boss.encounter!.hazards.get('seep')!;
    assert.ok(harness.sink.messages.some((message) => message.type === 'encounter.hazard'));
    harness.gameplay.teleport(harness.player, { levelId: harness.player.levelId, position: tiles[0]! });
    harness.player.path = [];
    const before = harness.player.integrity;
    harness.gameplay.tick();
    assert.ok(harness.player.integrity <= before - 2);
    boss.targetId = null;
    harness.gameplay.teleport(harness.player, anchor('meridian-atrium', 'recovery'));
    harness.ticksUntil(() => boss.encounter?.engaged === false, 20);
    assert.equal(boss.encounter!.hazards.size, 0);
  });

  test('enrage quickens attacks once the fight runs long', () => {
    const { harness, boss } = stage({ mechanics: [{ kind: 'enrage', id: 'fury', afterTicks: 10, speedFactor: 2 }] });
    const base = boss.attackProfile().speedTicks;
    harness.ticksUntil(() => boss.encounter?.enraged === true, 30);
    assert.equal(boss.attackProfile().speedTicks, Math.max(1, Math.round(base / 2)));
    assert.ok(harness.sink.messages.some((message) => message.type === 'encounter.enraged'));
    assert.equal(boss.snapshot().enraged, true);
  });
});
