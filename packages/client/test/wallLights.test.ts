import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ResolvedLevel, TileKindId, TilePoint } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { zoneOfLevel } from '../src/editor/previewLevel.ts';
import { mountsIn, planWallLighting } from '../src/render/world/wallLights.ts';
import type { ActiveZone } from '../src/state/worldState.ts';

const wilds = FIXTURE_CONTENT.levels.get('fx-wilds') as ResolvedLevel;

const BUILDINGS = [
  { x: 36, y: 4, width: 8, height: 7 },
  { x: 52, y: 4, width: 8, height: 7 },
];

const builtAt = ({ x, y }: TilePoint): TileKindId | undefined => {
  for (const rect of BUILDINGS) {
    if (x < rect.x || y < rect.y || x >= rect.x + rect.width || y >= rect.y + rect.height) continue;
    const edge = x === rect.x || y === rect.y || x === rect.x + rect.width - 1 || y === rect.y + rect.height - 1;
    return edge ? 'brick' : 'plating';
  }
  return undefined;
};

const zone = (): ActiveZone => {
  const base = zoneOfLevel(FIXTURE_CONTENT, wilds);
  const scene = base.layout;
  return { ...base, layout: { ...scene, tileAt: (point) => builtAt(point) ?? scene.tileAt(point) } };
};

test('wall lights in a split square mount only on tiles their own district owns', () => {
  const built = zone();
  const occupied = new Set(wilds.objects.map((placement) => `${placement.position.x},${placement.position.y}`));
  const split = wilds.areas.filter((area) => area.districtId === 'fx-wild-gate-west' || area.districtId === 'fx-wild-gate-east');
  assert.equal(split.length, 2);
  for (const area of split) {
    const mounts = mountsIn(built, area, occupied);
    assert.ok(mounts.length > 0, area.districtId);
    for (const mount of mounts) assert.equal(wilds.layout.districtAt(mount.floor), area.districtId, `${mount.floor.x},${mount.floor.y}`);
  }
  const { sconces } = planWallLighting(built);
  for (const rect of BUILDINGS) assert.ok(sconces.some(({ floor }) => floor.x > rect.x && floor.x < rect.x + rect.width - 1 && floor.y > rect.y && floor.y < rect.y + rect.height - 1));
});
