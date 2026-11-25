import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type ResolvedLevel } from '@containment/shared';
import { SKY_MASK_SIZE, SkyMask } from '../src/render/world/skyMask.ts';

const overworld = GAME_CONTENT.levels.get('overworld') as ResolvedLevel;

test('the sky mask opens streets with their height and keeps building rooms and doorways covered', () => {
  const mask = new SkyMask();
  assert.ok(mask.follow(overworld, 350, 153));
  const height = (x: number, y: number): number | undefined => mask.data[((y - mask.originZ) * SKY_MASK_SIZE + x - mask.originX) * 2 + 1];
  assert.ok(mask.isOpen(350, 153));
  assert.equal(height(350, 153), overworld.scene.heightAt({ x: 350, y: 153 }));
  assert.ok(overworld.scene.heightAt({ x: 350, y: 153 }) > 0);
  assert.equal(mask.isOpen(330, 140), false);
  assert.equal(mask.isOpen(334, 146), false);
  assert.equal(mask.isOpen(328, 140), false);
  assert.equal(mask.follow(overworld, 352, 155), false);
});

test('open concrete outside any building counts as open ground', () => {
  const mask = new SkyMask();
  mask.follow(overworld, 560, 370);
  assert.equal(overworld.scene.tileAt({ x: 560, y: 370 }), 'concrete');
  assert.ok(mask.isOpen(560, 370));
});
