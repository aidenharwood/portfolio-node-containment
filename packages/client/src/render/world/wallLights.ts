import { isBuildingWall, isOutdoorFloor, TILE_KINDS, type Facing, type ResolvedArea, type TilePoint, type ZoneLight } from '@containment/shared';
import type { ActiveZone } from '../../state/worldState.ts';
import { noise3 } from '../voxel/palette.ts';
import { ownedLayoutOf } from './chunkStructure.ts';
import { litWindowGlow, NEON_RUN, rooflineNeonGlow, type Side } from './levelVoxels.ts';

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
const NEON_SPILL_INTENSITY = 0.55;
const NEON_SPILL_RADIUS = 3.2;
const NEON_SPILL_SPACING = 6;
const NIGHT_SPILL_FROM = 0.4;
const NIGHT_SPILL_SPAN = 0.2;
const NIGHT_SPILL_GAIN = 0.8;
const WINDOW_SIDES: readonly Side[] = ['south', 'east', 'west', 'north'];

export const FACING_STEP: Readonly<Record<Facing, TilePoint>> = { north: { x: 0, y: -1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 }, south: { x: 0, y: 1 } };
const MOUNT_PREFERENCE: readonly Facing[] = ['north', 'east', 'west', 'south'];

export interface Mount {
  readonly floor: TilePoint;
  readonly wall: TilePoint;
  readonly facing: Facing;
}

export function indoorsOf(zone: ActiveZone): (point: TilePoint) => boolean {
  return ownedLayoutOf(zone.definition, zone.layout).interiorAt ?? ((point) => !isOutdoorFloor(zone.layout.tileAt(point)));
}

export function mountsIn(zone: ActiveZone, area: Pick<ResolvedArea, 'rect' | 'districtId'>, occupied: ReadonlySet<string>): Mount[] {
  const tile = (x: number, y: number) => zone.layout.tileAt({ x, y });
  const indoors = indoorsOf(zone);
  const owners = zone.definition.layout;
  const { rect } = area;
  const mounts: Mount[] = [];
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      if (owners.districtAt({ x, y }) !== area.districtId) continue;
      if (!TILE_KINDS[tile(x, y)].walkable || !indoors({ x, y }) || tile(x, y) === 'door' || occupied.has(`${x},${y}`)) continue;
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
  fills.push(...facadeSpills(zone, fills));
  return { sconces, fills };
}

const hexColor = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

function facadeSpills(zone: ActiveZone, existing: readonly FillLight[]): FillLight[] {
  const { layout } = zone;
  const indoors = indoorsOf(zone);
  const nightGain = (point: TilePoint): number => 1 + NIGHT_SPILL_GAIN * Math.min(1, Math.max(0, (zone.definition.ambienceAt(point).darkness - NIGHT_SPILL_FROM) / NIGHT_SPILL_SPAN));
  const runs = new Map<string, { readonly color: number; readonly positions: TilePoint[] }>();
  const windows: { readonly position: TilePoint; readonly glow: number }[] = [];
  for (let ty = 0; ty < layout.height; ty++) {
    for (let tx = 0; tx < layout.width; tx++) {
      const material = layout.tileAt({ x: tx, y: ty });
      if (!isBuildingWall(material)) continue;
      for (const side of WINDOW_SIDES) {
        const step = FACING_STEP[side];
        const position = { x: tx + step.x, y: ty + step.y };
        const outside = layout.tileAt(position);
        if (!TILE_KINDS[outside].walkable || outside === 'door' || indoors(position)) continue;
        const neon = rooflineNeonGlow(material, tx, ty, side);
        if (neon !== null) {
          const key = step.x === 0 ? `${side}:${Math.floor(tx / NEON_RUN)}:${ty}` : `${side}:${tx}:${Math.floor(ty / NEON_RUN)}`;
          const run = runs.get(key) ?? { color: neon, positions: [] };
          run.positions.push(position);
          runs.set(key, run);
        }
        const glow = litWindowGlow(material, tx, ty, side);
        if (glow !== null) windows.push({ position, glow });
      }
    }
  }
  const spills: FillLight[] = [];
  const within = (point: TilePoint, spacing: number) => (fill: FillLight) => Math.hypot(fill.position.x - point.x, fill.position.y - point.y) < spacing;
  for (const { color, positions } of runs.values()) {
    const position = positions[Math.floor(positions.length / 2)] as TilePoint;
    if (existing.some(within(position, NEON_SPILL_SPACING)) || spills.some(within(position, NEON_SPILL_SPACING))) continue;
    spills.push({ position, light: { position, radius: NEON_SPILL_RADIUS, intensity: NEON_SPILL_INTENSITY * nightGain(position), color: hexColor(color) } });
  }
  for (const { position, glow } of windows) {
    if (existing.some(within(position, WINDOW_SPILL_SPACING)) || spills.some(within(position, WINDOW_SPILL_SPACING))) continue;
    spills.push({ position, light: { position, radius: WINDOW_SPILL_RADIUS, intensity: WINDOW_SPILL_INTENSITY * nightGain(position), color: hexColor(glow) } });
  }
  return spills;
}
