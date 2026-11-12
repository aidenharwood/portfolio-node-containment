import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createObjectWalkabilityGrid, doorTilesOf, GAME_CONTENT, levelRegions, withOpenDoors, type GuidanceTarget, type LevelId, type TilePoint } from '@containment/shared';
import { GuidanceRoute } from '../src/state/guidanceRoute.ts';
import type { WorldState } from '../src/state/worldState.ts';

const level = GAME_CONTENT.levels.get('the-threshold' as LevelId);
assert.ok(level);
const definitionOf = (objectId: string) => GAME_CONTENT.worldObjects.get(objectId);
const baseGrid = withOpenDoors(createObjectWalkabilityGrid(level.layout, level.objects, definitionOf), level.layout, doorTilesOf(level.objects, definitionOf), () => false);
const regions = levelRegions(level, baseGrid);

let lookups = 0;
const grid = { isWalkable: (point: TilePoint) => (lookups++, baseGrid.isWalkable(point)) };

const placement = level.objects.find((candidate) => !definitionOf(candidate.objectId)?.blocksMovement && baseGrid.isWalkable(candidate.position)) ?? level.objects[0];
assert.ok(placement);
const target: GuidanceTarget = { kind: 'resource', objectId: placement.objectId };

const walkable: TilePoint[] = [];
for (let y = 0; y < level.layout.height; y++) for (let x = 0; x < level.layout.width; x++) if (baseGrid.isWalkable({ x, y })) walkable.push({ x, y });
const goalRegion = regions.regionAt(placement.position);
const origin = walkable
  .filter((tile) => goalRegion < 0 || regions.regionAt(tile) === goalRegion)
  .sort((a, b) => Math.hypot(b.x - placement.position.x, b.y - placement.position.y) - Math.hypot(a.x - placement.position.x, a.y - placement.position.y))[0];
assert.ok(origin);

const world = {
  selfEntity: { to: origin },
  self: { quests: {}, discoveredStations: [], openPassages: [] },
  zone: { definition: level, layout: level.layout, grid },
  openDoors: new Set<string>(),
  entities: new Map(),
  depletedObjects: new Set<string>(),
  usedObjects: new Set<string>(),
} as unknown as WorldState;

describe('guidance route', () => {
  test('reuses an intact route instead of searching again when nothing changed', () => {
    const guidance = new GuidanceRoute(world);
    lookups = 0;
    const first = [...guidance.current(0, target)];
    const firstLookups = lookups;
    assert.ok(first.length > 2);

    guidance.invalidate();
    lookups = 0;
    const second = guidance.current(10, target);
    assert.deepEqual(second, first);
    assert.ok(lookups <= first.length * 2, `replanning looked up ${lookups} tiles, first plan ${firstLookups}`);
  });

  test('searches again once a door opens', () => {
    const guidance = new GuidanceRoute(world);
    const first = [...guidance.current(0, target)];
    (world.openDoors as Set<string>).add('some-door');
    guidance.invalidate();
    lookups = 0;
    guidance.current(10, target);
    (world.openDoors as Set<string>).clear();
    assert.ok(lookups > first.length * 2, `replanning looked up only ${lookups} tiles`);
  });
});
