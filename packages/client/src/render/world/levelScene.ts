import {
  chunkKey,
  chunkKeyOf,
  chunkOf,
  TILE_KINDS,
  type ChunkCoord,
  type ChunkKey,
  type InstanceId,
  type TilePoint,
  type ZoneLight,
} from '@containment/shared';
import { AdditiveBlending, Group, MeshBasicMaterial, type Vector3 } from 'three';
import type { ActiveZone } from '../../state/worldState.ts';
import { setVoxelObjectFaded } from '../voxel/voxelMaterials.ts';
import { ChunkView, chunkRegion, type ChunkContents, type FixtureSpot, type IndexedPlacement, type LightSource, type ObjectView, type WallPiece } from './chunkView.ts';

export type { LightSource, ObjectView, WallPiece } from './chunkView.ts';

export interface DoorView {
  readonly open: ReadonlySet<string>;
  readonly self: TilePoint | null;
}

const DOOR_OPEN_RANGE = 2.6;
const FADE_RADIUS = 1.4;
const FADE_REACH = 7;
const FIXTURE_SPACING = 4;
const FIXTURE_MIN_SEPARATION = 2.5;
const FIXTURE_OVERHEAD_ALLOWANCE = 1.2;
const DEPLETED_HEIGHT = 0.35;
const BUILD_RADIUS = 1;
const RETAIN_RADIUS = 2;
const NEIGHBOURS_BUILT_PER_FRAME = 1;

function ceilingFixtureSpots(zone: ActiveZone): FixtureSpot[] {
  const occupied = new Set(zone.definition.objects.map((placement) => `${placement.position.x},${placement.position.y}`));
  const isOpenFloor = (x: number, y: number) => TILE_KINDS[zone.layout.tileAt({ x, y })].walkable && !occupied.has(`${x},${y}`);
  const positions: TilePoint[] = [];
  const areas = [...zone.definition.areas].sort((a, b) => a.rect.width * a.rect.height - b.rect.width * b.rect.height);
  for (const { rect } of areas) {
    const columns = Math.max(1, Math.round(rect.width / FIXTURE_SPACING));
    const rows = Math.max(1, Math.round(rect.height / FIXTURE_SPACING));
    for (let column = 0; column < columns; column++) {
      for (let row = 0; row < rows; row++) {
        const x = Math.floor(rect.x + ((column + 0.5) * rect.width) / columns);
        const y = Math.floor(rect.y + ((row + 0.5) * rect.height) / rows);
        if (!isOpenFloor(x, y)) continue;
        if (positions.some((existing) => Math.hypot(existing.x - x, existing.y - y) < FIXTURE_MIN_SEPARATION)) continue;
        positions.push({ x, y });
      }
    }
  }
  return positions.map((position, index) => ({ position, index, failing: zone.definition.ambienceAt(position).fixtures === 'failing' }));
}

function groupByChunk<T>(entries: readonly T[], positionOf: (entry: T) => TilePoint): Map<ChunkKey, T[]> {
  const grouped = new Map<ChunkKey, T[]>();
  for (const entry of entries) {
    const key = chunkKeyOf(positionOf(entry));
    const bucket = grouped.get(key) ?? [];
    bucket.push(entry);
    grouped.set(key, bucket);
  }
  return grouped;
}

const chunkDistance = (a: ChunkCoord, b: ChunkCoord): number => Math.max(Math.abs(a.cx - b.cx), Math.abs(a.cy - b.cy));

export class LevelScene {
  readonly root = new Group();
  readonly objects = new Map<InstanceId, ObjectView>();
  private readonly zone: ActiveZone;
  private readonly chunks = new Map<ChunkKey, { readonly coord: ChunkCoord; readonly view: ChunkView }>();
  private readonly objectsByChunk: Map<ChunkKey, IndexedPlacement[]>;
  private readonly fixturesByChunk: Map<ChunkKey, FixtureSpot[]>;
  private readonly lightsByChunk: Map<ChunkKey, ZoneLight[]>;
  private readonly ringMaterial = new MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

  constructor(zone: ActiveZone) {
    this.zone = zone;
    this.objectsByChunk = groupByChunk(zone.definition.objects.map((placement, index) => ({ placement, index })), ({ placement }) => placement.position);
    this.fixturesByChunk = groupByChunk(ceilingFixtureSpots(zone), (spot) => spot.position);
    this.lightsByChunk = groupByChunk(zone.definition.lights, (light) => light.position);
  }

  get builtChunks(): readonly ChunkKey[] {
    return [...this.chunks.keys()];
  }

  get lights(): LightSource[] {
    return [...this.chunks.values()].flatMap(({ view }) => view.lights);
  }

