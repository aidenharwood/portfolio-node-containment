import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SHORE_REACH, shoreDepths } from '../src/render/world/liquidSurface.ts';

const close = (actual: number | undefined, expected: number): void => assert.ok(actual !== undefined && Math.abs(actual - expected) < 1e-5, `${actual} is not ${expected}`);

test('water is shallow at the bank and deepens a tile per tile out to the reach', () => {
  const region = { x: 0, y: 0, width: 16, height: 4 };
  const depths = shoreDepths((x) => x >= 0, region);
  const at = (cx: number): number | undefined => depths[2 * (region.width + 1) + cx];
  close(at(0), 0);
  close(at(1), 1);
  close(at(3), 3);
  close(at(12), SHORE_REACH);
  close(at(16), SHORE_REACH);
});

test('a pond is deepest in its middle and neighbouring chunks agree on the corners they share', () => {
  const pond = (x: number, y: number): boolean => Math.hypot(x - 16, y - 16) < 13;
  const west = shoreDepths(pond, { x: 0, y: 0, width: 16, height: 32 });
  const east = shoreDepths(pond, { x: 16, y: 0, width: 16, height: 32 });
  for (let cy = 0; cy <= 32; cy++) close(west[cy * 17 + 16], east[cy * 17] as number);
  const middle = west[16 * 17 + 16] as number;
  for (const depth of west) assert.ok(depth <= middle + 1e-5);
  assert.ok(middle > 6);
  close(west[16 * 17 + 3], 0);
});
