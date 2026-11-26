import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, MathUtils } from 'three';
import { nightOf } from '../src/render/sceneLook.ts';
import { displayLuma, ringHalfWidth, skyLookFor } from '../src/render/sky/skyLook.ts';
import { displayColorOf, sceneColorOf } from '../src/render/sky/toneCurve.ts';
import { createBlendedAmbience, type BlendedAmbience } from '../src/render/world/ambienceBlend.ts';

const EXPOSURE = 1.4;

const district = (darkness: number, tint: string, fog: string, sky: string | null, haze = 1): BlendedAmbience => {
  const ambience = createBlendedAmbience();
  ambience.darkness = darkness;
  ambience.tint.set(tint);
  ambience.fog.set(fog);
  ambience.daylight = sky ? 1 : 0;
  ambience.haze = haze;
  if (sky) ambience.sky.set(sky);
  return ambience;
};

const KESTREL = district(0.18, '#dfe8f0', '#b8c6d4', '#9ab8d4');
const HALCYON = district(0.5, '#4a3a6e', '#3a2c5c', '#4a2e66', 1.2);
const WRECKFIELD = district(0.32, '#8a7058', '#7a6450', '#a08466', 1.25);
const UNDERCROFT = district(0.78, '#2a1838', '#140a1c', null, 1.1);
const lookOf = (ambience: BlendedAmbience) => skyLookFor(ambience, nightOf(ambience.darkness));

test('sky colours come out of the tone curve as they were authored', () => {
  for (const [r, g, b] of [
    [0.77, 0.82, 0.86],
    [0.35, 0.23, 0.45],
    [0.05, 0.04, 0.12],
    [0.85, 0.8, 0.7],
    [0.5, 0.5, 0.5],
  ] as const) {
    const shown = displayColorOf(sceneColorOf(new Color(r, g, b), EXPOSURE), EXPOSURE);
    assert.ok(Math.abs(shown.r - r) < 1 / 255 && Math.abs(shown.g - g) < 1 / 255 && Math.abs(shown.b - b) < 1 / 255, `${r} ${g} ${b} came out as ${shown.r} ${shown.g} ${shown.b}`);
  }
  const horizon = lookOf(KESTREL).horizon;
  assert.ok(displayLuma(horizon) < 0.86);
  assert.ok(displayLuma(displayColorOf(sceneColorOf(horizon, EXPOSURE), EXPOSURE)) < 0.86);
});

test('a daylight sky deepens from a pale horizon to a bluer zenith', () => {
  for (const ambience of [KESTREL, WRECKFIELD]) {
    const look = lookOf(ambience);
    assert.ok(displayLuma(look.horizon) > displayLuma(look.zenith));
    assert.ok(look.sun.r > 0.2 && look.clouds > 0 && look.archShow > 0);
    assert.ok(look.lights.r < 0.05);
  }
  const kestrel = lookOf(KESTREL);
  assert.ok(kestrel.zenith.b > kestrel.zenith.r && kestrel.horizon.b > kestrel.horizon.r);
});

test('a dark district glows at the horizon above its ground and fades to a near-black zenith', () => {
  const look = lookOf(HALCYON);
  const horizon = displayLuma(look.horizon) * 255;
  assert.ok(horizon >= 50 && horizon <= 70, `horizon luma ${horizon}`);
  assert.ok(displayLuma(look.zenith) * 255 < 20);
  assert.ok(look.spread < lookOf(KESTREL).spread);
  assert.ok(look.lights.r > 0 && look.archShow > lookOf(KESTREL).archShow);
  assert.ok(look.archShow >= 0.85, `arch opacity ${look.archShow}`);
  assert.ok(look.horizon.b > look.horizon.g);
});

test('an enclosed level has no sun, clouds, arch or city lights', () => {
  const look = lookOf(UNDERCROFT);
  assert.equal(look.open, 0);
  assert.deepEqual([look.sun.r, look.sun.g, look.sun.b, look.clouds, look.archShow, look.lights.r], [0, 0, 0, 0, 0, 0]);
  assert.ok(displayLuma(look.zenith) <= displayLuma(look.horizon));
});

test('the ring arch rises from the horizon as a narrow band that widens a little overhead and never flares', () => {
  const horizon = MathUtils.radToDeg(ringHalfWidth(0));
  assert.ok(horizon > 1.8 && horizon < 2.6, `half-width at the horizon ${horizon}`);
  let last = 0;
  for (let degrees = 0; degrees <= 90; degrees += 2) {
    const width = ringHalfWidth(MathUtils.degToRad(degrees));
    assert.ok(width >= last, `${degrees} degrees`);
    last = width;
  }
  assert.ok(last / ringHalfWidth(0) < 1.5);
});
