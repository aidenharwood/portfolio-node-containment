import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '@containment/shared';
import { projectileOf } from '../src/state/worldState.ts';

test('a creature attack projectile overrides the style fallback', () => {
  assert.equal(projectileOf('ranged', null), 'spit');
  assert.equal(projectileOf('psionic', null), 'pulse');
  assert.equal(projectileOf('ranged', null, 'pellets'), 'pellets');
  assert.equal(projectileOf('melee', null, 'pellets'), null);
});

test('the rustling flings scrap rather than spit', () => {
  assert.equal(GAME_CONTENT.creatures.get('rustling')?.attack.projectile, 'pellets');
});
