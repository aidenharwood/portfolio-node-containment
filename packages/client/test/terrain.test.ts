import '@containment/shared/fixtures';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { parseLayout, parseTileLayout, type DistrictLayout } from '@containment/shared';
import { Vector3 } from 'three';
import { paintHeights, type EditResult } from '../src/editor/edits.ts';
import { groundAt, rayGround } from '../src/render/world/ground.ts';
import { STEP_HEIGHT } from '../src/render/world/worldScale.ts';

const FIXTURE = new URL('../../shared/test/fixtures/sample-layout.json', import.meta.url);
const sample = (): DistrictLayout => parseLayout(JSON.parse(readFileSync(FIXTURE, 'utf8')));

const ok = (result: EditResult): DistrictLayout => {
  assert.ok(result.ok, result.ok ? '' : result.reason);
  return result.layout;
};

describe('height brush', () => {
  test('raising twice climbs two steps, levelling sets one and reset clears the brush', () => {
    const once = ok(paintHeights(sample(), [{ x: 5, y: 5 }], 'raise', 0));
    assert.deepEqual(once.heights, [{ x: 5, y: 5, height: 1 }]);
    const twice = ok(paintHeights(once, [{ x: 5, y: 5 }], 'raise', 0));
    assert.deepEqual(twice.heights, [{ x: 5, y: 5, height: 2 }]);
    const levelled = ok(paintHeights(twice, [{ x: 5, y: 5 }, { x: 6, y: 5 }], 'level', 1));
    assert.deepEqual(levelled.heights, [{ x: 5, y: 5, height: 1 }, { x: 6, y: 5, height: 1 }]);
    const lowered = ok(paintHeights(levelled, [{ x: 6, y: 5 }], 'lower', 0));
    assert.deepEqual(lowered.heights, [{ x: 5, y: 5, height: 1 }, { x: 6, y: 5, height: 0 }]);
    assert.equal(ok(paintHeights(lowered, [{ x: 5, y: 5 }, { x: 6, y: 5 }], 'reset', 0)).heights, undefined);
  });

  test('ground never goes below step 0', () => {
    assert.deepEqual(ok(paintHeights(sample(), [{ x: 5, y: 5 }], 'lower', 0)).heights, [{ x: 5, y: 5, height: 0 }]);
  });
});

describe('ground under the pointer', () => {
  const layout = parseTileLayout(['""""', '""""', '""""'], ['0033', '0033', '0033']);

  test('ground height follows the tile under a point', () => {
    assert.equal(groundAt(layout, 0.2, 1), 0);
    assert.equal(groundAt(layout, 2.6, 1), 3 * STEP_HEIGHT);
  });

  test('a ray straight down lands on the top of raised ground', () => {
    const hit = rayGround(layout, new Vector3(3, 20, 1), new Vector3(0, -1, 0), new Vector3());
    assert.ok(hit);
    assert.ok(Math.abs(hit.y - 3 * STEP_HEIGHT) < 0.01);
  });

  test('a low ray meets the face of a rise before the ground behind it', () => {
    const direction = new Vector3(1, -0.2, 0).normalize();
    const hit = rayGround(layout, new Vector3(-2, 1.4, 1), direction, new Vector3());
    assert.ok(hit);
    assert.equal(Math.round(hit.x), 2);
  });
});
