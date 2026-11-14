import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TRAM_BOARDING_TICKS, tramStationFlag, type CharacterRecord } from '@containment/shared';
import { anchorPoint, at, createHarness, districtOf, levelPoint, type Harness, localInRoom, CONTENT } from './support/testHarness.ts';

const onPlatform = (districtId: string, local: { x: number; y: number }, stations: readonly string[]) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location: at(districtId, local),
  flags: [...record.flags, ...stations.map(tramStationFlag)],
});

const HUB_PLATFORM = anchorPoint('fx-hub', 'tramPlatform');

function stationPoint(stationId: string) {
  const station = CONTENT.tram.stations.get(stationId);
  assert.ok(station);
  return station.platformPoint;
}

function boardAndDepart(harness: Harness, destinationStationId: string): void {
  harness.send({ type: 'tram.board', destinationStationId });
  assert.equal(harness.player.activity?.kind, 'tram');
  harness.ticksUntil(() => harness.sink.last('tram.departed') !== undefined, TRAM_BOARDING_TICKS + 2);
}

test('standing in a station area discovers that station', () => {
  const harness = createHarness({ prepare: onPlatform('fx-hub', HUB_PLATFORM, []) });
  assert.ok(harness.player.hasFlag(tramStationFlag('hub-station')));
  harness.gameplay.tick();
  assert.ok(harness.sink.last('player.state')?.self.discoveredStations.includes('hub-station'));
});

test('boarding a tram car opens the map for its own station', () => {
  const harness = createHarness({ prepare: onPlatform('fx-hub', HUB_PLATFORM, []) });
  harness.interactWithObject('hub-tram-car/2,0');
  assert.equal(harness.sink.last('tram.mapOpened')?.stationId, 'hub-station');
});

test('a ride departs, keeps the rider still and arrives on the destination platform', () => {
  const harness = createHarness({ prepare: onPlatform('fx-hub', HUB_PLATFORM, ['outpost-station']) });
  boardAndDepart(harness, 'outpost-station');
  const departed = harness.sink.last('tram.departed');
  assert.equal(departed?.rideTicks, 10);
  assert.ok(harness.player.isRidingTram);

  harness.send({ type: 'world.walk', target: levelPoint('fx-hub', localInRoom('fx-hub', 'plaza')) });
  assert.deepEqual(harness.player.path, []);

  harness.ticksUntil(() => harness.sink.last('tram.arrived') !== undefined, 12);
  assert.deepEqual(harness.player.position, stationPoint('outpost-station'));
  assert.equal(districtOf(harness.player), 'fx-outpost');
  assert.equal(harness.player.activity, null);
});

test('an undiscovered destination is refused', () => {
  const harness = createHarness({ prepare: onPlatform('fx-hub', HUB_PLATFORM, []) });
  harness.send({ type: 'tram.board', destinationStationId: 'outpost-station' });
  assert.equal(harness.player.activity, null);
  assert.match(harness.sink.last('notice')?.text ?? '', /not found that station/);
});

test('boarding away from a platform is refused', () => {
  const harness = createHarness({ prepare: onPlatform('fx-hub', localInRoom('fx-hub', 'plaza'), ['hub-station', 'outpost-station']) });
  harness.send({ type: 'tram.board', destinationStationId: 'outpost-station' });
  assert.equal(harness.player.activity, null);
  assert.match(harness.sink.last('notice')?.text ?? '', /tram platform/);
});

test('walking before departure cancels the ride', () => {
  const harness = createHarness({ prepare: onPlatform('fx-hub', HUB_PLATFORM, ['outpost-station']) });
  harness.send({ type: 'tram.board', destinationStationId: 'outpost-station' });
  harness.send({ type: 'world.walk', target: levelPoint('fx-hub', localInRoom('fx-hub', 'plaza')) });
  assert.equal(harness.player.activity, null);
  for (let tick = 0; tick < 20; tick++) harness.gameplay.tick();
  assert.equal(harness.sink.last('tram.departed'), undefined);
  assert.equal(districtOf(harness.player), 'fx-hub');
});

test('taking damage before departure cancels the ride', () => {
  const harness = createHarness({ prepare: onPlatform('fx-hub', HUB_PLATFORM, ['outpost-station']) });
  harness.send({ type: 'tram.board', destinationStationId: 'outpost-station' });
  harness.gameplay.onDamaged(harness.player);
  assert.equal(harness.player.activity, null);
  assert.match(harness.sink.last('notice')?.text ?? '', /stepped back/);
});

test('leaving mid-ride saves the rider at the destination', () => {
  const harness = createHarness({ prepare: onPlatform('fx-hub', HUB_PLATFORM, ['outpost-station']) });
  boardAndDepart(harness, 'outpost-station');
  harness.gameplay.leaveWorld(harness.player);
  assert.deepEqual(harness.saved.at(-1)?.location, { levelId: 'fx-floor', position: stationPoint('outpost-station') });
});

