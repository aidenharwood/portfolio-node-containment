import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, TRAM_BOARDING_TICKS, tramStationFlag, visitedLevelFlag, type CharacterRecord } from '@containment/shared';
import { at, createHarness, districtOf, levelPoint, type Harness } from './support/testHarness.ts';

const onPlatform = (districtId: string, local: { x: number; y: number }, stations: readonly string[]) => (record: CharacterRecord): CharacterRecord => ({
  ...record,
  location: at(districtId, local),
  flags: [...record.flags, ...stations.map(tramStationFlag)],
});

const ATRIUM_PLATFORM = { x: 6, y: 30 };

function stationPoint(stationId: string) {
  const station = GAME_CONTENT.tram.stations.get(stationId);
  assert.ok(station);
  return station.platformPoint;
}

function boardAndDepart(harness: Harness, destinationStationId: string): void {
  harness.send({ type: 'tram.board', destinationStationId });
  assert.equal(harness.player.activity?.kind, 'tram');
  harness.ticksUntil(() => harness.sink.last('tram.departed') !== undefined, TRAM_BOARDING_TICKS + 2);
}

test('standing in a station area discovers that station', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, []) });
  assert.ok(harness.player.hasFlag(tramStationFlag('atrium-transit')));
  harness.gameplay.tick();
  assert.ok(harness.sink.last('player.state')?.self.discoveredStations.includes('atrium-transit'));
});

test('boarding a tram car opens the map for its own station', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, []) });
  harness.interactWithObject('atrium-tram-car/2,0');
  assert.equal(harness.sink.last('tram.mapOpened')?.stationId, 'atrium-transit');
});

test('a ride departs, keeps the rider still and arrives on the destination platform', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, ['verdance-platform']) });
  boardAndDepart(harness, 'verdance-platform');
  const departed = harness.sink.last('tram.departed');
  assert.equal(departed?.rideTicks, 10);
  assert.ok(harness.player.isRidingTram);

  harness.send({ type: 'world.walk', target: levelPoint('meridian-atrium', { x: 8, y: 28 }) });
  assert.deepEqual(harness.player.path, []);

  harness.ticksUntil(() => harness.sink.last('tram.arrived') !== undefined, 12);
  assert.deepEqual(harness.player.position, stationPoint('verdance-platform'));
  assert.equal(districtOf(harness.player), 'hydroponics');
  assert.equal(harness.player.activity, null);
});

test('a ride to another level re-enters on that level and marks it visited', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, ['deepwatch-platform']) });
  boardAndDepart(harness, 'deepwatch-platform');
  harness.ticksUntil(() => harness.sink.last('tram.arrived') !== undefined, 12);
  assert.equal(harness.player.levelId, 'the-deep');
  assert.equal(harness.sink.last('world.entered')?.levelId, 'the-deep');
  assert.ok(harness.player.hasFlag(visitedLevelFlag('the-deep')));
});

test('stops on other lines are reached through interchanges', () => {
  const harness = createHarness({ prepare: onPlatform('intake-wing', { x: 52, y: 19 }, ['deepwatch-platform']) });
  boardAndDepart(harness, 'deepwatch-platform');
  assert.equal(harness.sink.last('tram.departed')?.rideTicks, 10);
  harness.ticksUntil(() => harness.sink.last('tram.arrived') !== undefined, 12);
  assert.equal(districtOf(harness.player), 'deepwatch');
});

test('an undiscovered destination is refused', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, []) });
  harness.send({ type: 'tram.board', destinationStationId: 'deepwatch-platform' });
  assert.equal(harness.player.activity, null);
  assert.match(harness.sink.last('notice')?.text ?? '', /not found that station/);
});

test('boarding away from a platform is refused', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', { x: 22, y: 18 }, ['atrium-transit', 'verdance-platform']) });
  harness.send({ type: 'tram.board', destinationStationId: 'verdance-platform' });
  assert.equal(harness.player.activity, null);
  assert.match(harness.sink.last('notice')?.text ?? '', /tram platform/);
});

test('walking before departure cancels the ride', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, ['verdance-platform']) });
  harness.send({ type: 'tram.board', destinationStationId: 'verdance-platform' });
  harness.send({ type: 'world.walk', target: levelPoint('meridian-atrium', { x: 8, y: 28 }) });
  assert.equal(harness.player.activity, null);
  for (let tick = 0; tick < 20; tick++) harness.gameplay.tick();
  assert.equal(harness.sink.last('tram.departed'), undefined);
  assert.equal(districtOf(harness.player), 'meridian-atrium');
});

test('taking damage before departure cancels the ride', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, ['verdance-platform']) });
  harness.send({ type: 'tram.board', destinationStationId: 'verdance-platform' });
  harness.gameplay.onDamaged(harness.player);
  assert.equal(harness.player.activity, null);
  assert.match(harness.sink.last('notice')?.text ?? '', /stepped back/);
});

test('leaving mid-ride saves the rider at the destination', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, ['verdance-platform']) });
  boardAndDepart(harness, 'verdance-platform');
  harness.gameplay.leaveWorld(harness.player);
  assert.deepEqual(harness.saved.at(-1)?.location, { levelId: 'main-floor', position: stationPoint('verdance-platform') });
});

test('the Meridian Line runs from the Atrium out to the Service Yards depot', () => {
  const harness = createHarness({ prepare: onPlatform('meridian-atrium', ATRIUM_PLATFORM, ['yards-depot']) });
  boardAndDepart(harness, 'yards-depot');
  harness.ticksUntil(() => harness.sink.last('tram.arrived') !== undefined, 12);
  assert.equal(districtOf(harness.player), 'service-yards');
  assert.deepEqual(harness.player.position, stationPoint('yards-depot'));
});
