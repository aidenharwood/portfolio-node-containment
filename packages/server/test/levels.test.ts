import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createDefaultDraft, GAME_CONTENT, type CharacterRecord, type TilePoint } from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import { CharacterRepository } from '../src/characters/characterRepository.ts';
import { openDatabase } from '../src/persistence/database.ts';
import { restoreLocation, storeLocation } from '../src/characters/storedLocation.ts';
import { anchor, at, createHarness, exitPoint, inRoom, levelPoint, type Harness, localInRoom } from './support/testHarness.ts';

const MAIN_FLOOR_SPAWN = anchor('meridian-atrium', 'transit');
const LIFT_ARRIVAL = GAME_CONTENT.districts.get('deepwatch')?.anchors?.liftArrival ?? { x: 0, y: 0 };

const WEST_GATE = at('meridian-atrium', localInRoom('meridian-atrium', 'west-gate', { x: 2, y: 2 }));
const EAST_GATE = at('meridian-atrium', localInRoom('meridian-atrium', 'east-gate', { x: 27, y: 2 }));

const ROUTE_TO_HYDROPONICS: readonly TilePoint[] = [
  levelPoint('meridian-circuit', localInRoom('meridian-circuit', 'west-boulevard', { x: 6, y: 90 })),
  exitPoint('meridian-circuit', 'west'),
  anchor('verdance-concourse', 'walkEastReach').position,
  anchor('verdance-concourse', 'walkEastOfCanal').position,
  anchor('verdance-concourse', 'walkWestOfCanal').position,
  anchor('verdance-concourse', 'walkWestReach').position,
  levelPoint('hydroponics', localInRoom('hydroponics', 'platform')),
];

const ROUTE_TO_SERVICE_YARDS: readonly TilePoint[] = [
  levelPoint('meridian-circuit', localInRoom('meridian-circuit', 'east-boulevard', { x: 6, y: 90 })),
  exitPoint('meridian-circuit', 'east'),
  anchor('service-concourse', 'walkWestReach').position,
  anchor('service-concourse', 'walkMid').position,
  anchor('service-concourse', 'walkEastReach').position,
  exitPoint('service-concourse', 'east'),
  levelPoint('service-yards', localInRoom('service-yards', 'yard-office', { x: 4, y: 12 })),
];

function walkTo(harness: Harness, target: TilePoint): void {
  harness.send({ type: 'world.walk', target });
  harness.ticksUntil(() => harness.player.path.length === 0);
  assert.deepEqual(harness.player.position, target);
}

function walkAlong(harness: Harness, route: readonly TilePoint[]): void {
  for (const waypoint of route) walkTo(harness, waypoint);
}

const placedAt = (location: CharacterRecord['location'], flags: readonly string[] = []) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location,
  flags: [...record.flags, ...flags],
});

