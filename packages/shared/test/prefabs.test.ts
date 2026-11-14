import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type WorldObjectDefinition } from '../src/index.ts';
import { findPrefabIssues, PREFABS, type Prefab } from '../src/content/prefabs/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const objectOf = (id: string) => FIXTURE_CONTENT.worldObjects.get(id);

const sample = (overrides: Partial<Prefab>): Prefab => ({ id: 'sample', roles: ['island'], pieces: [], ...overrides });

describe('prefab libraries', () => {
  test('every prefab is keyed by its id and passes validation', () => {
    for (const [key, prefab] of Object.entries(PREFABS)) {
      assert.equal(key, prefab.id);
      assert.deepEqual(findPrefabIssues(prefab, objectOf), [], prefab.id);
    }
  });

  test('overlapping pieces are reported, counting footprints', () => {
    const withFootprint = (id: string) => (id === 'wide-thing' ? ({ ...objectOf('planter')!, id, footprint: { width: 2, height: 2 } } as WorldObjectDefinition) : objectOf(id));
    const issues = findPrefabIssues(
      sample({
        pieces: [
          { dx: 0, dy: 0, objectId: 'wide-thing' },
          { dx: 1, dy: 1, objectId: 'planter' },
        ],
      }),
      withFootprint,
    );
    assert.ok(issues.some((issue) => issue.includes('overlap')), issues.join('; '));
  });

  test('pieces may stand under a walk-under canopy but not on its posts', () => {
    const underCanopy = (dx: number, dy: number) =>
      findPrefabIssues(sample({ pieces: [{ dx: 0, dy: 0, objectId: 'transit-shelter' }, { dx, dy, objectId: 'briefing-bench' }] }), objectOf);
    assert.deepEqual(underCanopy(1, 1), []);
    assert.ok(underCanopy(2, 1).some((issue) => issue.includes('overlap')));
  });

  test('unknown objects and empty roles are reported', () => {
    const issues = findPrefabIssues(sample({ roles: [], pieces: [{ dx: 0, dy: 0, objectId: 'no-such-object' }] }), objectOf);
    assert.ok(issues.some((issue) => issue.includes('no-such-object')));
    assert.ok(issues.some((issue) => issue.includes('roles')));
  });
});
