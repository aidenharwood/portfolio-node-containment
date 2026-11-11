import {
  CHUNK_SIZE,
  GAME_CONTENT,
  TILE_KINDS,
  tileKey,
  type ChunkCoord,
  type Facing,
  type InstanceId,
  type ObjectPlacement,
  type TilePoint,
  type TileRect,
  type WorldObjectDefinition,
  type ZoneLight,
} from '@containment/shared';
import { Group, Matrix4, Mesh, Quaternion, RingGeometry, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import type { ActiveZone } from '../../state/worldState.ts';
import { buildObjectModel, type AnimatedPart } from '../models/objectModels.ts';
import { hex, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { mergeVoxelGeometries, type VoxelGeometryPart } from '../voxel/mergeVoxelGeometry.ts';
import { meshVoxels, type VoxelMeshes } from '../voxel/voxelMesher.ts';
import { createVoxelObject, type VoxelLayer, type VoxelObjectOptions } from '../voxel/voxelMaterials.ts';
import { FadeBatch } from './fadeBatch.ts';
import { LiquidSurface } from './liquidSurface.ts';
import { buildFloorScatter } from './floorScatter.ts';
import { createTileVolume, paintTileRows } from './levelVoxels.ts';
import { MODEL_VOXEL_SIZE, TILE_RESOLUTION, WALL_HEIGHT, ZONE_MESH_ORIGIN, ZONE_VOLUME_HEIGHT, ZONE_VOXEL_SIZE } from './worldScale.ts';

export interface LightSource {
  readonly position: Vector3;
  readonly color: number;
  readonly intensity: number;
  readonly radius: number;
  readonly flicker: boolean;
  readonly shadow: boolean;
  readonly seed: number;
}

export interface WallPiece {
  readonly tile: TilePoint;
  readonly batch: FadeBatch;
  readonly index: number;
  faded: boolean;
}

export interface ObjectView {
  readonly instanceId: InstanceId;
  readonly placement: ObjectPlacement;
  readonly definition: WorldObjectDefinition;
  readonly group: Group;
  readonly objectiveRing: Mesh;
  readonly height: number;
  readonly animated: readonly { readonly part: Object3D; readonly spec: AnimatedPart }[];
  readonly seed: number;
}

export interface FixtureSpot {
  readonly position: TilePoint;
  readonly index: number;
  readonly failing: boolean;
}

export interface IndexedPlacement {
  readonly placement: ObjectPlacement;
  readonly index: number;
}

export interface ChunkContents {
  readonly objects: readonly IndexedPlacement[];
  readonly fixtures: readonly FixtureSpot[];
  readonly lights: readonly ZoneLight[];
}

const OBJECT_FACING_YAW: Readonly<Record<Facing, number>> = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };
export const CEILING_FIXTURE_HEIGHT = WALL_HEIGHT - 0.06;
const CEILING_LIGHT_COLOR = 0xe6f2ff;
const FAILING_LIGHT_COLOR = 0xff8a6a;

export function chunkRegion(chunk: ChunkCoord, zone: ActiveZone): TileRect | null {
  const x = chunk.cx * CHUNK_SIZE;
  const y = chunk.cy * CHUNK_SIZE;
  const width = Math.min(CHUNK_SIZE, zone.layout.width - x);
  const height = Math.min(CHUNK_SIZE, zone.layout.height - y);
  if (chunk.cx < 0 || chunk.cy < 0 || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function hasStructure(zone: ActiveZone, region: TileRect): boolean {
  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      if (zone.layout.tileAt({ x, y }) !== 'void') return true;
    }
  }
  return false;
}

interface ObjectMeshes {
  readonly base: VoxelMeshes;
  readonly animated: readonly { readonly meshes: VoxelMeshes; readonly spec: AnimatedPart }[];
  readonly heightVoxels: number;
}

const OBJECT_MESH_CACHE = new Map<string, ObjectMeshes>();
const SHARED_GEOMETRY = new WeakSet<BufferGeometry>();
const OBJECTIVE_RING_GEOMETRY = new RingGeometry(0.52, 0.62, 32);
SHARED_GEOMETRY.add(OBJECTIVE_RING_GEOMETRY);
const VOXEL_LAYERS: readonly VoxelLayer[] = ['solid', 'emissive', 'glass'];
const UP = new Vector3(0, 1, 0);
const MODEL_VARIANTS = 8;
const STRIP_ROWS = 2;
const BAND_ROWS = 8;

const bandsOf = (region: TileRect): number[] => {
  const bands: number[] = [];
  for (let band = Math.floor(region.y / BAND_ROWS); band <= Math.floor((region.y + region.height - 1) / BAND_ROWS); band++) bands.push(band);
  return bands;
};
const FIXTURE_MESH_CACHE = new Map<boolean, VoxelMeshes>();

const isStaticDecor = (definition: WorldObjectDefinition, parts: ObjectMeshes): boolean =>
  definition.interactions.length === 0 && !definition.door && !definition.light && parts.animated.length === 0;

const shareMeshes = (meshes: VoxelMeshes): VoxelMeshes => {
  for (const layer of VOXEL_LAYERS) {
    const geometry = meshes[layer];
    if (geometry) SHARED_GEOMETRY.add(geometry);
  }
  return meshes;
};

const objectMeshesFor = (model: WorldObjectDefinition['model'], seed: number): ObjectMeshes => {
  const key = `${model}:${seed}`;
  const cached = OBJECT_MESH_CACHE.get(key);
  if (cached) return cached;
  const parts = buildObjectModel(model, seed);
  const built = {
    base: shareMeshes(parts.base.mesh(MODEL_VOXEL_SIZE)),
    animated: parts.animated.map((spec) => ({ meshes: shareMeshes(spec.model.mesh(MODEL_VOXEL_SIZE)), spec })),
    heightVoxels: parts.heightVoxels,
  };
  OBJECT_MESH_CACHE.set(key, built);
  return built;
};

export class ChunkView {
  readonly root = new Group();
  readonly walls: WallPiece[] = [];
  readonly fixtures: WallPiece[] = [];
  readonly objects: ObjectView[] = [];
  readonly lights: LightSource[] = [];
  private coolant: LiquidSurface | null = null;
  private readonly ringMaterial: Material;
  private readonly decor = new Map<number, Record<VoxelLayer, VoxelGeometryPart[]>>();
  private readonly fixturePieces: { readonly tile: TilePoint; readonly meshes: VoxelMeshes }[] = [];
  private readonly batches: FadeBatch[] = [];
  private readonly steps: ((() => void) | undefined)[] = [];
  private nextStep = 0;

  constructor(zone: ActiveZone, region: TileRect, contents: ChunkContents, ringMaterial: Material) {
    this.ringMaterial = ringMaterial;
    if (hasStructure(zone, region)) this.planStructure(zone, region, new Set(contents.objects.map(({ placement }) => tileKey(placement.position))));
    contents.objects.forEach(({ placement, index }) => this.steps.push(() => this.addObject(placement, index)));
    bandsOf(region).forEach((band) => this.steps.push(() => this.buildDecor(band)));
    contents.fixtures.forEach((spot) => this.steps.push(() => this.addCeilingFixture(spot)));
    this.steps.push(() => {
      this.buildFixtures();
      contents.lights.forEach((light, index) => {
        this.lights.push({
          position: new Vector3(light.position.x, WALL_HEIGHT + 0.6, light.position.y),
          color: hex(light.color),
          intensity: light.intensity,
          radius: light.radius,
          flicker: false,
          shadow: true,
          seed: light.position.x * 13 + light.position.y + index,
        });
      });
    });
  }

  get ready(): boolean {
    return this.nextStep >= this.steps.length;
  }

  build(deadline: number): boolean {
    do {
      const step = this.steps[this.nextStep];
      if (!step) break;
      this.steps[this.nextStep] = undefined;
      this.nextStep++;
      step();
    } while (performance.now() < deadline);
    return this.ready;
  }

  update(time: number): void {
    this.coolant?.update(time);
  }

  applyFades(): void {
    for (const batch of this.batches) batch.flush();
  }

  private addBatch(name: string, tiles: readonly TilePoint[], pieces: readonly VoxelMeshes[], options: VoxelObjectOptions, into: WallPiece[]): void {
    if (pieces.length === 0) return;
    const batch = new FadeBatch(pieces, options);
    batch.root.name = name;
    this.root.add(batch.root);
    this.batches.push(batch);
    tiles.forEach((tile, index) => into.push({ tile, batch, index, faded: false }));
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((child) => {
      if (child instanceof Mesh && !SHARED_GEOMETRY.has(child.geometry)) child.geometry.dispose();
    });
    this.coolant?.dispose();
  }

  private planStructure(zone: ActiveZone, region: TileRect, occupied: ReadonlySet<string>): void {
    const { layout } = zone;
    const volume = createTileVolume(region);
    const meshOptions = { voxelSize: ZONE_VOXEL_SIZE, origin: ZONE_MESH_ORIGIN };
    const R = TILE_RESOLUTION;
    const lastRow = region.y + region.height;
    for (let row = region.y - 1; row <= lastRow; row += STRIP_ROWS) {
      this.steps.push(() => paintTileRows(volume, layout, region, row, row + STRIP_ROWS));
    }
    const floorClip = {
      min: [region.x * R, 0, region.y * R] as const,
      max: [(region.x + region.width) * R, 2, lastRow * R] as const,
    };
    for (let row = region.y; row < lastRow; row += STRIP_ROWS) {
      const strip = { x: region.x, y: row, width: region.width, height: Math.min(STRIP_ROWS, lastRow - row) };
      this.steps.push(() => {
        const bounds = { min: [floorClip.min[0], 0, strip.y * R] as const, max: [floorClip.max[0], 2, (strip.y + strip.height) * R] as const };
        const floor = createVoxelObject(meshVoxels(volume, bounds, { ...meshOptions, clipBounds: floorClip }), { castShadow: false });
        floor.name = 'floor';
        this.root.add(floor);
      });
      this.steps.push(() => {
        const scatter = buildFloorScatter(layout, strip, (tile) => occupied.has(tileKey(tile)));
        if (scatter.isEmpty) return;
        const litter = createVoxelObject(scatter.mesh(MODEL_VOXEL_SIZE), { castShadow: false });
        litter.name = 'floorScatter';
        this.root.add(litter);
      });
    }

    const walls = new Map<number, { readonly tiles: TilePoint[]; readonly pieces: VoxelMeshes[] }>();
    for (let ty = region.y; ty < lastRow; ty++) {
      const band = walls.get(Math.floor(ty / BAND_ROWS)) ?? { tiles: [], pieces: [] };
      walls.set(Math.floor(ty / BAND_ROWS), band);
      this.steps.push(() => {
        for (let tx = region.x; tx < region.x + region.width; tx++) {
          const kind = layout.tileAt({ x: tx, y: ty });
          if (TILE_KINDS[kind].structure !== 'wall' && kind !== 'door') continue;
          const bounds = {
            min: [tx * R, 2, ty * R] as const,
            max: [(tx + 1) * R, ZONE_VOLUME_HEIGHT, (ty + 1) * R] as const,
          };
          const meshes = meshVoxels(volume, bounds, meshOptions);
          if (!meshes.solid && !meshes.emissive && !meshes.glass) continue;
          band.tiles.push({ x: tx, y: ty });
          band.pieces.push(meshes);
        }
      });
    }
    for (const band of walls.values()) this.steps.push(() => this.addBatch('walls', band.tiles, band.pieces, {}, this.walls));
    this.steps.push(() => {
      this.coolant = LiquidSurface.build(layout, 'coolant', region);
      if (this.coolant) this.root.add(this.coolant.mesh);
    });
  }

  private addObject(placement: ObjectPlacement, index: number): void {
    const definition = GAME_CONTENT.worldObjects.get(placement.objectId);
    if (!definition) return;
    const seed = (placement.position.x * 31 + placement.position.y * 17 + index) % 97;
    const parts = objectMeshesFor(definition.model, seed % MODEL_VARIANTS);
    const scale = definition.modelScale ?? 1;
    if (isStaticDecor(definition, parts)) {
      this.addDecor(parts.base, placement, scale);
      return;
    }

    const group = new Group();
    group.position.set(placement.position.x, 0, placement.position.y);
    group.scale.setScalar(scale);
    group.rotation.y = OBJECT_FACING_YAW[placement.facing ?? 'south'];
    group.add(createVoxelObject(parts.base));
    const animated = parts.animated.map(({ meshes, spec }) => {
      const part = createVoxelObject(meshes, { castShadow: false });
      group.add(part);
      return { part, spec };
    });
    group.userData.pick = { kind: 'object', instanceId: placement.instanceId };

    const objectiveRing = new Mesh(OBJECTIVE_RING_GEOMETRY, this.ringMaterial);
    objectiveRing.rotation.x = -Math.PI / 2;
    objectiveRing.position.set(placement.position.x, 0.02, placement.position.y);
    objectiveRing.visible = false;

    this.root.add(group, objectiveRing);
    const height = parts.heightVoxels * MODEL_VOXEL_SIZE * scale;
    this.objects.push({ instanceId: placement.instanceId, placement, definition, group, objectiveRing, height, animated, seed });

    if (definition.light) {
      this.lights.push({
        position: new Vector3(placement.position.x, Math.max(height + 0.35, WALL_HEIGHT + 0.3), placement.position.y),
        color: hex(definition.light.color),
        intensity: definition.light.intensity,
        radius: definition.light.radius,
        flicker: definition.light.flicker ?? false,
        shadow: false,
        seed,
      });
    }
  }

  private addDecor(meshes: VoxelMeshes, placement: ObjectPlacement, scale: number): void {
    const transform = new Matrix4().compose(
      new Vector3(placement.position.x, 0, placement.position.y),
      new Quaternion().setFromAxisAngle(UP, OBJECT_FACING_YAW[placement.facing ?? 'south']),
      new Vector3(scale, scale, scale),
    );
    const band = Math.floor(placement.position.y / BAND_ROWS);
    const parts = this.decor.get(band) ?? { solid: [], emissive: [], glass: [] };
    this.decor.set(band, parts);
    for (const layer of VOXEL_LAYERS) {
      const geometry = meshes[layer];
      if (geometry) parts[layer].push({ geometry, transform });
    }
  }

  private buildDecor(band: number): void {
    const parts = this.decor.get(band);
    if (!parts) return;
    this.decor.delete(band);
    const merged: Record<VoxelLayer, BufferGeometry | null> = { solid: null, emissive: null, glass: null };
    for (const layer of VOXEL_LAYERS) {
      if (parts[layer].length > 0) merged[layer] = mergeVoxelGeometries(parts[layer]);
    }
    if (!merged.solid && !merged.emissive && !merged.glass) return;
    const decor = createVoxelObject(merged);
    decor.name = 'decor';
    this.root.add(decor);
  }

  private buildFixtures(): void {
    this.addBatch(
      'ceilingFixtures',
      this.fixturePieces.map(({ tile }) => tile),
      this.fixturePieces.map(({ meshes }) => meshes),
      { castShadow: false, receiveShadow: false },
      this.fixtures,
    );
    this.fixturePieces.length = 0;
  }

  private addCeilingFixture({ position, index, failing }: FixtureSpot): void {
    const meshes = ceilingFixtureMeshes(failing);
    const placed = (geometry: BufferGeometry | null) => geometry?.clone().translate(position.x, 0, position.y) ?? null;
    this.fixturePieces.push({ tile: position, meshes: { solid: placed(meshes.solid), emissive: placed(meshes.emissive), glass: placed(meshes.glass) } });
    this.lights.push({
      position: new Vector3(position.x, CEILING_FIXTURE_HEIGHT + 0.95, position.y),
      color: failing ? FAILING_LIGHT_COLOR : CEILING_LIGHT_COLOR,
      intensity: failing ? 1.05 : 1.2,
      radius: failing ? 6.5 : 6,
      flicker: failing ? index % 3 === 0 : noise3(position.x, position.y, 0, 77) > 0.93,
      shadow: true,
      seed: position.x * 7 + position.y,
    });
  }
}

function ceilingFixtureMeshes(failing: boolean): VoxelMeshes {
  const cached = FIXTURE_MESH_CACHE.get(failing);
  if (cached) return cached;
  const panelY = Math.round(CEILING_FIXTURE_HEIGHT / MODEL_VOXEL_SIZE);
  const panelColor = failing ? 0xd9846a : 0xb4d4e6;
  const panelStripe = failing ? 0x8a3a2a : 0x8fb3c8;
  const model = new VoxelModel();
  model.fill(-6, panelY, -3, 5, panelY + 1, 2, (x, y, z) => {
    const rim = x === -6 || x === 5 || z === -3 || z === 2 || y === panelY + 1;
    return rim ? 0x2a343b : null;
  });
  model.fill(-5, panelY, -2, 4, panelY, 1, (x) => (x === 0 ? panelStripe : panelColor), VOXEL_EMISSIVE);
  for (const x of [-5, 4]) model.fill(x, panelY + 2, 0, x, panelY + 12, 0, 0x1b2228);
  const meshes = model.mesh(MODEL_VOXEL_SIZE);
  FIXTURE_MESH_CACHE.set(failing, meshes);
  return meshes;
}
