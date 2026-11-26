import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nightOf } from '../src/render/sceneLook.ts';
import { airShapeFor, focusPlaneOf, fogAt, MOOD_CAP, WINDOW_EDGE, type AirAmbience } from '../src/render/sky/air.ts';

const KESTREL: AirAmbience = { darkness: 0.18, daylight: 1, haze: 1 };
const HALCYON: AirAmbience = { darkness: 0.5, daylight: 1, haze: 1.2 };
const UNDERCROFT: AirAmbience = { darkness: 0.78, daylight: 0, haze: 1.1 };
const REACHES = [600, 900, 1300, 1600] as const;
const shape = (ambience: AirAmbience, reach: number | null) => airShapeFor(ambience, nightOf(ambience.darkness), reach);

test('the air is clear at the focus and thickens steadily with distance, its near haze capped', () => {
  for (const ambience of [KESTREL, HALCYON, UNDERCROFT]) {
    for (const reach of [...REACHES, null]) {
      const air = shape(ambience, reach);
      assert.equal(fogAt(0, air).total, 0);
      let last = 0;
      for (let past = 1; past <= 1600; past += 7) {
        const { total, mood } = fogAt(past, air);
        assert.ok(total >= last);
        assert.ok(mood <= MOOD_CAP + 1e-9);
        last = total;
      }
    }
  }
});

test('the far plane and the edge of the streamed window are always lost in the haze', () => {
  for (const ambience of [KESTREL, HALCYON]) {
    for (const reach of REACHES) assert.ok(fogAt(reach - focusPlaneOf(30), shape(ambience, reach)).aerial >= 0.97, `reach ${reach}`);
  }
  for (const ambience of [KESTREL, UNDERCROFT]) assert.ok(fogAt(WINDOW_EDGE, shape(ambience, null)).total >= 0.97);
});

test('daylight keeps a thin haze that still gives depth, and dark districts a thicker one', () => {
  const day = shape(KESTREL, 1300);
  const night = shape(HALCYON, 1300);
  assert.ok(fogAt(40, day).total < 0.12);
  assert.ok(fogAt(120, day).total > 0.2);
  assert.ok(fogAt(40, night).total > fogAt(40, day).total + 0.1);
});

test('a longer view distance keeps the middle distance clearer', () => {
  assert.ok(fogAt(300, shape(KESTREL, 1600)).aerial < fogAt(300, shape(KESTREL, 600)).aerial);
  assert.equal(focusPlaneOf(11), 7);
  assert.equal(focusPlaneOf(2), 0);
});
