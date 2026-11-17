import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Color, Vector3 } from 'three';
import { brightenForGlow, MIN_GLOW_LUMINANCE, PARTICLE_CAPACITY, PARTICLE_PRESETS, ParticleLayer } from '../src/render/particleLayer.ts';

test('every particle expires after its preset life', () => {
  const layer = new ParticleLayer();
  for (const preset of Object.keys(PARTICLE_PRESETS) as (keyof typeof PARTICLE_PRESETS)[]) layer.emit(preset, new Vector3(0, 1, 0));
  const longest = Math.max(...Object.values(PARTICLE_PRESETS).map((spec) => spec.life[1]));
  for (let time = 0; time <= longest + 0.1; time += 0.05) layer.update(0.05);
  assert.equal(layer.liveCount('solid') + layer.liveCount('glow'), 0);
});

test('overflow recycles the oldest particles instead of growing', () => {
  const layer = new ParticleLayer();
  for (let burst = 0; burst < 300; burst++) layer.emit('debris', new Vector3(0, 1, 0));
  layer.update(0.01);
  assert.ok(layer.liveCount('solid') <= PARTICLE_CAPACITY);
  assert.ok(layer.meshCount('solid') <= PARTICLE_CAPACITY);
});

test('particles far from the camera focus are skipped', () => {
  const layer = new ParticleLayer();
  assert.equal(layer.emit('sparks', new Vector3(40, 0, 0)), 0);
  assert.ok(layer.emit('sparks', new Vector3(1, 0, 0)) > 0);
});

test('glow particles lift dark colours so additive blending still shows them', () => {
  for (const dark of [0x1f2a30, 0x000000, 0x1a1a22]) {
    const shade = new Color(brightenForGlow(dark));
    assert.ok(0.2126 * shade.r + 0.7152 * shade.g + 0.0722 * shade.b >= MIN_GLOW_LUMINANCE, `0x${dark.toString(16)} is lifted`);
  }
  assert.equal(brightenForGlow(0xffd23f), 0xffd23f);
});
