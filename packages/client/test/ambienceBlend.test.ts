import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '@containment/shared';
import { createBlendedAmbience, easeAmbience, sampleAmbience } from '../src/render/world/ambienceBlend.ts';

const overworld = GAME_CONTENT.levels.get('overworld')!;
const vault = GAME_CONTENT.levels.get('meridian-b3')!;

test('the Fringe rains on open ground and the Vault grows spores under cover', () => {
  const fringe = sampleAmbience(overworld, { x: 160, y: 96 });
  assert.equal(fringe.weather.rain, 1);
  assert.ok(fringe.exposure > 0.5);
  assert.ok(fringe.haze > 1);
  const deep = sampleAmbience(vault, { x: 37, y: 29 });
  assert.equal(deep.weather.spores, 1);
  assert.equal(deep.weather.rain, 0);
  assert.equal(deep.daylight, 0);
});

test('weather eases in rather than snapping', () => {
  const current = createBlendedAmbience();
  easeAmbience(current, sampleAmbience(overworld, { x: 160, y: 96 }), 0.25);
  assert.equal(current.weather.rain, 0.25);
});
