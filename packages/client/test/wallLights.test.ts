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

const padded = (): ActiveZone => {
  const base = zoneOfLevel(FIXTURE_CONTENT, wilds);
  const scene = base.layout;
  const onPad = ({ x, y }: TilePoint): boolean => BUILDINGS.some((rect) => x >= rect.x - 2 && y >= rect.y - 2 && x < rect.x + rect.width + 2 && y < rect.y + rect.height + 2);
  return { ...base, layout: { ...scene, tileAt: (point) => builtAt(point) ?? (onPad(point) ? 'concrete' : scene.tileAt(point)) } };
};

test('buildings on a concrete pad keep their sconces inside and spill window light onto the pad', () => {
  const built = padded();
  const { sconces, fills } = planWallLighting(built);
  const near = ({ x, y }: TilePoint, reach: number): boolean => BUILDINGS.some((rect) => x >= rect.x - reach && y >= rect.y - reach && x < rect.x + rect.width + reach && y < rect.y + rect.height + reach);
  const inside = ({ x, y }: TilePoint): boolean => BUILDINGS.some((rect) => x > rect.x && y > rect.y && x < rect.x + rect.width - 1 && y < rect.y + rect.height - 1);
  const local = sconces.filter(({ floor }) => near(floor, 2));
  assert.ok(local.length >= BUILDINGS.length);
  for (const { floor } of local) assert.ok(inside(floor), `${floor.x},${floor.y}`);
  assert.ok(fills.some(({ position }) => near(position, 1) && !inside(position) && built.layout.tileAt(position) === 'concrete'));
});

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
