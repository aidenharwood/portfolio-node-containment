import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ResolvedLevel, TileKindId, TilePoint } from '@containment/shared';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { zoneOfLevel } from '../src/editor/previewLevel.ts';
import { NEON_RUN, rooflineNeonGlow } from '../src/render/world/levelVoxels.ts';
import { FACING_STEP, mountsIn, planWallLighting } from '../src/render/world/wallLights.ts';
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

const zone = (material: TileKindId = 'brick'): ActiveZone => {
  const base = zoneOfLevel(FIXTURE_CONTENT, wilds);
  const scene = base.layout;
  const built = (point: TilePoint): TileKindId | undefined => {
    const kind = builtAt(point);
    return kind === 'brick' ? material : kind;
  };
  return { ...base, layout: { ...scene, tileAt: (point) => built(point) ?? scene.tileAt(point) } };
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

test('roofline neon lights about a third of the runs in saturated colours', () => {
  let lit = 0;
  for (let runX = 0; runX < 40; runX++) {
    for (let runY = 0; runY < 40; runY++) if (rooflineNeonGlow('cladding', runX * NEON_RUN, runY * NEON_RUN, 'south') !== null) lit++;
  }
  assert.ok(lit / 1600 > 0.25 && lit / 1600 < 0.45, `${lit / 1600}`);
  assert.equal(rooflineNeonGlow('brick', 0, 0, 'south'), null);
});

test('lit neon runs spill light of their colour onto the street at the foot of their wall, spaced apart', () => {
  const built = zone('cladding');
  const { fills } = planWallLighting(built);
  const expected = new Map<string, string>();
  for (const rect of BUILDINGS) {
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (built.layout.tileAt({ x, y }) !== 'cladding') continue;
        for (const side of ['north', 'south', 'east', 'west'] as const) {
          const outside = { x: x + FACING_STEP[side].x, y: y + FACING_STEP[side].y };
          if (builtAt(outside) !== undefined) continue;
          const neon = rooflineNeonGlow('cladding', x, y, side);
          if (neon === null) continue;
          const key = FACING_STEP[side].x === 0 ? `${side}:${Math.floor(x / NEON_RUN)}:${y}` : `${side}:${x}:${Math.floor(y / NEON_RUN)}`;
          expected.set(key, `#${neon.toString(16).padStart(6, '0')}`);
        }
      }
    }
  }
  assert.ok(expected.size > 0);
  const neonFills = fills.filter(({ light }) => [...expected.values()].includes(light.color) && light.radius > 3);
  assert.ok(neonFills.length > 0 && neonFills.length <= expected.size);
  neonFills.forEach(({ position }, index) => {
    for (const other of neonFills.slice(index + 1)) assert.ok(Math.hypot(other.position.x - position.x, other.position.y - position.y) >= 6);
  });
  for (const { position } of neonFills) {
    assert.equal(builtAt(position), undefined, `${position.x},${position.y}`);
    assert.ok((['north', 'south', 'east', 'west'] as const).some((side) => builtAt({ x: position.x + FACING_STEP[side].x, y: position.y + FACING_STEP[side].y }) === 'brick'));
  }
});
