import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findTramIssues, findWorldDesignIssues, MAX_PLATFORM_DISTANCE_FROM_TRACK, linesThrough, stationAt, tramLineBetween, tramBoardingRefusal, tramRideTicks, tramStops, TRAM_MIN_RIDE_TICKS, type GameContent, type TileKindId, type TilePoint } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const network = FIXTURE_CONTENT.tram;

const outpost = network.stations.get('outpost-station');
assert.ok(outpost);
const far = { ...outpost, id: 'far-station', name: 'Far Station' };
const branched = {
  definitions: [...network.definitions, far],
  stations: new Map([...network.stations, ['far-station', far]]),
  lines: new Map([...network.lines, ['branch-line', { id: 'branch-line', name: 'Branch', color: '#fff', stations: ['outpost-station', 'far-station'] }]]),
};

test('stops count hops along a line through the origin and never change lines', () => {
  assert.equal(tramStops(branched, 'hub-station', 'outpost-station'), 1);
  assert.equal(tramStops(branched, 'outpost-station', 'far-station'), 1);
  assert.equal(tramStops(branched, 'hub-station', 'far-station'), null);
  assert.equal(tramStops(branched, 'hub-station', 'nowhere'), null);
});

test('a station tram serves only the lines through that station', () => {
  assert.deepEqual(linesThrough(branched, 'outpost-station').map((line) => line.id), ['test-line', 'branch-line']);
  assert.deepEqual(linesThrough(branched, 'hub-station').map((line) => line.id), ['test-line']);
  assert.equal(tramLineBetween(branched, 'outpost-station', 'far-station')?.id, 'branch-line');
});

test('rides take at least the minimum and two ticks per stop beyond it', () => {
  assert.equal(tramRideTicks(1), TRAM_MIN_RIDE_TICKS);
  assert.equal(tramRideTicks(6), 12);
});

test('stationAt finds the station whose area holds the point', () => {
  const hub = network.stations.get('hub-station');
  assert.ok(hub);
  assert.equal(stationAt(network, 'fx-floor', hub.platformPoint)?.id, 'hub-station');
  assert.equal(stationAt(network, 'fx-depths', hub.platformPoint), undefined);
});

test('boarding needs a platform, a known destination and a different station', () => {
  const origin = branched.stations.get('hub-station');
  const knows = () => true;
  assert.match(tramBoardingRefusal(branched, { origin: undefined, destinationId: 'outpost-station', knowsStation: knows }) ?? '', /platform/);
  assert.match(tramBoardingRefusal(branched, { origin, destinationId: 'outpost-station', knowsStation: () => false }) ?? '', /not found/);
  assert.match(tramBoardingRefusal(branched, { origin, destinationId: 'hub-station', knowsStation: knows }) ?? '', /already/);
  assert.match(tramBoardingRefusal(branched, { origin, destinationId: 'far-station', knowsStation: knows }) ?? '', /does not run/);
  assert.equal(tramBoardingRefusal(branched, { origin, destinationId: 'outpost-station', knowsStation: knows }), null);
});

test('findTramIssues reports a station without a stop and a line with an unknown station', () => {
  const content: GameContent = {
    ...FIXTURE_CONTENT,
    tram: {
      definitions: network.definitions,
      stations: network.stations,
      lines: new Map([...network.lines, ['ghost-line', { id: 'ghost-line', name: 'Ghost', color: '#fff', stations: ['hub-station', 'ghost'] }]]),
    },
    worldObjects: new Map([...FIXTURE_CONTENT.worldObjects].filter(([id]) => !id.startsWith('tram-car-'))),
  };
  const issues = findTramIssues(content);
  assert.ok(issues.some((issue) => issue.includes('"hub-station" has no tram stop')));
  assert.ok(issues.some((issue) => issue.includes('unknown station "ghost"')));
});

