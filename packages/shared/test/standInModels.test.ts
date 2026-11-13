import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';

const SINGLES = [
  'market-terminal', 'market-mailbox', 'council-terminal', 'curator-ledger', 'relay-console', 'outbox-terminal', 'reactor-console', 'waterworks-assay',
  'diagnostic-terminal', 'halvorsen-terminal', 'deeps-time-clock', 'charter-lectern', 'cellar-ledger', 'sector-three-seal', 'issue-locker', 'sample-cabinet',
  'buffer-stop', 'platform-gate', 'departure-board',
];
const PAIRS: readonly (readonly [string, string])[] = [['return-chute', 'office-return-chute'], ['anm-0447-lantern', 'lantern-echo']];
const GENERIC = new Set(['terminal', 'kiosk', 'anomaly', 'lantern', 'locker', 'crate', 'bulkheadLeafLeft']);

const modelOf = (id: string): string => {
  const definition = GAME_CONTENT.worldObjects.get(id);
  assert.ok(definition, `${id} is not defined`);
  return definition.model;
};

test('each stand-in object has a model of its own', () => {
  const owners = new Map<string, string>();
  for (const id of [...SINGLES, ...PAIRS.map(([first]) => first)]) {
    const model = modelOf(id);
    assert.ok(!GENERIC.has(model), `${id} still uses the generic ${model} model`);
    const other = owners.get(model);
    assert.equal(other, undefined, `${id} shares the ${model} model with ${other}`);
    owners.set(model, id);
  }
  for (const [first, second] of PAIRS) {
    assert.equal(modelOf(second), modelOf(first), `${second} should share ${first}'s model`);
    assert.ok(!GENERIC.has(modelOf(second)), `${second} uses a generic model`);
  }
});
