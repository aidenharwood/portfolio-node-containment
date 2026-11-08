import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findTramIssues, GAME_CONTENT, stationAt, tramBoardingRefusal, tramRideTicks, tramStops, TRAM_MIN_RIDE_TICKS, type GameContent } from '../src/index.ts';

const network = GAME_CONTENT.tram;

test('stops count hops along a line and through interchanges', () => {
  assert.equal(tramStops(network, 'atrium-transit', 'verdance-platform'), 1);
  assert.equal(tramStops(network, 'intake-transit', 'verdance-platform'), 2);
  assert.equal(tramStops(network, 'intake-transit', 'furnace-lock'), 6);
  assert.equal(tramStops(network, 'atrium-transit', 'nowhere'), null);
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
  assert.equal(tramBoardingRefusal(network, { origin, destinationId: 'furnace-lock', knowsStation: knows }), null);
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
