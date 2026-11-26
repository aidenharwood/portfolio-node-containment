import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { createBlendedAmbience, type BlendedAmbience } from '../src/render/world/ambienceBlend.ts';
import { finishFor, lightAmbience, luminanceOf, nightLookFor, nightOf, shadowFrameFor } from '../src/render/sceneLook.ts';
import { KEY_LIGHT_OFFSET } from '../src/render/voxel/fieldLights.ts';

const READABLE_FILL = 0.6;
const NIGHT_READABLE_FILL = 0.45;
const SHADOW_NEAR = 0.5;

const ambience = (darkness: number, tint: string, sky: string | null): BlendedAmbience => {
  const into = createBlendedAmbience();
  into.darkness = darkness;
  into.tint.set(tint);
  into.fog.set(tint);
  into.daylight = sky ? 1 : 0;
  if (sky) into.sky.set(sky);
  return into;
};

const saturationOf = (color: { r: number; g: number; b: number }): number => {
  const peak = Math.max(color.r, color.g, color.b);
  return peak === 0 ? 0 : (peak - Math.min(color.r, color.g, color.b)) / peak;
};

test('a dark district keeps a readable fill whatever its tint and sky colour', () => {
  for (const darkness of [0.4, 0.6, 0.9]) {
    for (const tint of ['#3a2448', '#1a2a3a', '#101010', '#401010', '#4e3e36']) {
      for (const sky of ['#2a1838', '#1a3048', '#000000', '#6a6660', '#300000', null]) {
        const light = lightAmbience(ambience(darkness, tint, sky));
        assert.ok(light.fill * luminanceOf(light.sky) >= NIGHT_READABLE_FILL - 1e-9, `fill under ${tint} and ${sky} at darkness ${darkness}`);
        assert.ok(light.sun >= 0.35 - 1e-9, `key under ${tint} and ${sky} at darkness ${darkness}`);
      }
    }
  }
});

test('after dark the fill and key give way to lamps, neon and white-hot cores, and daylight is untouched', () => {
  const halcyon = lightAmbience(ambience(0.5, '#4a3a6e', '#4a2e66'));
  const fill = halcyon.fill * luminanceOf(halcyon.sky);
  assert.ok(fill >= NIGHT_READABLE_FILL && fill < READABLE_FILL, `fill ${fill}`);
  assert.deepEqual(nightLookFor(0.18), { mistGain: 1, hotCore: 0 });
  const night = nightLookFor(0.5);
  assert.ok(night.mistGain < 0.6 && night.hotCore > 0.7);
  let last = nightLookFor(0);
  for (let darkness = 0.05; darkness <= 1; darkness += 0.05) {
    const next = nightLookFor(darkness);
    assert.ok(next.hotCore >= last.hotCore && next.mistGain <= last.mistGain);
    last = next;
  }
});

test('a bright daylight sky is neither dimmed nor lifted', () => {
  const day = lightAmbience(ambience(0.16, '#e8eef4', '#9fc8f0'));
  const indoors = lightAmbience(ambience(0.16, '#e8eef4', null));
  assert.equal(day.skyBrightness, 1);
  assert.ok(Math.abs(day.fill - indoors.fill) < 1e-9);
  assert.ok(day.fill * luminanceOf(day.sky) > 2 * READABLE_FILL);
  assert.ok(day.sun > 2.5 * indoors.sun);
});

test('sky brightness is judged as the sky looks, not by its linear value', () => {
  assert.ok(Math.abs(lightAmbience(ambience(0.58, '#3a2448', '#2a1838')).skyBrightness - 0.264) < 0.01);
  assert.ok(Math.abs(lightAmbience(ambience(0.4, '#4e3e36', '#6a6660')).skyBrightness - 0.499) < 0.01);
});

test('the key light leans to the sky hue without losing its strength', () => {
  const night = lightAmbience(ambience(0.58, '#3a2448', '#2a1838'));
  assert.ok(luminanceOf(night.key) > 0.6);
  assert.ok(night.key.b > night.key.g && night.key.r > night.key.g);
  const day = lightAmbience(ambience(0.16, '#e8eef4', '#9fc8f0'));
  assert.ok(saturationOf(day.key) < saturationOf(night.key));
});

test('darker districts carry more of their tint into the fill', () => {
  const dusk = lightAmbience(ambience(0.1, '#3a2448', null));
  const night = lightAmbience(ambience(0.6, '#3a2448', null));
  assert.ok(saturationOf(night.sky) > saturationOf(dusk.sky) + 0.05);
});

test('the finish lifts the shadows instead of crushing them once a district is dark', () => {
  const day = finishFor(0.16, 1);
  const night = finishFor(0.6, 1);
  assert.deepEqual([day.curve, day.toe, day.vignette], [0.22, 0, 0.3]);
  assert.equal(night.curve, 0);
  assert.ok(night.toe >= 0.02 && night.toe <= 0.03);
  assert.ok(Math.abs(night.vignette - 0.18) < 1e-9);
  assert.ok(day.saturation < night.saturation && night.saturation < finishFor(0.6, 0).saturation + 1e-9);
  let last = 0;
  for (let darkness = 0; darkness <= 1; darkness += 0.05) {
    const weight = nightOf(darkness);
    assert.ok(weight >= last);
    last = weight;
  }
});

test('the key light separates the two wall faces seen from the default camera', () => {
  const direction = new Vector3(...KEY_LIGHT_OFFSET).normalize();
  const south = Math.max(0, direction.z);
  const east = Math.max(0, direction.x);
  const elevation = Math.asin(direction.y) * (180 / Math.PI);
  assert.ok(Math.abs(south - east) > 0.4);
  assert.ok(elevation > 40 && elevation < 60);
});

test('the shadow camera holds the ground and tall casters across its whole box', () => {
  const direction = new Vector3(...KEY_LIGHT_OFFSET).normalize();
  const right = new Vector3().crossVectors(direction, new Vector3(0, 1, 0)).normalize();
  const up = new Vector3().crossVectors(right, direction).normalize();
  for (const half of [8, 12, 16, 20]) {
    const { standoff, far } = shadowFrameFor(half);
    for (let a = -half; a <= half; a += half / 4) {
      for (let b = -half; b <= half; b += half / 4) {
        for (const height of [-12, 0, 12]) {
          const along = (height - a * right.y - b * up.y) / direction.y;
          const depth = standoff - along;
          assert.ok(depth >= SHADOW_NEAR && depth <= far, `half ${half}: point (${a}, ${b}) at height ${height} lies at depth ${depth.toFixed(2)}`);
        }
      }
    }
  }
});
