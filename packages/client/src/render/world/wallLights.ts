import { isBuildingWall, isOutdoorFloor, TILE_KINDS, type Facing, type ResolvedArea, type TilePoint, type ZoneLight } from '@containment/shared';
import type { ActiveZone } from '../../state/worldState.ts';
import { noise3 } from '../voxel/palette.ts';
import { litWindowGlow, type Side } from './levelVoxels.ts';

export interface SconceSpot {
  readonly floor: TilePoint;
  readonly wall: TilePoint;
  readonly facing: Facing;
  readonly failing: boolean;
  readonly color: number | null;
  readonly intensity: number;
  readonly radius: number;
  readonly flicker: boolean;
  readonly seed: number;
}

export interface FillLight {
  readonly position: TilePoint;
  readonly light: ZoneLight;
}

export interface WallLighting {
  readonly sconces: readonly SconceSpot[];
  readonly fills: readonly FillLight[];
}

const SCONCE_SPACING = 5;
const ZONE_LIGHT_SNAP = 3.5;
const SCONCE_INTENSITY = 1.1;
const SCONCE_RADIUS = 5.5;
const FAILING_INTENSITY = 0.95;
const WINDOW_SPILL_INTENSITY = 0.3;
const WINDOW_SPILL_RADIUS = 2.2;
const WINDOW_SPILL_SPACING = 4;
const WINDOW_SIDES: readonly Side[] = ['south', 'east', 'west', 'north'];

export const FACING_STEP: Readonly<Record<Facing, TilePoint>> = { north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 }, south: { x: 0, y: 1 } };
const MOUNT_PREFERENCE: readonly Facing[] = ['north', 'east', 'west', 'south'];

export interface Mount {
  readonly floor: TilePoint;
  readonly wall: TilePoint;
  readonly facing: Facing;
}

export function mountsIn(zone: ActiveZone, area: Pick<ResolvedArea, 'rect' | 'districtId'>, occupied: ReadonlySet<string>): Mount[] {
  const tile = (x: number, y: number) => zone.layout.tileAt({ x, y });
  const owners = zone.definition.layout;
  const { rect } = area;
  const mounts: Mount[] = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      if (owners.districtAt({ x, y }) !== area.districtId) continue;
      if (!TILE_KINDS[tile(x, y)].walkable || isOutdoorFloor(tile(x, y)) || tile(x, y) === 'door' || occupied.has(`${x},${y}`)) continue;
      if (MOUNT_PREFERENCE.some((facing) => tile(x + FACING_STEP[facing].x, y + FACING_STEP[facing].y) === 'door')) continue;
      const facing = MOUNT_PREFERENCE.find((side) => isBuildingWall(tile(x + FACING_STEP[side].x, y + FACING_STEP[side].y)));
      if (!facing) continue;
      mounts.push({ floor: { x, y }, wall: { x: x + FACING_STEP[facing].x, y: y + FACING_STEP[facing].y }, facing });
    }
  }
  return mounts;
}

export function planWallLighting(zone: ActiveZone): WallLighting {
  const occupied = new Set(zone.definition.objects.map((placement) => `${placement.position.x},${placement.position.y}`));
  const areas = [...zone.definition.areas].sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height);
  const mountsByArea = areas.map((area) => mountsIn(zone, area, occupied));
  const allMounts = mountsByArea.flat();
  const sconces: SconceSpot[] = [];
  const fills: FillLight[] = [];
  const taken = new Set<string>();
  const failingAt = (point: TilePoint) => zone.definition.ambienceAt(point).fixtures === 'failing';
  const near = (point: TilePoint, spacing: number) => sconces.some((spot) => Math.hypot(spot.floor.x - point.x, spot.floor.y - point.y) < spacing);

  zone.definition.lights.forEach((light, index) => {
    let best: Mount | null = null;
    let bestDistance = ZONE_LIGHT_SNAP;
    for (const mount of allMounts) {
      const key = `${mount.floor.x},${mount.floor.y}`;
      if (taken.has(key)) continue;
      const distance = Math.hypot(mount.floor.x - light.position.x, mount.floor.y - light.position.y);
      if (distance < bestDistance) {
        best = mount;
        bestDistance = distance;
      }
    }
    if (!best) {
      fills.push({ position: light.position, light });
      return;
    }
    taken.add(`${best.floor.x},${best.floor.y}`);
    sconces.push({ ...best, failing: failingAt(best.floor), color: parseInt(light.color.slice(1), 16), intensity: light.intensity, radius: Math.max(light.radius, SCONCE_RADIUS), flicker: false, seed: index * 11 + best.floor.x });
  });

  for (const mounts of mountsByArea) {
    for (const mount of mounts) {
      const key = `${mount.floor.x},${mount.floor.y}`;
      if (taken.has(key) || near(mount.floor, SCONCE_SPACING)) continue;
      taken.add(key);
      const failing = failingAt(mount.floor);
      const seed = mount.floor.x * 7 + mount.floor.y;
      sconces.push({
        ...mount,
        failing,
        color: null,
        intensity: failing ? FAILING_INTENSITY : SCONCE_INTENSITY,
        radius: SCONCE_RADIUS,
        flicker: failing ? seed % 3 === 0 : noise3(mount.floor.x, mount.floor.y, 0, 77) > 0.93,
        seed,
      });
    }
  }
  fills.push(...windowSpills(zone, fills));
  return { sconces, fills };
}

function windowSpills(zone: ActiveZone, existing: readonly FillLight[]): FillLight[] {
  const { layout } = zone;
  const spills: FillLight[] = [];
  const crowded = (point: TilePoint) => [...existing, ...spills].some((fill) => Math.hypot(fill.position.x - point.x, fill.position.y - point.y) < WINDOW_SPILL_SPACING);
  for (let ty = 0; ty < layout.height; ty++) {
    for (let tx = 0; tx < layout.width; tx++) {
      const material = layout.tileAt({ x: tx, y: ty });
      if (!isBuildingWall(material)) continue;
      for (const side of WINDOW_SIDES) {
        const step = FACING_STEP[side];
        const position = { x: tx + step.x, y: ty + step.y };
        if (!isOutdoorFloor(layout.tileAt(position)) || layout.tileAt(position) === 'water') continue;
        const glow = litWindowGlow(material, tx, ty, side);
        if (glow === null || crowded(position)) continue;
        spills.push({ position, light: { position, radius: WINDOW_SPILL_RADIUS, intensity: WINDOW_SPILL_INTENSITY, color: `#${glow.toString(16).padStart(6, '0')}` } });
      }
    }
  }
  return spills;
}
