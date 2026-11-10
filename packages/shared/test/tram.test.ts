import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findTramIssues, findWorldDesignIssues, GAME_CONTENT, linesThrough, stationAt, tramLineBetween, tramBoardingRefusal, tramRideTicks, tramStops, TRAM_MIN_RIDE_TICKS, type GameContent, type TileKindId, type TilePoint } from '../src/index.ts';

const network = GAME_CONTENT.tram;

test('stops count hops along a line through the origin and never change lines', () => {
  assert.equal(tramStops(network, 'atrium-transit', 'verdance-platform'), 1);
  assert.equal(tramStops(network, 'verdance-platform', 'yards-depot'), 2);
  assert.equal(tramStops(network, 'deepwatch-platform', 'furnace-lock'), 4);
  assert.equal(tramStops(network, 'intake-transit', 'verdance-platform'), null);
  assert.equal(tramStops(network, 'atrium-transit', 'deepwatch-platform'), null);
  assert.equal(tramStops(network, 'atrium-transit', 'nowhere'), null);
});

test('a station tram serves only the lines through that station', () => {
  assert.deepEqual(linesThrough(network, 'atrium-transit').map((line) => line.id), ['intake-shuttle', 'meridian-line']);
  assert.deepEqual(linesThrough(network, 'yards-depot').map((line) => line.id), ['meridian-line']);
  assert.equal(tramLineBetween(network, 'atrium-transit', 'intake-transit')?.id, 'intake-shuttle');
});

test('rides take at least the minimum and two ticks per stop beyond it', () => {
  assert.equal(tramRideTicks(1), TRAM_MIN_RIDE_TICKS);
  assert.equal(tramRideTicks(6), 12);
});

test('stationAt finds the station whose area holds the point', () => {
  const atrium = network.stations.get('atrium-transit');
  assert.ok(atrium);
  assert.equal(stationAt(network, 'main-floor', atrium.platformPoint)?.id, 'atrium-transit');
  assert.equal(stationAt(network, 'the-deep', atrium.platformPoint), undefined);
});

test('boarding needs a platform, a known destination and a different station', () => {
  const origin = network.stations.get('atrium-transit');
  const knows = () => true;
  assert.match(tramBoardingRefusal(network, { origin: undefined, destinationId: 'verdance-platform', knowsStation: knows }) ?? '', /platform/);
  assert.match(tramBoardingRefusal(network, { origin, destinationId: 'verdance-platform', knowsStation: () => false }) ?? '', /not found/);
  assert.match(tramBoardingRefusal(network, { origin, destinationId: 'atrium-transit', knowsStation: knows }) ?? '', /already/);
  assert.match(tramBoardingRefusal(network, { origin, destinationId: 'furnace-lock', knowsStation: knows }) ?? '', /does not run/);
  assert.equal(tramBoardingRefusal(network, { origin, destinationId: 'yards-depot', knowsStation: knows }), null);
});

test('findTramIssues reports a station without a stop and a line with an unknown station', () => {
  const content: GameContent = {
    ...GAME_CONTENT,
    tram: {
      stations: network.stations,
      lines: new Map([...network.lines, ['ghost-line', { id: 'ghost-line', name: 'Ghost', color: '#fff', stations: ['atrium-transit', 'ghost'] }]]),
    },
    worldObjects: new Map([...GAME_CONTENT.worldObjects].filter(([id]) => !id.startsWith('tram-car-'))),
  };
  const issues = findTramIssues(content);
  assert.ok(issues.some((issue) => issue.includes('"atrium-transit" has no tram stop')));
  assert.ok(issues.some((issue) => issue.includes('unknown station "ghost"')));
});

test('findTramIssues reports a station with a second tram car', () => {
  const level = GAME_CONTENT.levels.get('main-floor');
  assert.ok(level);
  const extra = level.objects.filter((object) => object.instanceId.startsWith('atrium-tram-car/')).map((object) => ({ ...object, instanceId: object.instanceId.replace('atrium-tram-car', 'spare-car') }));
  const content: GameContent = { ...GAME_CONTENT, levels: new Map([...GAME_CONTENT.levels, ['main-floor', { ...level, objects: [...level.objects, ...extra] }]]) };
  assert.ok(findTramIssues(content).some((issue) => issue.includes('"atrium-transit" has 2 tram cars')));
});

test('every station car sits on a track that runs into tunnels, with a platform on one side', () => {
  assert.deepEqual(findTramIssues(GAME_CONTENT), []);
  for (const station of network.stations.values()) {
    const level = GAME_CONTENT.levels.get(station.levelId);
    assert.ok(level);
    const car = level.objects.filter((object) => object.instanceId.includes('tram-car/') && object.position.x >= station.area.x && object.position.y >= station.area.y && object.position.x < station.area.x + station.area.width && object.position.y < station.area.y + station.area.height);
    assert.ok(car.length > 0, station.id);
    for (const piece of car) assert.equal(level.layout.tileAt(piece.position), 'track', `${station.id} ${piece.instanceId}`);
  }
});

test('the overworld lines run on drawn track from each station to the next', () => {
  assert.deepEqual(findWorldDesignIssues(GAME_CONTENT).filter((issue) => issue.startsWith('tram line')), []);
});

test('a gap in the track between two stations is reported', () => {
  const level = GAME_CONTENT.levels.get('main-floor');
  assert.ok(level);
  const gap = new Set([0, 1].flatMap((dx) => [45, 46].map((y) => level.layout.toLevelPoint('service-concourse', { x: 98 + dx, y }))).map((point) => `${point.x},${point.y}`));
  const tileAt = (point: TilePoint): TileKindId => (gap.has(`${point.x},${point.y}`) ? 'wall' : level.layout.tileAt(point));
  const layout = { ...level.layout, tileAt };
  const content: GameContent = { ...GAME_CONTENT, levels: new Map([...GAME_CONTENT.levels, ['main-floor', { ...level, layout }]]) };
  const issues = findWorldDesignIssues(content).filter((issue) => issue.startsWith('tram line'));
  assert.deepEqual(issues.map((issue) => issue.match(/"[^"]+" to "[^"]+"/)?.[0]), ['"atrium-transit" to "yards-depot"', '"yards-depot" to "calder-platform"']);
});
