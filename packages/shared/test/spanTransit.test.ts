import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findTramIssues, GAME_CONTENT, isStationKnown, tramStops } from '../src/index.ts';

const network = GAME_CONTENT.tram;

test('the Span Transit runs the Ring Line and the Spindle Funicular through six terminals', () => {
  assert.deepEqual([...network.lines.keys()], ['ring-line', 'spindle-funicular']);
  assert.equal(network.stations.size, 6);
  assert.deepEqual(findTramIssues(GAME_CONTENT), []);
  for (const station of network.stations.values()) assert.equal(station.levelId, 'overworld', station.id);
});

test('a recruit knows only Kestrel Commons until they walk into another terminal', () => {
  const known = [...network.stations.keys()].filter((stationId) => isStationKnown(network, stationId, () => false));
  assert.deepEqual(known, ['kestrel-commons-station']);
});

test('the Choir changes between the Ring Line and the Funicular', () => {
  assert.equal(tramStops(network, 'kestrel-commons-station', 'choir-halt'), 4);
  assert.equal(tramStops(network, 'choir-halt', 'last-post-funicular'), 1);
  assert.equal(tramStops(network, 'kestrel-commons-station', 'last-post-funicular'), null);
});