describe('levels', () => {
  test('legacy locations convert to level coordinates', () => {
    assert.deepEqual(restoreLocation({ zoneId: 'hydroponics', position: localInRoom('hydroponics', 'platform') }, GAME_CONTENT), at('hydroponics', localInRoom('hydroponics', 'platform')));
  });

  test('legacy locations convert to the main-floor spawn when the zone is gone', () => {
    assert.deepEqual(restoreLocation({ zoneId: 'sector-nine', position: { x: 1, y: 1 } }, GAME_CONTENT), MAIN_FLOOR_SPAWN);
  });

  test('legacy locations on an unwalkable tile fall back to the main-floor spawn', () => {
    assert.deepEqual(restoreLocation({ zoneId: 'meridian-atrium', position: { x: 0, y: 0 } }, GAME_CONTENT), MAIN_FLOOR_SPAWN);
  });

  test('locations are stored district-local and restored to level coordinates', () => {
    const current = at('deepwatch', LIFT_ARRIVAL);
    assert.deepEqual(storeLocation(current, GAME_CONTENT), { districtId: 'deepwatch', position: LIFT_ARRIVAL });
    assert.deepEqual(restoreLocation(storeLocation(current, GAME_CONTENT), GAME_CONTENT), current);
  });

  test('the character repository saves district-local locations and loads level coordinates', () => {
    const database = openDatabase(':memory:');
    database.exec('PRAGMA foreign_keys = OFF;');
    const repository = new CharacterRepository(database, GAME_CONTENT);
    const created = createCharacterRecord({ ...createDefaultDraft(), name: 'Stored Operative' }, { id: 'character-9', accountId: 'account-9' }, GAME_CONTENT);
    const record = { ...created, location: at('hydroponics', localInRoom('hydroponics', 'platform')) };
    repository.insert(record);
    const row = database.prepare('SELECT record FROM characters WHERE id = ?').get('character-9') as { record: string };
    assert.deepEqual(JSON.parse(row.record).location, { districtId: 'hydroponics', position: localInRoom('hydroponics', 'platform') });
    assert.deepEqual(repository.findOwned('account-9', 'character-9')?.location, record.location);
  });

  test('a stored district location on an unwalkable tile falls back to the main-floor spawn', () => {
    assert.deepEqual(restoreLocation({ districtId: 'meridian-atrium', position: { x: 0, y: 0 } }, GAME_CONTENT), MAIN_FLOOR_SPAWN);
  });

  test('level-coordinate locations from before district-local storage pass through unchanged', () => {
    const current = at('deepwatch', LIFT_ARRIVAL);
    assert.deepEqual(restoreLocation(current, GAME_CONTENT), current);
  });

  test('walking from the Atrium into Hydroponics needs no teleport', () => {
    const harness = createHarness({ prepare: placedAt(WEST_GATE) });
    walkAlong(harness, ROUTE_TO_HYDROPONICS);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'hydroponics');
    assert.equal(harness.sink.messages.filter((message) => message.type === 'world.entered').length, 1);
  });

  test('a level-coordinate location that is no longer floor falls back to the main-floor spawn', () => {
    assert.deepEqual(restoreLocation({ levelId: 'main-floor', position: { x: 0, y: 0 } }, GAME_CONTENT), MAIN_FLOOR_SPAWN);
  });

  test('walking into a district charts it on the world map', () => {
    const harness = createHarness({ prepare: placedAt(WEST_GATE) });
    const charted = () => harness.sink.last('player.state')?.self.visitedDistricts ?? [];
    assert.ok(charted().includes('meridian-atrium'));
    assert.ok(!charted().includes('hydroponics'));
    walkAlong(harness, ROUTE_TO_HYDROPONICS);
    assert.ok(charted().includes('meridian-circuit'));
    assert.ok(charted().includes('verdance-concourse'));
    assert.ok(charted().includes('hydroponics'));
    assert.ok(!charted().includes('service-yards'));
  });

  test('characters saved before district tracking keep every district of the levels they had visited', () => {
    const harness = createHarness({ prepare: placedAt(WEST_GATE, ['visited:main-floor', 'visited:the-deep']) });
    const charted = harness.sink.last('player.state')?.self.visitedDistricts ?? [];
    for (const districtId of ['hydroponics', 'waterworks', 'deepwatch', 'furnace']) assert.ok(charted.includes(districtId), districtId);
    assert.ok(!charted.includes('undercroft'));
  });

  test('walking from the Atrium out to the Service Yards needs no teleport', () => {
    const harness = createHarness({ prepare: placedAt(EAST_GATE) });
    walkAlong(harness, ROUTE_TO_SERVICE_YARDS);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'service-yards');
    assert.equal(harness.sink.messages.filter((message) => message.type === 'world.entered').length, 1);
  });

  test('Deepwatch opens onto the Deep Concourse on foot, and a gated pressure door leads on', () => {
    const harness = createHarness({ prepare: placedAt(inRoom('deepwatch', 'stores'), ['clearance.signal-array']) });
    walkAlong(harness, [
      exitPoint('deepwatch', 'south'),
      levelPoint('deep-concourse', localInRoom('deep-concourse', 'south-span')),
      anchor('deep-concourse', 'southSpan').position,
      anchor('deep-concourse', 'arrayDoor').position,
    ]);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'deep-concourse');
    harness.interactWithObject('dc-array-door/0,0');
    harness.ticksUntil(() => harness.player.path.length === 0);
    assert.equal(harness.player.levelId, 'the-deep');
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'signal-array');
  });

  test('a pressure door stays shut without clearance', () => {
    const harness = createHarness({ prepare: placedAt(anchor('deep-concourse', 'cryovaultDoor')) });
    harness.interactWithObject('dc-cryovault-door/0,0');
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'deep-concourse');
    assert.match(harness.sink.last('notice')?.text ?? '', /COLD STORAGE SEALED/);
  });

  test('a cleared player walks straight through a joined pressure door, and it stays open for them alone', () => {
    const harness = createHarness({ prepare: placedAt(anchor('deep-concourse', 'cryovaultDoor'), ['clearance.cryovault']) });
    walkTo(harness, anchor('cryovault', 'entrance').position);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'cryovault');
    assert.ok(harness.sink.last('player.state')?.self.openDoors.includes('cryovault-door'));

    const level = harness.gameplay.world.levelOf(harness.player);
    const door = exitPoint('deep-concourse', 'cryovault');
    assert.equal(level.grid.isWalkable(door), false, 'the shared grid keeps the door shut for everyone else');
    assert.equal(level.creatureGrid.isWalkable(door), false, 'creatures never pass a door');
  });

  test('a door you have opened stays open after the key is gone', () => {
    const harness = createHarness({ prepare: placedAt(anchor('deep-concourse', 'cryovaultDoor'), ['clearance.cryovault']) });
    harness.interactWithObject('dc-cryovault-door/0,0');
    harness.ticksUntil(() => harness.player.path.length === 0);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'cryovault');
    harness.player.update({ flags: harness.player.record.flags.filter((flag) => flag !== 'clearance.cryovault') });
    walkTo(harness, anchor('deep-concourse', 'cryovaultDoor').position);
  });

  test('Deepwatch reaches the Furnace Causeway on foot', () => {
    const harness = createHarness({ prepare: placedAt(inRoom('deepwatch', 'concourse')) });
    walkAlong(harness, [
      exitPoint('deepwatch', 'north'),
      levelPoint('deep-concourse', localInRoom('deep-concourse', 'north-span')),
      anchor('deep-concourse', 'northSpan').position,
      anchor('deep-concourse', 'causewayGate').position,
      levelPoint('furnace-causeway', localInRoom('furnace-causeway', 'causeway')),
    ]);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'furnace-causeway');
  });

  test('a saved position on an unwalkable tile spawns nearby in the same district', () => {
    const inTheTank = localInRoom('intake-wing', 'observation');
    const harness = createHarness({ prepare: placedAt(at('intake-wing', inTheTank)) });
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'intake-wing');
    const target = levelPoint('intake-wing', inTheTank);
    assert.ok(Math.max(Math.abs(harness.player.position.x - target.x), Math.abs(harness.player.position.y - target.y)) <= 3);
  });

  test('incapacitation in the Intake Wing recovers in the Intake Wing medbay', () => {
    const harness = createHarness({ prepare: placedAt(anchor('intake-wing', 'observationFloor')) });
    harness.gameplay.recoverIncapacitated(harness.player);
    assert.equal(harness.gameplay.world.districtOf(harness.player), 'intake-wing');
    assert.deepEqual(harness.player.position, anchor('intake-wing', 'recovery').position);
  });
});
