import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3 } from 'three';
import type { AttackMotion, CreatureModel } from '@containment/shared';
import { ATTACK_CONTACT, ATTACK_DURATION_MS } from '../src/state/attackTiming.ts';
import { attackKeyTimes } from '../src/render/models/weaponPoses.ts';
import { createCreatureRig } from '../src/render/models/creatureModels.ts';
import { WARD_CREATURE_FACTORIES } from '../src/render/models/wardCreatureModels.ts';

const MAX_CONTACT_DELAY_MS = 320;

test('every attack motion lands its contact on a keyframe, soon enough to feel responsive', () => {
  for (const motion of Object.keys(ATTACK_CONTACT) as AttackMotion[]) {
    assert.ok(attackKeyTimes(motion).includes(ATTACK_CONTACT[motion]), `${motion} has a key at its contact ${ATTACK_CONTACT[motion]}`);
    assert.ok(ATTACK_CONTACT[motion] * ATTACK_DURATION_MS[motion] <= MAX_CONTACT_DELAY_MS, `${motion} contact comes within ${MAX_CONTACT_DELAY_MS} ms`);
  }
});

test('creatures stay above the floor through their strike and hurt reactions', () => {
  for (const model of Object.keys(WARD_CREATURE_FACTORIES) as CreatureModel[]) {
    const rig = createCreatureRig(model);
    for (let progress = 0; progress <= 1.0001; progress += 0.05) {
      for (const pose of [{ attackProgress: progress, hurtProgress: null }, { attackProgress: null, hurtProgress: progress }]) {
        rig.animate({ moving: false, walkPhase: 0, time: 0, ...pose });
        rig.root.updateMatrixWorld(true);
        const lowest = new Box3().setFromObject(rig.root, true).min.y;
        assert.ok(lowest >= -0.02, `${model} at ${progress.toFixed(2)} sinks to ${lowest.toFixed(3)}`);
      }
    }
  }
});
