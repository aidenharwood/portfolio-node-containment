import {
  assemblyInstanceOf,
  CHUNK_SIZE,
  chunkKey,
  doorKeyOf,
  chunkKeyOf,
  chunkOf,
  type ChunkCoord,
  type ChunkKey,
  type InstanceId,
  type TilePoint,
  type GameContent,
  GAME_CONTENT,
} from '@containment/shared';
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, type Vector3 } from 'three';
import type { ActiveZone } from '../../state/worldState.ts';
import { chunkSignature, objectChanges, type ChunkSignature } from './chunkSignature.ts';
import { planWallLighting, type FillLight, type SconceSpot, type WallLighting } from './wallLights.ts';
import { buildChunkPlaceholder } from './chunkPlaceholder.ts';
import { ownedLayoutOf } from './chunkStructure.ts';
import { chunkMesherPool, type ChunkMesherPool } from './chunkMesher.ts';
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
export const BUILD_RADIUS = 1;
const RETAIN_RADIUS = 2;
const BUILD_BUDGET_MS = 5;
const SETTLE_DELAY_MS = 300;
const CENTRE_BUDGET_SCALE = 3;
const PLACEHOLDERS_PER_FRAME = 2;

export const PREFETCH_RADIUS = 1;
const HEADING_EASE = 0.2;
const HEADING_MIN = 0.3;
const AHEAD_ALIGNMENT = 0.45;
const AHEAD_WEIGHT = 1.5;

export interface StreamReach {
  readonly build: number;
  readonly retain: number;
  readonly ahead?: number;
}