  stream(focus: TilePoint): void {
    const centre = chunkOf({ x: Math.round(focus.x), y: Math.round(focus.y) });
    this.ensureChunk(centre);
    const neighbours: ChunkCoord[] = [];
    for (let dy = -BUILD_RADIUS; dy <= BUILD_RADIUS; dy++) {
      for (let dx = -BUILD_RADIUS; dx <= BUILD_RADIUS; dx++) {
        const coord = { cx: centre.cx + dx, cy: centre.cy + dy };
        if (!this.chunks.has(chunkKey(coord)) && chunkRegion(coord, this.zone)) neighbours.push(coord);
      }
    }
    neighbours.slice(0, NEIGHBOURS_BUILT_PER_FRAME).forEach((coord) => this.ensureChunk(coord));
    for (const [key, { coord, view }] of this.chunks) {
      if (chunkDistance(coord, centre) <= RETAIN_RADIUS) continue;
      for (const object of view.objects) this.objects.delete(object.instanceId);
      view.dispose();
      this.chunks.delete(key);
    }
  }

  update(time: number, objectiveObjectIds: ReadonlySet<string>, depletedObjects: ReadonlySet<string>, doors: DoorView): void {
    for (const view of this.objects.values()) {
      if (view.definition.door) this.slideDoor(view, doors);
      const depleted = depletedObjects.has(view.instanceId);
      for (const { part, spec } of view.animated) {
        spec.animate(part, time, view.seed);
        if (depleted) part.visible = false;
      }
      const baseScale = view.definition.modelScale ?? 1;
      const targetHeight = baseScale * (depleted ? DEPLETED_HEIGHT : 1);
      view.group.scale.y += (targetHeight - view.group.scale.y) * 0.12;
      const isObjective = !depleted && objectiveObjectIds.has(view.definition.id);
      view.objectiveRing.visible = isObjective;
      if (isObjective) {
        const pulse = 1 + Math.sin(time * 3 + view.seed) * 0.08;
        view.objectiveRing.scale.set(pulse, pulse, 1);
      }
    }
    for (const { view } of this.chunks.values()) view.update(time);
    this.ringMaterial.opacity = 0.55 + Math.sin(time * 3) * 0.3;
  }

  private slideDoor(view: ObjectView, doors: DoorView): void {
    const near = doors.self !== null && Math.hypot(doors.self.x - view.placement.position.x, doors.self.y - view.placement.position.y) <= DOOR_OPEN_RANGE;
    const target = near && doors.open.has(view.definition.id) ? -view.height - 0.05 : 0;
    view.group.position.y += (target - view.group.position.y) * 0.14;
  }

  updateCutaway(camera: Vector3, focus: Vector3): void {
    const toCameraX = camera.x - focus.x;
    const toCameraZ = camera.z - focus.z;
    const length = Math.sqrt(toCameraX * toCameraX + toCameraZ * toCameraZ) || 1;
    const blocksView = (tile: TilePoint, overheadAllowance: number): boolean => {
      const offsetX = tile.x - focus.x;
      const offsetZ = tile.y - focus.z;
      const alongDistance = (offsetX * toCameraX + offsetZ * toCameraZ) / length;
      const perpendicular = Math.abs(offsetX * toCameraZ - offsetZ * toCameraX) / length;
      return alongDistance > -overheadAllowance && alongDistance < FADE_REACH && perpendicular < FADE_RADIUS + Math.max(0, alongDistance) * 0.12;
    };
    const apply = (piece: WallPiece, shouldFade: boolean) => {
      if (shouldFade === piece.faded) return;
      piece.faded = shouldFade;
      setVoxelObjectFaded(piece.group, shouldFade);
    };
    for (const { view } of this.chunks.values()) {
      for (const wall of view.walls) apply(wall, blocksView(wall.tile, 0));
      for (const fixture of view.fixtures) apply(fixture, blocksView(fixture.tile, FIXTURE_OVERHEAD_ALLOWANCE));
    }
  }

  dispose(): void {
    for (const { view } of this.chunks.values()) view.dispose();
    this.chunks.clear();
    this.objects.clear();
    this.ringMaterial.dispose();
  }

  private ensureChunk(coord: ChunkCoord): void {
    const key = chunkKey(coord);
    if (this.chunks.has(key)) return;
    const region = chunkRegion(coord, this.zone);
    if (!region) return;
    const contents: ChunkContents = {
      objects: this.objectsByChunk.get(key) ?? [],
      fixtures: this.fixturesByChunk.get(key) ?? [],
      lights: this.lightsByChunk.get(key) ?? [],
    };
    const view = new ChunkView(this.zone, region, contents, this.ringMaterial);
    this.root.add(view.root);
    for (const object of view.objects) this.objects.set(object.instanceId, object);
    this.chunks.set(key, { coord, view });
  }
}
