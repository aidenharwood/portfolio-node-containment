import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createDefaultDraft, type CharacterRecord, type TilePoint } from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import { CharacterRepository } from '../src/characters/characterRepository.ts';
import { openDatabase } from '../src/persistence/database.ts';
import { restoreLocation, storeLocation } from '../src/characters/storedLocation.ts';
import { anchor, anchorPoint, at, CONTENT, createHarness, inRoom, levelPoint, type Harness, localInRoom } from './support/testHarness.ts';

const FLOOR_SPAWN = anchor('fx-hub', 'start');
const HUB_RECOVERY = anchor('fx-hub', 'recovery');
const LANDING = anchorPoint('fx-arena', 'landing');

function walkTo(harness: Harness, target: TilePoint): void {
  harness.send({ type: 'world.walk', target });
  harness.ticksUntil(() => harness.player.path.length === 0);
  assert.deepEqual(harness.player.position, target);
}

const placedAt = (location: CharacterRecord['location'], flags: readonly string[] = [], inventory?: CharacterRecord['inventory']) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location,
  flags: [...record.flags, ...flags],
  ...(inventory ? { inventory } : {}),
});

describe('stored locations', () => {
  test('legacy zone locations convert to level coordinates', () => {
    assert.deepEqual(restoreLocation({ zoneId: 'fx-field', position: localInRoom('fx-field', 'safehouse') }, CONTENT), at('fx-field', localInRoom('fx-field', 'safehouse')));
  });

  test('legacy locations convert to the first level spawn when the zone is gone', () => {
    assert.deepEqual(restoreLocation({ zoneId: 'sector-nine', position: { x: 1, y: 1 } }, CONTENT), FLOOR_SPAWN);
  });

  test('a stored location on an unwalkable tile falls back to its district recovery', () => {
    assert.deepEqual(restoreLocation({ zoneId: 'fx-hub', position: { x: 0, y: 0 } }, CONTENT), HUB_RECOVERY);
    assert.deepEqual(restoreLocation({ districtId: 'fx-hub', position: { x: 0, y: 0 } }, CONTENT), HUB_RECOVERY);
  });

  test('locations are stored district-local and restored to level coordinates', () => {
    const current = at('fx-arena', LANDING);
    assert.deepEqual(storeLocation(current, CONTENT), { districtId: 'fx-arena', position: LANDING });
    assert.deepEqual(restoreLocation(storeLocation(current, CONTENT), CONTENT), current);
  });

  test('the character repository saves district-local locations and loads level coordinates', () => {
    const database = openDatabase(':memory:');
    database.exec('PRAGMA foreign_keys = OFF;');
    const repository = new CharacterRepository(database, CONTENT);
    const created = createCharacterRecord({ ...createDefaultDraft(), name: 'Stored Operative' }, { id: 'character-9', accountId: 'account-9' }, CONTENT);
    const record = { ...created, location: at('fx-field', localInRoom('fx-field', 'safehouse')) };
    repository.insert(record);
    const row = database.prepare('SELECT record FROM characters WHERE id = ?').get('character-9') as { record: string };
    assert.deepEqual(JSON.parse(row.record).location, { districtId: 'fx-field', position: localInRoom('fx-field', 'safehouse') });
    assert.deepEqual(repository.findOwned('account-9', 'character-9')?.location, record.location);
  });

  test('level-coordinate locations pass through unchanged, and fall back to the spawn when no longer floor', () => {
    const current = at('fx-arena', LANDING);
    assert.deepEqual(restoreLocation(current, CONTENT), current);
    assert.deepEqual(restoreLocation({ levelId: 'fx-floor', position: { x: 0, y: 0 } }, CONTENT), FLOOR_SPAWN);
  });
});

