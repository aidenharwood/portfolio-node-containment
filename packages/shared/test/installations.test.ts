import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { INSTALLATION_KINDS } from '../src/content/installations.ts';
import { districtObjects, doorTilesOf, tileKey } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const coreIds = new Set(INSTALLATION_KINDS.flatMap((kind) => kind.coreIds));
const definitionOf = (objectId: string) => FIXTURE_CONTENT.worldObjects.get(objectId);

describe('installations', () => {
  test('installation cores are only ever placed as whole installations', () => {
    for (const district of FIXTURE_CONTENT.districts.values()) {
      for (const placement of district.objects) assert.ok(!coreIds.has(placement.objectId), `${district.id} places ${placement.instanceId} as a bare ${placement.objectId}`);
    }
  });

  test('every piece of an installation answers to its core', () => {
    for (const coreId of coreIds) {
      const assembly = FIXTURE_CONTENT.assemblies.get(coreId);
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
    const field = FIXTURE_CONTENT.districts.get('fx-field');
    assert.ok(field);
    const leaves = districtObjects(field, FIXTURE_CONTENT.assemblies).filter((placement) => placement.objectId === 'vault-door');
    assert.equal(leaves.length, 2);
    const doors = doorTilesOf(leaves, definitionOf);
    assert.deepEqual(leaves.map((leaf) => doors.get(tileKey(leaf.position))), ['vault-door', 'vault-door']);
  });
});
