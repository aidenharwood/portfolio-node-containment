import {
  assemblyInstanceOf,
  chunkKey,
  doorKeyOf,
  chunkKeyOf,
  chunkOf,
  type ChunkCoord,
  type ChunkKey,
  type InstanceId,
  type TilePoint,
} from '@containment/shared';
import { AdditiveBlending, Group, MeshBasicMaterial, type Vector3 } from 'three';
import type { ActiveZone } from '../../state/worldState.ts';
import { planWallLighting, type FillLight, type SconceSpot } from './wallLights.ts';
import { ChunkView, chunkRegion, type ChunkContents, type IndexedPlacement, type LightSource, type ObjectView, type WallPiece } from './chunkView.ts';

export type { LightSource, ObjectView, WallPiece } from './chunkView.ts';

export interface DoorView {
  readonly open: ReadonlySet<string>;
  readonly self: TilePoint | null;
}

const DOOR_OPEN_RANGE = 2.6;

const doorGroupOf = (view: ObjectView): string => assemblyInstanceOf(view.instanceId) ?? view.instanceId;
const FADE_RADIUS = 1.4;
const FADE_REACH = 7;
const DEPLETED_HEIGHT = 0.35;
const BUILD_RADIUS = 1;
const RETAIN_RADIUS = 2;
const BUILD_BUDGET_MS = 5;

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
  private readonly sconcesByChunk: Map<ChunkKey, SconceSpot[]>;
  private readonly fillsByChunk: Map<ChunkKey, FillLight[]>;
  private deferredCentre: ChunkKey | null = null;
  private awaitingPaint = false;
  private pendingNearby = true;
  private readonly ringMaterial = new MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

  constructor(zone: ActiveZone) {
    this.zone = zone;
    this.objectsByChunk = groupByChunk(zone.definition.objects.map((placement, index) => ({ placement, index })), ({ placement }) => placement.position);
    const lighting = planWallLighting(zone);
    this.sconcesByChunk = groupByChunk(lighting.sconces, (spot) => spot.floor);
    this.fillsByChunk = groupByChunk(lighting.fills, (fill) => fill.position);
  }

  get loading(): boolean {
    return this.pendingNearby;
  }

  get builtChunks(): readonly ChunkKey[] {
    return [...this.chunks].filter(([, { view }]) => view.ready).map(([key]) => key);
  }

  get lights(): LightSource[] {
    return this.readyViews().flatMap((view) => view.lights);
  }

  stream(focus: TilePoint, budgetMs = BUILD_BUDGET_MS): void {
    const centre = chunkOf({ x: Math.round(focus.x), y: Math.round(focus.y) });
    const centreView = this.ensureChunk(centre);
    if (centreView && !centreView.ready) {
      const key = chunkKey(centre);
      if (this.deferredCentre !== key) {
        this.deferredCentre = key;
        this.awaitingPaint = true;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          this.awaitingPaint = false;
        }));
      }
      if (this.awaitingPaint) {
        this.pendingNearby = true;
        return;
      }
      this.buildChunk(centreView, Infinity);
    }
    this.deferredCentre = null;
    const neighbours: ChunkCoord[] = [];
    for (let dy = -BUILD_RADIUS; dy <= BUILD_RADIUS; dy++) {
      for (let dx = -BUILD_RADIUS; dx <= BUILD_RADIUS; dx++) neighbours.push({ cx: centre.cx + dx, cy: centre.cy + dy });
    }
    const deadline = performance.now() + budgetMs;
    for (const coord of neighbours.sort((a, b) => Math.hypot(a.cx - centre.cx, a.cy - centre.cy) - Math.hypot(b.cx - centre.cx, b.cy - centre.cy))) {
      if (performance.now() >= deadline) break;
      const view = this.ensureChunk(coord);
      if (view && !view.ready) this.buildChunk(view, deadline);
    }
    this.pendingNearby = neighbours.some((coord) => {
      const entry = this.chunks.get(chunkKey(coord));
      return entry ? !entry.view.ready : chunkRegion(coord, this.zone) !== null;
    });
    for (const [key, { coord, view }] of this.chunks) {
      if (chunkDistance(coord, centre) <= RETAIN_RADIUS) continue;
      for (const object of view.objects) this.objects.delete(object.instanceId);
      view.dispose();
      this.chunks.delete(key);
    }
  }

  private readyViews(): ChunkView[] {
    return [...this.chunks.values()].filter(({ view }) => view.ready).map(({ view }) => view);
  }

  private buildChunk(view: ChunkView, deadline: number): void {
    if (!view.build(deadline)) return;
    this.root.add(view.root);
    for (const object of view.objects) this.objects.set(object.instanceId, object);
  }

  update(time: number, objectiveObjectIds: ReadonlySet<string>, depletedObjects: ReadonlySet<string>, usedObjects: ReadonlySet<string>, doors: DoorView): void {
    const nearDoors = new Set<string>();
    if (doors.self) {
      for (const view of this.objects.values()) {
        if (!view.definition.door) continue;
        if (Math.hypot(doors.self.x - view.placement.position.x, doors.self.y - view.placement.position.y) <= DOOR_OPEN_RANGE) nearDoors.add(doorGroupOf(view));
      }
    }
    for (const view of this.objects.values()) {
      if (view.definition.door) this.slideDoor(view, doors, nearDoors);
      const depleted = depletedObjects.has(view.instanceId);
      for (const { part, spec } of view.animated) {
        spec.animate(part, time, view.seed);
        if (depleted) part.visible = false;
      }
      const baseScale = view.definition.modelScale ?? 1;
      const targetHeight = baseScale * (depleted ? DEPLETED_HEIGHT : 1);
      view.group.scale.y += (targetHeight - view.group.scale.y) * 0.12;
      const isObjective = !depleted && !usedObjects.has(view.instanceId) && objectiveObjectIds.has(view.definition.id) && !(view.definition.countsAs && assemblyInstanceOf(view.instanceId));
      view.objectiveRing.visible = isObjective;
      if (isObjective) {
        const pulse = 1 + Math.sin(time * 3 + view.seed) * 0.08;
        view.objectiveRing.scale.set(pulse, pulse, 1);
      }
    }
    for (const view of this.readyViews()) view.update(time);
    this.ringMaterial.opacity = 0.55 + Math.sin(time * 3) * 0.3;
  }

  private slideDoor(view: ObjectView, doors: DoorView, nearDoors: ReadonlySet<string>): void {
    const target = nearDoors.has(doorGroupOf(view)) && doors.open.has(doorKeyOf(view.definition)) ? -view.height - 0.05 : 0;
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
      piece.batch.setFaded(piece.index, shouldFade);
    };
    for (const view of this.readyViews()) {
      for (const wall of view.walls) apply(wall, blocksView(wall.tile, 0));
      for (const fixture of view.fixtures) apply(fixture, blocksView(fixture.tile, 0));
      view.applyFades();
    }
  }

  dispose(): void {
    for (const { view } of this.chunks.values()) view.dispose();
    this.chunks.clear();
    this.objects.clear();
    this.ringMaterial.dispose();
  }

  private ensureChunk(coord: ChunkCoord): ChunkView | null {
    const key = chunkKey(coord);
    const existing = this.chunks.get(key);
    if (existing) return existing.view;
    const region = chunkRegion(coord, this.zone);
    if (!region) return null;
    const contents: ChunkContents = {
      objects: this.objectsByChunk.get(key) ?? [],
      sconces: this.sconcesByChunk.get(key) ?? [],
      fills: this.fillsByChunk.get(key) ?? [],
    };
    const view = new ChunkView(this.zone, region, contents, this.ringMaterial);
    this.chunks.set(key, { coord, view });
    return view;
  }
}
