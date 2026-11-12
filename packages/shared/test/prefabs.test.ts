import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, type WorldObjectDefinition } from '../src/index.ts';
import { DRESSING_THEMES, findPrefabIssues, PREFABS, prefabsWithRole, type Prefab } from '../src/content/prefabs/index.ts';

const objectOf = (id: string) => GAME_CONTENT.worldObjects.get(id);

const ATRIUM_PREFABS = [
  'fountain-court',
  'statue-court',
  'fountain-corner',
  'kiosk-island',
  'bench-ring',
  'info-stand',
  'banner-pair',
  'pylon-bench',
  'reception',
  'map-room',
  'shelter-stop',
  'barrier-line',
  'timetable-wall',
  'triage-hub',
  'press-cell',
  'checkpoint',
];

const sample = (overrides: Partial<Prefab>): Prefab => ({ id: 'sample', themes: ['civic'], roles: ['island'], pieces: [], ...overrides });

describe('prefab libraries', () => {
  test('every theme has bay, island and corner prefabs', () => {
    for (const theme of DRESSING_THEMES) {
      for (const role of ['bay', 'island', 'corner'] as const) assert.ok(prefabsWithRole(theme, role).length > 0, `${theme} lacks ${role}`);
    }
  });

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

  test('the Atrium prefabs exist and are placed only by hand', () => {
    for (const id of ATRIUM_PREFABS) {
      assert.ok(PREFABS[id], `${id} is missing`);
      assert.deepEqual(PREFABS[id]?.themes, [], `${id} would be scattered by the composer`);
    }
    assert.equal(PREFABS['fountain-court']?.symmetric, true);
    assert.equal(PREFABS['checkpoint']?.symmetric, true);
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
