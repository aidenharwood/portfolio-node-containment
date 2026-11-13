import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findTramIssues, findWorldDesignIssues, GAME_CONTENT, MAX_PLATFORM_DISTANCE_FROM_TRACK, linesThrough, stationAt, tramLineBetween, tramBoardingRefusal, tramRideTicks, tramStops, TRAM_MIN_RIDE_TICKS, type GameContent, type TileKindId, type TilePoint } from '../src/index.ts';

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

test('every station car sits on track that runs on through its platform', () => {
  assert.deepEqual(findTramIssues(GAME_CONTENT), []);
  for (const station of network.stations.values()) {
    const level = GAME_CONTENT.levels.get(station.levelId);
    assert.ok(level);
    const car = level.objects.filter((object) => object.instanceId.includes('tram-car/') && object.position.x >= station.area.x && object.position.y >= station.area.y && object.position.x < station.area.x + station.area.width && object.position.y < station.area.y + station.area.height);
    assert.ok(car.length > 0, station.id);
    for (const piece of car) assert.equal(level.layout.tileAt(piece.position), 'track', `${station.id} ${piece.instanceId}`);
  }
});

test('every line runs on connected drawn track through its stations', () => {
  assert.deepEqual(findWorldDesignIssues(GAME_CONTENT).filter((issue) => issue.startsWith('tram line')), []);
});

test('a station cut off from the track is reported', () => {
  const level = GAME_CONTENT.levels.get('main-floor');
  const station = network.stations.get('yards-depot');
  assert.ok(level);
  assert.ok(station);
  const tileAt = (point: TilePoint): TileKindId => {
    const kind = level.layout.tileAt(point);
    return kind === 'track' && Math.max(Math.abs(point.x - station.platformPoint.x), Math.abs(point.y - station.platformPoint.y)) <= MAX_PLATFORM_DISTANCE_FROM_TRACK ? 'wall' : kind;
  };
  const layout = { ...level.layout, tileAt };
  const content: GameContent = { ...GAME_CONTENT, levels: new Map([...GAME_CONTENT.levels, ['main-floor', { ...level, layout }]]) };
  const issues = findWorldDesignIssues(content).filter((issue) => issue.startsWith('tram line'));
  assert.ok(issues.some((issue) => issue.includes('no drawn track runs from') && issue.includes('"yards-depot"')));
  assert.ok(!issues.some((issue) => issue.includes('closed loop')));
});

function roomsWithBareTrack(levelId: string, districtIds?: readonly string[], wantBridged = false): string[] {
  const level = GAME_CONTENT.levels.get(levelId);
  assert.ok(level);
  const bridgePieces = new Set(level.objects.filter((object) => object.objectId.startsWith('bridge-')).map((object) => `${object.position.x},${object.position.y}`));
  const bridged = (point: TilePoint): boolean => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => bridgePieces.has(`${point.x + (dx as number)},${point.y + (dy as number)}`));
  const bare: string[] = [];
  for (const placement of level.districts) {
    if (districtIds && !districtIds.includes(placement.districtId)) continue;
    const rooms = GAME_CONTENT.districts.get(placement.districtId)?.rooms ?? {};
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

const roomsWithBridgedTrack = (levelId: string): string[] => roomsWithBareTrack(levelId, undefined, true);

test('the trunk crosses rooms only under bridges', () => {
  assert.deepEqual(roomsWithBareTrack('main-floor'), []);
  assert.ok(roomsWithBridgedTrack('main-floor').length > 0);
});

test('the Deep ring crosses rooms only under bridges', () => {
  assert.deepEqual(roomsWithBareTrack('the-deep', ['deep-concourse', 'deepwatch', 'furnace-causeway', 'cryovault', 'signal-array']), []);
  assert.ok(roomsWithBridgedTrack('the-deep').length > 0);
});
