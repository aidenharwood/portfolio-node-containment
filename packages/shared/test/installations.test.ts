import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { INSTALLATION_KINDS } from '../src/content/installations.ts';
import { districtObjects, doorTilesOf, GAME_CONTENT, tileKey } from '../src/index.ts';

const coreIds = new Set(INSTALLATION_KINDS.flatMap((kind) => kind.coreIds));
const definitionOf = (objectId: string) => GAME_CONTENT.worldObjects.get(objectId);

describe('installations', () => {
  test('installation cores are only ever placed as whole installations', () => {
    for (const district of GAME_CONTENT.districts.values()) {
      for (const placement of district.objects) assert.ok(!coreIds.has(placement.objectId), `${district.id} places ${placement.instanceId} as a bare ${placement.objectId}`);
    }
  });

  test('every piece of an installation answers to its core', () => {
    for (const coreId of coreIds) {
      const assembly = GAME_CONTENT.assemblies.get(coreId);
      const core = definitionOf(coreId);
      assert.ok(assembly && core, coreId);
      for (const piece of Object.values(assembly.pieces)) {
        const definition = definitionOf(piece.objectId);
        assert.ok(definition, piece.objectId);
        if (definition.id === coreId || !definition.blocksMovement) continue;
        assert.equal(definition.countsAs, coreId);
        assert.deepEqual(definition.interactions, core.interactions);
        assert.deepEqual(definition.door, core.door);
      }
    }
  });

  test('both leaves of a double door share one door', () => {
    const hydroponics = GAME_CONTENT.districts.get('hydroponics');
    assert.ok(hydroponics);
    const leaves = districtObjects(hydroponics, GAME_CONTENT.assemblies).filter((placement) => placement.instanceId.startsWith('sector2-bulkhead/'));
    assert.equal(leaves.length, 2);
    const doors = doorTilesOf(leaves, definitionOf);
    assert.deepEqual(leaves.map((leaf) => doors.get(tileKey(leaf.position))), ['sealed-bulkhead', 'sealed-bulkhead']);
  });
});
