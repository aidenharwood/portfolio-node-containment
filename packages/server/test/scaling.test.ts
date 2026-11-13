import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createDefaultDraft, createStartingSkills, experienceForLevel, GAME_CONTENT, maxIntegrityFor, type CharacterRecord } from '@containment/shared';
import { SINGLE_WAY_TARGET_TAKEN } from '../src/gameplay/combatController.ts';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import { Gameplay } from '../src/gameplay/gameplay.ts';
import type { Player } from '../src/world/player.ts';
import { RecordingSink, at, localInRoom } from './support/testHarness.ts';

function crowd(count: number, options: { capacity: number; districtId: string; position: { x: number; y: number } }) {
  const gameplay = new Gameplay(GAME_CONTENT, { save: () => undefined, findByName: () => null }, {
    tickMs: 300,
    autosaveIntervalMs: 60_000,
    random: () => 0.99,
    combatRandom: () => 0.01,
    levelCapacity: options.capacity,
  });
  const players: Player[] = [];
  for (let index = 0; index < count; index++) {
    const base = createCharacterRecord({ ...createDefaultDraft(), name: `Operative ${String.fromCharCode(65 + index)}` }, { id: `c-${index}`, accountId: `a-${index}` }, GAME_CONTENT);
    const record: CharacterRecord = { ...base, quests: {}, location: at(options.districtId, options.position) };
    players.push(gameplay.enterWorld(record, new RecordingSink()));
  }
  return { gameplay, players };
}

describe('scaling for crowds', () => {
  test('a full level overflows into a new layer, and players share layers until capacity', () => {
    const { gameplay, players } = crowd(5, { capacity: 2, districtId: 'meridian-atrium', position: localInRoom('meridian-atrium', 'workshop', { x: 29, y: 24 }) });
    const layers = gameplay.world.layersOf('main-floor');
    assert.equal(layers.length, 3);
    assert.deepEqual(layers.map((layer) => layer.players.size), [2, 2, 1]);
    const [first, second] = players;
    assert.ok(first && second);
    assert.equal(gameplay.world.levelOf(first), gameplay.world.levelOf(second));
  });

  test('empty overflow layers are retired', () => {
    const { gameplay, players } = crowd(3, { capacity: 2, districtId: 'meridian-atrium', position: localInRoom('meridian-atrium', 'workshop', { x: 29, y: 24 }) });
    const overflowPlayer = players[2];
    assert.ok(overflowPlayer);
    gameplay.leaveWorld(overflowPlayer);
    for (let tick = 0; tick < 250; tick++) gameplay.tick();
    assert.equal(gameplay.world.layersOf('main-floor').length, 1);
  });

  test('outside multi-combat areas, a creature fights one operative at a time', () => {
    const { gameplay, players } = crowd(2, { capacity: 10, districtId: 'sector-two', position: localInRoom('sector-two', 'corridor', { x: 23, y: 2 }) });
    const [first, second] = players as [Player, Player];
    const mite = gameplay.world.levelOf(first).creatureByInstance('s2-mite-corridor-a');
    assert.ok(mite);
    gameplay.handle(first, { type: 'world.interact', targetKind: 'creature', instanceId: 's2-mite-corridor-a', interactionIndex: 0 });
    for (let tick = 0; tick < 40 && mite.engagedWith === null; tick++) gameplay.tick();
    assert.equal(mite.engagedWith, first.entityId);
    gameplay.handle(second, { type: 'world.interact', targetKind: 'creature', instanceId: 's2-mite-corridor-a', interactionIndex: 0 });
    assert.equal(second.combatTargetId, null);
    assert.equal((second.sink as RecordingSink).last('notice')?.text, SINGLE_WAY_TARGET_TAKEN);
  });

  test('in a multi-combat boss arena, everyone who damaged a creature gets credit and personal loot', () => {
    const { gameplay, players } = crowd(2, { capacity: 10, districtId: 'undercroft', position: localInRoom('undercroft', 'workshop') });
    const level = gameplay.world.levelOf(players[0] as Player);
    const leech = level.creatureByInstance('uc-foreman-add-a');
    assert.ok(leech);
    assert.ok(gameplay.combatIsMulti(level, leech.position));
    for (const player of players) {
      const skills = createStartingSkills({ closeQuarters: experienceForLevel(40), fortitude: experienceForLevel(50) });
      player.update({ skills, vitals: { integrity: maxIntegrityFor(skills) } });
      gameplay.handle(player, { type: 'world.interact', targetKind: 'creature', instanceId: 'uc-foreman-add-a', interactionIndex: 0 });
    }
    for (let tick = 0; tick < 400 && leech.isAlive; tick++) gameplay.tick();
    assert.equal(leech.isAlive, false);
    for (const player of players) {
      assert.ok([...level.groundItems.values()].some((item) => item.itemId === 'leech-sac' && item.ownerId === player.entityId), player.record.name);
    }
  });
});