describe('levels', () => {
  test('districts joined by exits are walked across without a teleport, and each is charted on entry', () => {
    const harness = createHarness({ prepare: placedAt(inRoom('fx-hub', 'hall')) });
    const charted = () => harness.sink.last('player.state')?.self.visitedDistricts ?? [];
    assert.ok(charted().includes('fx-hub'));
    assert.ok(!charted().includes('fx-field'));
    walkTo(harness, levelPoint('fx-field', localInRoom('fx-field', 'lane', { x: 4, y: 1 })));
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'fx-field');
    assert.ok(charted().includes('fx-field'));
    assert.ok(!charted().includes('fx-outpost'));
    assert.equal(harness.sink.messages.filter((message) => message.type === 'world.entered').length, 1);
  });

  test('characters saved before district tracking keep every district of the levels they had visited', () => {
    const harness = createHarness({ prepare: placedAt(inRoom('fx-hub', 'plaza'), ['visited:fx-floor']) });
    const charted = harness.sink.last('player.state')?.self.visitedDistricts ?? [];
    for (const districtId of ['fx-hub', 'fx-field', 'fx-outpost']) assert.ok(charted.includes(districtId), districtId);
    assert.ok(!charted.includes('fx-arena'));
  });

  test('a door stays shut without its condition', () => {
    const harness = createHarness({ prepare: placedAt(inRoom('fx-field', 'lane', { x: 35, y: 9 })) });
    harness.interactWithObject('vault-door-a');
    assert.notEqual(harness.gameplay.world.districtOf(harness.player) === 'fx-field' && harness.gameplay.world.levelOf(harness.player).areasAt(harness.player.position).some((area) => area.id === 'vault'), true);
    assert.ok(harness.sink.messages.some((message) => message.type === 'notice' && /locked/.test(message.text)));
  });

  test('a player who meets a door condition walks through it, and it stays open for them alone', () => {
    const keycard = [{ itemId: 'vault-keycard', quantity: 1 }];
    const harness = createHarness({ prepare: (record) => placedAt(inRoom('fx-field', 'lane', { x: 35, y: 9 }), [], [...keycard, ...record.inventory.slice(1)])(record) });
    walkTo(harness, levelPoint('fx-field', localInRoom('fx-field', 'vault', { x: 4, y: 4 })));
    assert.ok(harness.sink.last('player.state')?.self.openDoors.includes('vault-door'));
    const level = harness.gameplay.world.levelOf(harness.player);
    const doorTile = CONTENT.levels.get('fx-floor')?.objects.find((object) => object.instanceId === 'vault-door-a')?.position;
    assert.ok(doorTile);
    assert.equal(level.grid.isWalkable(doorTile), false, 'the shared grid keeps the door shut for everyone else');
    assert.equal(level.creatureGrid.isWalkable(doorTile), false, 'creatures never pass a door');
  });

  test('a door you have opened stays open after the key is gone', () => {
    const harness = createHarness({ prepare: (record) => placedAt(inRoom('fx-field', 'lane', { x: 35, y: 9 }), [], [{ itemId: 'vault-keycard', quantity: 1 }, ...record.inventory.slice(1)])(record) });
    harness.interactWithObject('vault-door-a');
    harness.ticksUntil(() => harness.player.path.length === 0);
    harness.player.update({ inventory: harness.player.record.inventory.map((slot) => (slot?.itemId === 'vault-keycard' ? null : slot)) });
    walkTo(harness, levelPoint('fx-field', localInRoom('fx-field', 'vault', { x: 4, y: 4 })));
    walkTo(harness, levelPoint('fx-field', localInRoom('fx-field', 'lane', { x: 35, y: 9 })));
  });

  test('a saved position on an unwalkable tile spawns nearby in the same district', () => {
    const inTheWall = at('fx-field', { x: 0, y: 2 });
    assert.notEqual(CONTENT.levels.get(inTheWall.levelId)?.layout.tileAt(inTheWall.position), 'asphalt');
    const harness = createHarness({ prepare: placedAt(inTheWall) });
    assert.ok(Math.max(Math.abs(harness.player.position.x - inTheWall.position.x), Math.abs(harness.player.position.y - inTheWall.position.y)) <= 3);
  });

  test('incapacitation recovers in the district it happened in', () => {
    const harness = createHarness({ prepare: placedAt(inRoom('fx-field', 'den')) });
    harness.gameplay.recoverIncapacitated(harness.player);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'fx-field');
    assert.deepEqual(harness.player.position, anchor('fx-field', 'recovery').position);
  });

  test('a lift carries a player between levels', () => {
    const harness = createHarness({ prepare: placedAt(inRoom('fx-hub', 'plaza'), ['clearance.depths']) });
    harness.interactWithObject('hub-lift');
    assert.equal(harness.player.levelId, 'fx-depths');
    harness.interactWithObject('arena-lift');
    assert.equal(harness.player.levelId, 'fx-floor');
  });
});