const DEFAULT_REACH: StreamReach = { build: BUILD_RADIUS, retain: RETAIN_RADIUS, ahead: PREFETCH_RADIUS };
const WORKER_REACH: StreamReach = { build: 2, retain: 3, ahead: 1 };

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
  private zone: ActiveZone;
  private readonly chunks = new Map<ChunkKey, { readonly coord: ChunkCoord; readonly view: ChunkView }>();
  private objectsByChunk: Map<ChunkKey, IndexedPlacement[]>;
  private sconcesByChunk: Map<ChunkKey, SconceSpot[]>;
  private fillsByChunk: Map<ChunkKey, FillLight[]>;
  private lighting: WallLighting;
  private readonly signatures = new Map<ChunkKey, ChunkSignature>();
  private readonly shown = new Map<ChunkKey, ChunkSignature>();
  private readonly retiring = new Map<ChunkKey, ChunkView>();
  private settleAfter = 0;
  private readonly editable: boolean;
  private readonly content: GameContent | undefined;
  private deferredCentre: ChunkKey | null = null;
  private awaitingPaint = false;
  private pendingNearby = true;
  private readonly placeholders = new Map<ChunkKey, { readonly coord: ChunkCoord; readonly group: Group }>();
  private lastFocus: TilePoint | null = null;
  private heading = { x: 0, y: 0 };
  private centre: ChunkCoord | null = null;
  private readonly mesher: ChunkMesherPool | null;
  private readonly ringMaterial = new MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });

  constructor(zone: ActiveZone, options: { readonly editable?: boolean; readonly content?: GameContent } = {}) {
    this.zone = zone;
    this.content = options.content;
    this.editable = options.editable ?? false;
    this.mesher = !this.editable && GAME_CONTENT.levels.get(zone.definition.id) === zone.definition ? chunkMesherPool() : null;
    this.lighting = planWallLighting(zone);
    this.objectsByChunk = groupByChunk(zone.definition.objects.map((placement, index) => ({ placement, index })), ({ placement }) => placement.position);
    this.sconcesByChunk = groupByChunk(this.lighting.sconces, (spot) => spot.floor);
    this.fillsByChunk = groupByChunk(this.lighting.fills, (fill) => fill.position);
  }

  canPatch(zone: ActiveZone): boolean {
    return this.editable && zone.layout.width === this.zone.layout.width && zone.layout.height === this.zone.layout.height && zone.definition.id === this.zone.definition.id;
  }

  patch(zone: ActiveZone): { readonly rebuilt: number; readonly patched: number; readonly settling: number } {
    const lighting = planWallLighting(zone);
    type Plan = { readonly key: ChunkKey; readonly coord: ChunkCoord; readonly mode: 'rebuild' | 'objects' | 'settle'; readonly next: ChunkSignature };
    const plans: Plan[] = [];
    for (const key of new Set([...this.chunks.keys(), ...this.retiring.keys()])) {
      const entry = this.chunks.get(key);
      const displayed = this.displayed(key);
      if (!displayed || !entry) {
        if (entry && !displayed) {
          entry.view.dispose();
          this.chunks.delete(key);
          this.signatures.delete(key);
        }
        continue;
      }
      const before = this.shown.get(key);
      const next = chunkSignature(zone, entry.coord, lighting);
      if (!before || before.tiles !== next.tiles) plans.push({ key, coord: entry.coord, mode: 'rebuild', next });
      else {
        const changes = objectChanges(before, next);
        if (changes.added.length > 0 || changes.removed.length > 0) plans.push({ key, coord: entry.coord, mode: 'objects', next });
        else if (before.settle !== next.settle || !entry.view.ready) plans.push({ key, coord: entry.coord, mode: 'settle', next });
      }
    }
    this.zone = zone;
    this.lighting = lighting;
    this.objectsByChunk = groupByChunk(zone.definition.objects.map((placement, index) => ({ placement, index })), ({ placement }) => placement.position);
    this.sconcesByChunk = groupByChunk(lighting.sconces, (spot) => spot.floor);
    this.fillsByChunk = groupByChunk(lighting.fills, (fill) => fill.position);
    for (const plan of plans) {
      const displayed = this.displayed(plan.key);
      const before = this.shown.get(plan.key);
      if (plan.mode === 'objects' && displayed && before) {
        const { removed, added } = objectChanges(before, plan.next);
        for (const placement of removed) {
          const view = displayed.removeObject(placement.instanceId);
          if (view && this.objects.get(view.instanceId) === view) this.objects.delete(view.instanceId);
        }
        for (const { placement, index } of added) {
          const view = displayed.placeObject(placement, index);
          if (view) this.objects.set(view.instanceId, view);
        }
        this.shown.set(plan.key, { ...before, objects: plan.next.objects });
      }
      const building = this.chunks.get(plan.key)?.view;
      if (building && building === displayed) this.retiring.set(plan.key, building);
      else building?.dispose();
      this.chunks.delete(plan.key);
      this.signatures.delete(plan.key);
      const fresh = this.ensureChunk(plan.coord);
      if (!fresh) this.retire(plan.key);
      else if (plan.mode === 'rebuild') this.buildChunk(fresh, Infinity);
    }
    this.settleAfter = performance.now() + SETTLE_DELAY_MS;
    const count = (mode: Plan['mode']): number => plans.filter((plan) => plan.mode === mode).length;
    return { rebuilt: count('rebuild'), patched: count('objects'), settling: count('objects') + count('settle') };
  }

  private displayed(key: ChunkKey): ChunkView | null {
    const retiring = this.retiring.get(key);
    if (retiring) return retiring;
    const view = this.chunks.get(key)?.view;
    return view?.ready ? view : null;
  }

  private retire(key: ChunkKey): void {
    const old = this.retiring.get(key);
    if (!old) return;
    this.retiring.delete(key);
    if (!this.chunks.has(key)) this.shown.delete(key);
    for (const object of old.objects) if (this.objects.get(object.instanceId) === object) this.objects.delete(object.instanceId);
    old.dispose();
  }

  get loading(): boolean {
    return this.pendingNearby;
  }

  get builtChunks(): readonly ChunkKey[] {
    return [...this.chunks].filter(([, { view }]) => view.ready).map(([key]) => key);
  }

  get lights(): LightSource[] {
    return [...this.readyViews(), ...this.retiring.values()].flatMap((view) => view.lights);
  }

  stream(focus: TilePoint, budgetMs = BUILD_BUDGET_MS, reachOverride?: StreamReach): void {
    const reach = reachOverride ?? (this.mesher ? WORKER_REACH : DEFAULT_REACH);
    const centre = chunkOf({ x: Math.round(focus.x), y: Math.round(focus.y) });
    this.centre = centre;
    this.followHeading(focus);
    const centreView = this.ensureChunk(centre);
    if (this.mesher && centreView && !centreView.ready && !this.displayed(chunkKey(centre))) this.placeholderFor(centre);
    if (!this.mesher && centreView && !centreView.ready && !this.retiring.has(chunkKey(centre)) && !this.placeholders.has(chunkKey(centre))) {
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
    for (let dy = -reach.build; dy <= reach.build; dy++) {
      for (let dx = -reach.build; dx <= reach.build; dx++) neighbours.push({ cx: centre.cx + dx, cy: centre.cy + dy });
    }
    const centreWaiting = centreView !== null && !centreView.ready && !this.retiring.has(chunkKey(centre));
    const deadline = performance.now() + budgetMs * (centreWaiting ? CENTRE_BUDGET_SCALE : 1);
    const settling = performance.now() >= this.settleAfter;
    const queue = [...neighbours, ...this.aheadOf(centre, reach)];
    queue.sort((a, b) => this.priorityOf(a) - this.priorityOf(b));
    if (this.mesher) for (const coord of queue) this.ensureChunk(coord);
    for (const coord of queue) {
      if (performance.now() >= deadline) break;
      if (!settling && this.retiring.has(chunkKey(coord))) continue;
      const view = this.ensureChunk(coord);
      if (view && !view.ready) this.buildChunk(view, deadline);
    }
    this.pendingNearby = neighbours.some((coord) => {
      if (chunkDistance(coord, centre) > BUILD_RADIUS) return false;
      const entry = this.chunks.get(chunkKey(coord));
      return entry ? !entry.view.ready : chunkRegion(coord, this.zone) !== null;
    });
    this.showPlaceholders(queue);
    for (const [key, { coord, view }] of this.chunks) {
      if (chunkDistance(coord, centre) <= reach.retain) continue;
      for (const object of view.objects) this.objects.delete(object.instanceId);
      view.dispose();
      this.chunks.delete(key);
      this.signatures.delete(key);
      this.shown.delete(key);
      this.retire(key);
    }
  }

  private aheadOf(centre: ChunkCoord, reach: StreamReach): ChunkCoord[] {
    const ahead = Math.min(reach.ahead ?? 0, reach.retain - reach.build);
    const strength = Math.hypot(this.heading.x, this.heading.y);
    if (ahead <= 0 || strength < HEADING_MIN) return [];
    const out: ChunkCoord[] = [];
    const outer = reach.build + ahead;
    for (let dy = -outer; dy <= outer; dy++) {
      for (let dx = -outer; dx <= outer; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= reach.build) continue;
        if ((dx * this.heading.x + dy * this.heading.y) / (Math.hypot(dx, dy) * strength) < AHEAD_ALIGNMENT) continue;
        out.push({ cx: centre.cx + dx, cy: centre.cy + dy });
      }
    }
    return out;
  }

  private priorityOf(coord: ChunkCoord): number {
    const centre = this.centre;
    if (!centre) return 0;
    const dx = coord.cx - centre.cx;
    const dy = coord.cy - centre.cy;
    if (dx === 0 && dy === 0) return -Infinity;
    return Math.hypot(dx, dy) - AHEAD_WEIGHT * (dx * this.heading.x + dy * this.heading.y);
  }

  private followHeading(focus: TilePoint): void {
    const last = this.lastFocus;
    this.lastFocus = { x: focus.x, y: focus.y };
    if (!last) return;
    const dx = focus.x - last.x;
    const dy = focus.y - last.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-3) return;
    if (length > 2 * CHUNK_SIZE) {
      this.heading = { x: 0, y: 0 };
      return;
    }
    this.heading = { x: this.heading.x + (dx / length - this.heading.x) * HEADING_EASE, y: this.heading.y + (dy / length - this.heading.y) * HEADING_EASE };
  }

  private showPlaceholders(wanted: readonly ChunkCoord[]): void {
    const keep = new Set(wanted.map(chunkKey));
    for (const key of [...this.placeholders.keys()]) {
      if (keep.has(key) && !this.displayed(key)) continue;
      this.dropPlaceholder(key);
    }
    let allowance = this.placeholders.size === 0 ? Infinity : PLACEHOLDERS_PER_FRAME;
    for (const coord of wanted) {
      if (allowance <= 0) return;
      const key = chunkKey(coord);
      if (this.placeholders.has(key) || this.displayed(key)) continue;
      allowance--;
      this.placeholderFor(coord);
    }
  }

  private placeholderFor(coord: ChunkCoord): void {
    const key = chunkKey(coord);
    if (this.placeholders.has(key)) return;
    const region = chunkRegion(coord, this.zone);
    if (!region) return;
    const group = buildChunkPlaceholder(ownedLayoutOf(this.zone.definition, this.zone.layout), region);
    if (!group) return;
    this.placeholders.set(key, { coord, group });
    this.root.add(group);
  }

  private dropPlaceholder(key: ChunkKey): void {
    const placeholder = this.placeholders.get(key);
    if (!placeholder) return;
    placeholder.group.removeFromParent();
    placeholder.group.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
    this.placeholders.delete(key);
  }

  get placeholderChunks(): readonly ChunkKey[] {
    return [...this.placeholders.keys()];
  }

  private readyViews(): ChunkView[] {
    return [...this.chunks.values()].filter(({ view }) => view.ready).map(({ view }) => view);
  }

  private buildChunk(view: ChunkView, deadline: number): void {
    if (!view.build(deadline)) return;
    const key = chunkKeyOf({ x: view.region.x, y: view.region.y });
    this.retire(key);
    const signature = this.signatures.get(key);
    if (signature) this.shown.set(key, signature);
    this.root.add(view.root);
    this.dropPlaceholder(key);
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
    for (const view of this.retiring.values()) view.update(time);
    this.ringMaterial.opacity = 0.55 + Math.sin(time * 3) * 0.3;
  }

  private slideDoor(view: ObjectView, doors: DoorView, nearDoors: ReadonlySet<string>): void {
    const target = nearDoors.has(doorGroupOf(view)) && doors.open.has(doorKeyOf(view.definition)) ? view.ground - view.height - 0.05 : view.ground;
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
    for (const view of [...this.readyViews(), ...this.retiring.values()]) {
      for (const wall of view.walls) apply(wall, blocksView(wall.tile, 0));
      for (const fixture of view.fixtures) apply(fixture, blocksView(fixture.tile, 0));
      view.applyFades();
    }
  }

  dispose(): void {
    for (const key of [...this.placeholders.keys()]) this.dropPlaceholder(key);
    for (const { view } of this.chunks.values()) view.dispose();
    for (const view of this.retiring.values()) view.dispose();
    this.retiring.clear();
    this.shown.clear();
    this.signatures.clear();
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
    const mesher = this.mesher;
    const levelId = this.zone.definition.id;
    const requestStructure = mesher ? (area: typeof region) => mesher.request(levelId, area, () => this.priorityOf(coord)) : undefined;
    const view = new ChunkView(this.zone, region, contents, this.ringMaterial, { separateObjects: this.editable, ...(this.content ? { content: this.content } : {}), ...(requestStructure ? { requestStructure } : {}) });
    this.chunks.set(key, { coord, view });
    if (this.editable) this.signatures.set(key, chunkSignature(this.zone, coord, this.lighting));
    return view;
  }
}
