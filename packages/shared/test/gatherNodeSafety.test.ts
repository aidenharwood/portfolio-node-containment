import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';

const SAFETY_MARGIN = 2;
const LEVEL_TOLERANCE = 5;

test('no gather node sits within reach of an aggressive creature far above its level', () => {
  const violations: string[] = [];
  for (const district of GAME_CONTENT.districts.values()) {
    const creatures = (district.creatures ?? []).flatMap((placement) => {
      const definition = GAME_CONTENT.creatures.get(placement.creatureId);
      return definition?.aggressive ? [{ placement, definition }] : [];
    });
    for (const object of district.objects) {
      const nodeLevel = Math.max(
        -1,
        ...(GAME_CONTENT.worldObjects.get(object.objectId)?.interactions.flatMap((interaction) => (interaction.gather ? [interaction.gather.level] : [])) ?? []),
      );
      if (nodeLevel < 0) continue;
      for (const { placement, definition } of creatures) {
        if (definition.level <= nodeLevel + LEVEL_TOLERANCE) continue;
        const reach = definition.aggroRadius + definition.attack.range + definition.wanderRadius + SAFETY_MARGIN;
        const distance = Math.max(Math.abs(object.position.x - placement.position.x), Math.abs(object.position.y - placement.position.y));
        if (distance <= reach) violations.push(`${district.id}: ${object.instanceId} (level ${nodeLevel}) is ${distance} tiles from ${placement.instanceId} (level ${definition.level}, reach ${reach})`);
      }
    }
  }
  assert.deepEqual(violations, []);
});