test('findTramIssues reports a station with a second tram car', () => {
  const level = FIXTURE_CONTENT.levels.get('fx-floor');
  assert.ok(level);
  const extra = level.objects.filter((object) => object.instanceId.startsWith('hub-tram-car/')).map((object) => ({ ...object, instanceId: object.instanceId.replace('hub-tram-car', 'spare-car') }));
  const content: GameContent = { ...FIXTURE_CONTENT, levels: new Map([...FIXTURE_CONTENT.levels, ['fx-floor', { ...level, objects: [...level.objects, ...extra] }]]) };
  assert.ok(findTramIssues(content).some((issue) => issue.includes('"hub-station" has 2 tram cars')));
});

test('every station car sits on track that runs on through its platform', () => {
  assert.deepEqual(findTramIssues(FIXTURE_CONTENT), []);
  for (const station of network.stations.values()) {
    const level = FIXTURE_CONTENT.levels.get(station.levelId);
    assert.ok(level);
    const car = level.objects.filter((object) => object.instanceId.includes('tram-car/') && object.position.x >= station.area.x && object.position.y >= station.area.y && object.position.x < station.area.x + station.area.width && object.position.y < station.area.y + station.area.height);
    assert.ok(car.length > 0, station.id);
    for (const piece of car) assert.equal(level.layout.tileAt(piece.position), 'track', `${station.id} ${piece.instanceId}`);
  }
});

test('every line runs on connected drawn track through its stations', () => {
  assert.deepEqual(findWorldDesignIssues(FIXTURE_CONTENT).filter((issue) => issue.startsWith('tram line')), []);
});

test('a station cut off from the track is reported', () => {
  const level = FIXTURE_CONTENT.levels.get('fx-floor');
  const station = network.stations.get('outpost-station');
  assert.ok(level);
  assert.ok(station);
  const tileAt = (point: TilePoint): TileKindId => {
    const kind = level.layout.tileAt(point);
    return kind === 'track' && Math.max(Math.abs(point.x - station.platformPoint.x), Math.abs(point.y - station.platformPoint.y)) <= MAX_PLATFORM_DISTANCE_FROM_TRACK ? 'wall' : kind;
  };
  const layout = { ...level.layout, tileAt };
  const content: GameContent = { ...FIXTURE_CONTENT, levels: new Map([...FIXTURE_CONTENT.levels, ['fx-floor', { ...level, layout }]]) };
  const issues = findWorldDesignIssues(content).filter((issue) => issue.startsWith('tram line'));
  assert.ok(issues.some((issue) => issue.includes('no drawn track runs from') && issue.includes('"outpost-station"')));
  assert.ok(!issues.some((issue) => issue.includes('closed loop')));
});

function roomsWithBareTrack(levelId: string, districtIds?: readonly string[], wantBridged = false): string[] {
  const level = FIXTURE_CONTENT.levels.get(levelId);
  assert.ok(level);
  const bridgePieces = new Set(level.objects.filter((object) => object.objectId.startsWith('bridge-')).map((object) => `${object.position.x},${object.position.y}`));
  const bridged = (point: TilePoint): boolean => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => bridgePieces.has(`${point.x + (dx as number)},${point.y + (dy as number)}`));
  const bare: string[] = [];
  for (const placement of level.districts) {
    if (districtIds && !districtIds.includes(placement.districtId)) continue;
    const rooms = FIXTURE_CONTENT.districts.get(placement.districtId)?.rooms ?? {};
    for (const [roomId, rect] of Object.entries(rooms)) {
      if (roomId === 'tram-terminal') continue;
      for (let y = rect.y; y < rect.y + rect.height; y++) {
        for (let x = rect.x; x < rect.x + rect.width; x++) {
          const point = level.layout.toLevelPoint(placement.districtId, { x, y });
          if (level.layout.tileAt(point) === 'track' && bridged(point) === wantBridged) bare.push(`${placement.districtId}/${roomId} ${x},${y}`);
        }
      }
    }
  }
  return [...new Set(bare.map((entry) => entry.split(' ')[0] as string))];
}

test('track crosses no room but a terminal', () => {
  assert.deepEqual(roomsWithBareTrack('fx-floor'), []);
});
