import {
  assemblyInstanceOf,
  CHUNK_SIZE,
  GAME_CONTENT,
  type GameContent,
  objectFootprintSize,
  objectFootprintTiles,
  TILE_KINDS,
  tileKey,
  type ChunkCoord,
  type Facing,
  type InstanceId,
  type ObjectPlacement,
  type TilePoint,
  type TileRect,
  type WorldObjectDefinition,
} from '@containment/shared';
import { Box3, BoxGeometry, Color, DataTexture, Group, LinearMipmapLinearFilter, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, NearestFilter, Quaternion, RGBAFormat, RingGeometry, SRGBColorSpace, UnsignedByteType, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import type { ActiveZone } from '../../state/worldState.ts';
import { buildObjectModel, type AnimatedPart } from '../models/objectModels.ts';
import { hex } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE, type VoxelBounds } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { mergeVoxelGeometries, type VoxelGeometryPart } from '../voxel/mergeVoxelGeometry.ts';
import type { VoxelMeshes } from '../voxel/voxelMesher.ts';
import { receiveFieldLights } from '../voxel/fieldLights.ts';
import { createVoxelObject, type VoxelLayer, type VoxelObjectOptions } from '../voxel/voxelMaterials.ts';
import { FadeBatch, type TopMaterials } from './fadeBatch.ts';
import { createFootprintShadows, type Footprint } from './footprintShadows.ts';
import { FACING_STEP, type FillLight, type SconceSpot } from './wallLights.ts';
import { LiquidSurface, WATER_PALETTE } from './liquidSurface.ts';
import { decalsForLevel } from './floorDecals.ts';
import { BEAM_GEOMETRY, createLightBeam } from './lightBeams.ts';
import { buildFloorScatter } from './floorScatter.ts';
import { groundAt } from './ground.ts';
import { BAND_ROWS, bandsOf, hasStructure, ownedLayoutOf, planChunkStructure, STRIP_ROWS, type ChunkStructure, type TopTexels } from './chunkStructure.ts';
import type { RoofBox } from './roofs.ts';
import type { StructureJob } from './chunkMesher.ts';
import { MODEL_VOXEL_SIZE, STEP_HEIGHT } from './worldScale.ts';

export interface LightSource {
  readonly position: Vector3;
  readonly color: number;
  readonly intensity: number;
  readonly radius: number;
  readonly flicker: boolean;
  readonly seed: number;
}

export interface WallPiece {
  readonly tile: TilePoint;
  readonly batch: FadeBatch;
  readonly index: number;
  faded: boolean;
}

export interface RoofView {
  readonly building: number;
  readonly box: RoofBox;
  readonly batch: FadeBatch;
  readonly index: number;
  faded: boolean;
  hidden: boolean;
}

export interface ObjectView {
  readonly instanceId: InstanceId;
  readonly placement: ObjectPlacement;
  readonly definition: WorldObjectDefinition;
  readonly group: Group;
  readonly objectiveRing: Mesh;
  readonly height: number;
  readonly ground: number;
  readonly animated: readonly { readonly part: Object3D; readonly spec: AnimatedPart }[];
  readonly seed: number;
}

export interface IndexedPlacement {
  readonly placement: ObjectPlacement;
  readonly index: number;
}

export interface ChunkContents {
  readonly objects: readonly IndexedPlacement[];
  readonly sconces: readonly SconceSpot[];
  readonly fills: readonly FillLight[];
}

const OBJECT_FACING_YAW: Readonly<Record<Facing, number>> = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };
const SCONCE_LIGHT_COLOR = 0xffe2b8;
const FAILING_LIGHT_COLOR = 0xff8a6a;
const SCONCE_LIGHT_HEIGHT = 1.45;
const SCONCE_LIGHT_OFFSET = 0.4;
const FILL_LIGHT_HEIGHT = 1.6;
const SCATTER_FADE = { from: 26, to: 38 } as const;
const SCATTER_MATERIAL = fadeScatterWithDistance(receiveFieldLights(new MeshLambertMaterial({ vertexColors: true })));

function fadeScatterWithDistance(material: MeshLambertMaterial): MeshLambertMaterial {
  const fieldCompile = material.onBeforeCompile.bind(material);
  const fieldKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    fieldCompile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `if ( smoothstep( ${SCATTER_FADE.from.toFixed(1)}, ${SCATTER_FADE.to.toFixed(1)}, distance( vFieldWorld, cameraPosition ) ) > fieldHash( floor( gl_FragCoord.xy ) ) ) discard;\n#include <clipping_planes_fragment>`);
  };
  material.customProgramCacheKey = () => `${fieldKey()}:scatter-fade-${SCATTER_FADE.from}-${SCATTER_FADE.to}`;
  return material;
}
const GLOW_MIN_FACES = 12;
const GLOW_INTENSITY = 0.45;
const GLOW_MIN_RADIUS = 1.6;
const GLOW_MAX_RADIUS = 3.2;
const FACING_TOWARD_WALL_YAW: Readonly<Record<Facing, number>> = { north: 0, south: Math.PI, west: Math.PI / 2, east: -Math.PI / 2 };

export function chunkRegion(chunk: ChunkCoord, zone: ActiveZone): TileRect | null {
  const { bounds } = zone.layout;
  const x = Math.max(chunk.cx * CHUNK_SIZE, bounds.x);
  const y = Math.max(chunk.cy * CHUNK_SIZE, bounds.y);
  const width = Math.min((chunk.cx + 1) * CHUNK_SIZE, bounds.x + bounds.width) - x;
  const height = Math.min((chunk.cy + 1) * CHUNK_SIZE, bounds.y + bounds.height) - y;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

interface ObjectMeshes {
  readonly base: VoxelMeshes;
  readonly animated: readonly { readonly meshes: VoxelMeshes; readonly spec: AnimatedPart }[];
  readonly heightVoxels: number;
  readonly footing: VoxelBounds | null;
}

const OBJECT_MESH_CACHE = new Map<string, ObjectMeshes>();
const SHARED_GEOMETRY = new WeakSet<BufferGeometry>();
const OBJECTIVE_RING_GEOMETRY = new RingGeometry(0.52, 0.62, 32);
SHARED_GEOMETRY.add(OBJECTIVE_RING_GEOMETRY);
SHARED_GEOMETRY.add(BEAM_GEOMETRY);
const PICK_PROXY_GEOMETRY = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
SHARED_GEOMETRY.add(PICK_PROXY_GEOMETRY);
const PICK_PROXY_MATERIAL = new MeshBasicMaterial({ visible: false });
const PICK_PROXY_MIN_HEIGHT = 0.9;
const PICK_PROXY_PAD = 0.15;
const VOXEL_LAYERS: readonly VoxelLayer[] = ['solid', 'emissive', 'glass'];
const UP = new Vector3(0, 1, 0);
const MODEL_VARIANTS = 8;
const SHADOW_MIN_VOXELS = 3;
const SHADOW_BASE_LAYERS = 4;
export const decorBandOf = (lastRow: number, region: TileRect): number => {
  const bands = bandsOf(region);
  return Math.min(Math.floor(lastRow / BAND_ROWS), bands[bands.length - 1] as number);
};
const SCONCE_MESH_CACHE = new Map<boolean, VoxelMeshes>();
const GLOW_CACHE = new Map<string, Glow | null>();

const isStaticDecor = (definition: WorldObjectDefinition, parts: ObjectMeshes): boolean =>
  definition.interactions.length === 0 && !definition.door && !definition.light && parts.animated.length === 0;

const shareMeshes = (meshes: VoxelMeshes): VoxelMeshes => {
  for (const layer of VOXEL_LAYERS) {
    const geometry = meshes[layer];
    if (geometry) SHARED_GEOMETRY.add(geometry);
  }
  return meshes;
};

const assemblySeed = (assembly: InstanceId): number => {
  let hash = 0;
  for (const char of assembly) hash = (hash * 31 + char.charCodeAt(0)) % 97;
  return hash;
};

const objectMeshesFor = (model: WorldObjectDefinition['model'], seed: number): ObjectMeshes => {
  const key = `${model}:${seed}`;
  const cached = OBJECT_MESH_CACHE.get(key);
  if (cached) return cached;
  const parts = buildObjectModel(model, seed);
  const built = {
    base: shareMeshes(parts.base.mesh(MODEL_VOXEL_SIZE, [0, 0, 0], true)),
    animated: parts.animated.map((spec) => ({ meshes: shareMeshes(spec.model.mesh(MODEL_VOXEL_SIZE)), spec })),
    heightVoxels: parts.heightVoxels,
    footing: parts.base.baseBounds(SHADOW_BASE_LAYERS),
  };
  OBJECT_MESH_CACHE.set(key, built);
  return built;
};

export function objectModelOrigin(placement: ObjectPlacement, definition: WorldObjectDefinition): { x: number; z: number } {
  const { width, height } = objectFootprintSize(definition, placement.facing);
  return { x: placement.position.x + (width - 1) / 2, z: placement.position.y + (height - 1) / 2 };
}

export class ChunkView {
  readonly root = new Group();
  readonly walls: WallPiece[] = [];
  readonly fixtures: WallPiece[] = [];
  readonly roofs: RoofView[] = [];
  readonly objects: ObjectView[] = [];
  readonly lights: LightSource[] = [];
  private coolant: LiquidSurface | null = null;
  private water: LiquidSurface | null = null;
  private readonly ringMaterial: Material;
  readonly region: TileRect;
  private readonly content: GameContent;
  private readonly decor = new Map<number, Record<VoxelLayer, VoxelGeometryPart[]>>();
  private readonly fixturePieces: { readonly tile: TilePoint; readonly meshes: VoxelMeshes }[] = [];
  private readonly batches: FadeBatch[] = [];
  private readonly steps: (((deadline: number) => boolean | void) | undefined)[] = [];
  private structure: ChunkStructure | null = null;
  private job: StructureJob | null = null;
  private readonly topTextures: DataTexture[] = [];
  private readonly topMaterials: MeshLambertMaterial[] = [];
  private floorTops: MeshLambertMaterial | null = null;
  private wallTops: TopMaterials | null = null;
  private roofTops: TopMaterials | null = null;
  private nextStep = 0;
  private readonly separateObjects: boolean;
  private readonly objectLights = new Map<InstanceId, LightSource[]>();
  private readonly footprints: Footprint[] = [];
  private readonly layout: ActiveZone['layout'];

  constructor(zone: ActiveZone, region: TileRect, contents: ChunkContents, ringMaterial: Material, options: { readonly separateObjects?: boolean; readonly content?: GameContent; readonly requestStructure?: (region: TileRect) => StructureJob } = {}) {
    this.content = options.content ?? GAME_CONTENT;
    this.layout = zone.layout;
    this.ringMaterial = ringMaterial;
    this.region = region;
    this.separateObjects = options.separateObjects ?? false;
    contents.objects.forEach(({ placement, index }) => this.steps.push(() => this.addObject(placement, index)));
    bandsOf(region).forEach((band) => this.steps.push(() => this.buildDecor(band)));
    contents.sconces.forEach((spot) => this.steps.push(() => this.addSconce(spot)));
    this.steps.push(() => {
      this.buildFixtures();
      const shadows = createFootprintShadows(this.footprints);
      if (shadows) {
        SHARED_GEOMETRY.add(shadows.geometry);
        this.root.add(shadows);
      }
      contents.fills.forEach(({ position, light }, index) => {
        this.lights.push({
          position: new Vector3(position.x, FILL_LIGHT_HEIGHT + groundAt(this.layout, position.x, position.y), position.y),
          color: hex(light.color),
          intensity: light.intensity,
          radius: light.radius,
          flicker: false,
          seed: position.x * 13 + position.y + index,
        });
      });
    });
    if (hasStructure(zone.layout, region)) this.planStructure(zone, region, new Set(contents.objects.flatMap(({ placement }) => objectFootprintTiles(this.content.worldObjects.get(placement.objectId), placement).map(tileKey))), options.requestStructure);
  }

  get ready(): boolean {
    return this.nextStep >= this.steps.length;
  }

  build(deadline: number): boolean {
    while (this.nextStep < this.steps.length) {
      const step = this.steps[this.nextStep];
      if (step && step(deadline) === false) break;
      this.steps[this.nextStep] = undefined;
      this.nextStep++;
      if (performance.now() >= deadline) break;
    }
    return this.ready;
  }

  update(time: number): void {
    this.coolant?.update(time);
    this.water?.update(time);
  }

  applyFades(): void {
    for (const batch of this.batches) batch.flush();
  }

  private addBatch(name: string, tiles: readonly TilePoint[], batch: FadeBatch, into: WallPiece[]): void {
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
    this.water?.dispose();
    this.job?.cancel();
    for (const texture of this.topTextures) texture.dispose();
    for (const material of this.topMaterials) material.dispose();
  }

  private planStructure(zone: ActiveZone, region: TileRect, occupied: ReadonlySet<string>, request: ((region: TileRect) => StructureJob) | undefined): void {
    const layout = ownedLayoutOf(zone.definition, zone.layout);
    const decals = decalsForLevel(zone.definition);
    for (let row = region.y; row < region.y + region.height; row += STRIP_ROWS) {
      const strip = { x: region.x, y: row, width: region.width, height: Math.min(STRIP_ROWS, region.y + region.height - row) };
      this.steps.push(() => {
        const scatter = buildFloorScatter(layout, strip, (tile) => occupied.has(tileKey(tile)), decals);
        if (scatter.isEmpty) return;
        const litter = createVoxelObject(scatter.mesh(MODEL_VOXEL_SIZE), { castShadow: false, materials: { solid: SCATTER_MATERIAL } });
        litter.name = 'floorScatter';
        this.root.add(litter);
      });
    }
    const local = (): void => {
      const plan = planChunkStructure(layout, decals, region);
      this.steps.splice(this.nextStep + 1, 0, ...plan.steps, () => {
        this.structure = plan.result();
      });
    };
    const job = request?.(region) ?? null;
    this.job = job;
    if (job) {
      this.steps.push((deadline) => {
        if (job.structure) {
          this.structure = job.structure;
          return true;
        }
        if (!job.failed && deadline !== Infinity) return false;
        job.cancel();
        local();
        return true;
      });
    } else {
      this.steps.push(local);
    }
    this.steps.push(() => this.addFloors());
    bandsOf(region).forEach((_, band) => this.steps.push(() => this.addWallBand(band)));
    this.steps.push(() => this.addRoofs());
    this.steps.push(() => {
      this.structure = null;
      this.coolant = LiquidSurface.build(layout, 'coolant', region);
      if (this.coolant) this.root.add(this.coolant.mesh);
      this.water = LiquidSurface.build(layout, 'water', region, WATER_PALETTE);
      if (this.water) this.root.add(this.water.mesh);
    });
  }

  private addFloors(): void {
    const structure = this.structure;
    if (!structure) return;
    if (structure.tops) this.floorTops = this.topMaterial(this.topTexture(structure.tops), false);
    if (structure.wallTops) {
      const texture = this.topTexture(structure.wallTops);
      this.wallTops = { material: this.topMaterial(texture, false), fadedMaterial: this.topMaterial(texture, true) };
    }
    if (structure.roofTops) {
      const texture = this.topTexture(structure.roofTops);
      this.roofTops = { material: this.topMaterial(texture, false), fadedMaterial: this.topMaterial(texture, true) };
    }
    for (const { meshes, tops } of structure.floors) {
      const floor = createVoxelObject(meshes, { castShadow: false });
      if (tops && this.floorTops) {
        const mesh = new Mesh(tops, this.floorTops);
        mesh.name = 'tops';
        mesh.receiveShadow = true;
        floor.add(mesh);
      }
      floor.name = 'floor';
      this.root.add(floor);
    }
  }

  private addWallBand(band: number): void {
    const walls = this.structure?.walls[band];
    if (walls && walls.parts.count > 0) this.addBatch('walls', walls.tiles, new FadeBatch(walls.parts, {}, this.wallTops), this.walls);
  }

  private addRoofs(): void {
    const roofs = this.structure?.roofs;
    if (!roofs || roofs.parts.count === 0) return;
    const batch = new FadeBatch(roofs.parts, {}, this.roofTops);
    batch.root.name = 'roofs';
    this.root.add(batch.root);
    this.batches.push(batch);
    roofs.pieces.forEach((piece, index) => this.roofs.push({ building: piece.building, box: piece.box, batch, index, faded: false, hidden: false }));
  }

  private topTexture(texels: TopTexels): DataTexture {
    const texture = new DataTexture(texels.data, texels.width, texels.height, RGBAFormat, UnsignedByteType);
    texture.colorSpace = SRGBColorSpace;
    texture.magFilter = NearestFilter;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    this.topTextures.push(texture);
    return texture;
  }

  private topMaterial(map: DataTexture, faded: boolean): MeshLambertMaterial {
    const material = receiveFieldLights(faded ? new MeshLambertMaterial({ map, transparent: true, opacity: 0.16, depthWrite: false }) : new MeshLambertMaterial({ map }));
    this.topMaterials.push(material);
    return material;
  }

  placeObject(placement: ObjectPlacement, index: number): ObjectView | null {
    const before = this.objects.length;
    this.addObject(placement, index);
    return this.objects.length > before ? (this.objects[this.objects.length - 1] ?? null) : null;
  }

  removeObject(instanceId: InstanceId): ObjectView | null {
    const at = this.objects.findIndex((view) => view.instanceId === instanceId);
    const view = this.objects[at];
    if (!view) return null;
    this.objects.splice(at, 1);
    view.group.removeFromParent();
    view.objectiveRing.removeFromParent();
    for (const light of this.objectLights.get(instanceId) ?? []) {
      const lightAt = this.lights.indexOf(light);
      if (lightAt >= 0) this.lights.splice(lightAt, 1);
    }
    this.objectLights.delete(instanceId);
    return view;
  }

  private addObject(placement: ObjectPlacement, index: number): void {
    const definition = this.content.worldObjects.get(placement.objectId);
    if (!definition) return;
    const assembly = assemblyInstanceOf(placement.instanceId);
    const seed = assembly ? assemblySeed(assembly) : (placement.position.x * 31 + placement.position.y * 17 + index) % 97;
    const parts = objectMeshesFor(definition.model, seed % MODEL_VARIANTS);
    const scale = definition.modelScale ?? 1;
    const origin = objectModelOrigin(placement, definition);
    const ground = placement.datum === undefined ? groundAt(this.layout, placement.position.x, placement.position.y) : placement.datum * STEP_HEIGHT;
    const lightsBefore = this.lights.length;
    this.addObjectLight(definition, placement, origin, ground, parts, `${definition.model}:${seed % MODEL_VARIANTS}`, scale, seed);
    if (this.lights.length > lightsBefore) this.objectLights.set(placement.instanceId, this.lights.slice(lightsBefore));
    this.addFootprint(definition, parts, placement, origin, ground, scale);
    if (!this.separateObjects && isStaticDecor(definition, parts)) {
      this.addDecor(parts.base, placement, definition, origin, ground, scale);
      return;
    }

    const group = new Group();
    group.position.set(origin.x, ground, origin.z);
    group.scale.setScalar(scale);
    group.rotation.y = OBJECT_FACING_YAW[placement.facing ?? 'south'];
    group.add(createVoxelObject(parts.base));
    const animated = parts.animated.map(({ meshes, spec }) => {
      const part = createVoxelObject(meshes, { castShadow: false });
      group.add(part);
      return { part, spec };
    });
    group.userData.pick = { kind: 'object', instanceId: placement.instanceId };
    const height = parts.heightVoxels * MODEL_VOXEL_SIZE * scale;
    if (definition.interactions.length > 0) group.add(this.pickProxy(definition, height, scale));

    const objectiveRing = new Mesh(OBJECTIVE_RING_GEOMETRY, this.ringMaterial);
    objectiveRing.rotation.x = -Math.PI / 2;
    objectiveRing.position.set(origin.x, ground + 0.02, origin.z);
    objectiveRing.visible = false;

    this.root.add(group, objectiveRing);
    this.objects.push({ instanceId: placement.instanceId, placement, definition, group, objectiveRing, height, ground, animated, seed });
  }

  private pickProxy(definition: WorldObjectDefinition, height: number, scale: number): Mesh {
    const { width, height: depth } = definition.footprint ?? { width: 1, height: 1 };
    const proxy = new Mesh(PICK_PROXY_GEOMETRY, PICK_PROXY_MATERIAL);
    proxy.name = 'pick-proxy';
    proxy.scale.set((width + PICK_PROXY_PAD) / scale, Math.max(PICK_PROXY_MIN_HEIGHT, height + PICK_PROXY_PAD) / scale, (depth + PICK_PROXY_PAD) / scale);
    return proxy;
  }

  private addFootprint(definition: WorldObjectDefinition, parts: ObjectMeshes, placement: ObjectPlacement, origin: { x: number; z: number }, ground: number, scale: number): void {
    const box = parts.footing;
    if (!box || definition.door || parts.heightVoxels < SHADOW_MIN_VOXELS) return;
    const yaw = OBJECT_FACING_YAW[placement.facing ?? 'south'];
    const size = MODEL_VOXEL_SIZE * scale;
    const centre = new Vector3((box.min[0] + box.max[0]) / 2, 0, (box.min[2] + box.max[2]) / 2).multiplyScalar(size).applyAxisAngle(UP, yaw);
    const across = (box.max[0] - box.min[0]) * size;
    const along = (box.max[2] - box.min[2]) * size;
    const turned = Math.abs(Math.sin(yaw)) > 0.5;
    this.footprints.push({ x: origin.x + centre.x, y: ground, z: origin.z + centre.z, width: turned ? along : across, depth: turned ? across : along });
  }

  private addObjectLight(definition: WorldObjectDefinition, placement: ObjectPlacement, origin: { x: number; z: number }, ground: number, parts: ObjectMeshes, cacheKey: string, scale: number, seed: number): void {
    const glow = glowOf(cacheKey, parts);
    if (!definition.light && !glow) return;
    const local = glow ? glow.centre.clone() : new Vector3(0, parts.heightVoxels * MODEL_VOXEL_SIZE + 0.2, 0);
    const position = local.multiplyScalar(scale).applyAxisAngle(UP, OBJECT_FACING_YAW[placement.facing ?? 'south']).add(new Vector3(origin.x, ground, origin.z));
    if (definition.light) {
      this.lights.push({ position, color: hex(definition.light.color), intensity: definition.light.intensity, radius: definition.light.radius, flicker: definition.light.flicker ?? false, seed });
      if (definition.light.beam) this.root.add(createLightBeam(position, hex(definition.light.color), definition.light.beam, ground));
    } else if (glow) {
      this.lights.push({ position, color: glow.color, intensity: GLOW_INTENSITY, radius: Math.min(GLOW_MAX_RADIUS, GLOW_MIN_RADIUS + glow.size * scale * 1.5), flicker: false, seed });
    }
  }

  private addDecor(meshes: VoxelMeshes, placement: ObjectPlacement, definition: WorldObjectDefinition, origin: { x: number; z: number }, ground: number, scale: number): void {
    const transform = new Matrix4().compose(
      new Vector3(origin.x, ground, origin.z),
      new Quaternion().setFromAxisAngle(UP, OBJECT_FACING_YAW[placement.facing ?? 'south']),
      new Vector3(scale, scale, scale),
    );
    const lastRow = objectFootprintTiles(definition, placement).reduce((row, tile) => Math.max(row, tile.y), placement.position.y);
    const band = decorBandOf(lastRow, this.region);
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
    if (this.fixturePieces.length > 0) {
      this.addBatch(
        'wallFixtures',
        this.fixturePieces.map(({ tile }) => tile),
        FadeBatch.of(
          this.fixturePieces.map(({ meshes }) => meshes),
          { castShadow: false, receiveShadow: false },
        ),
        this.fixtures,
      );
    }
    this.fixturePieces.length = 0;
  }

  private addSconce(spot: SconceSpot): void {
    const meshes = sconceMeshes(spot.failing);
    const ground = groundAt(this.layout, spot.floor.x, spot.floor.y);
    const transform = new Matrix4().compose(new Vector3(spot.floor.x, ground, spot.floor.y), new Quaternion().setFromAxisAngle(UP, FACING_TOWARD_WALL_YAW[spot.facing]), new Vector3(1, 1, 1));
    const placed = (geometry: BufferGeometry | null) => geometry?.clone().applyMatrix4(transform) ?? null;
    this.fixturePieces.push({ tile: spot.wall, meshes: { solid: placed(meshes.solid), emissive: placed(meshes.emissive), glass: placed(meshes.glass) } });
    const step = FACING_STEP[spot.facing];
    const reach = 0.5 - SCONCE_LIGHT_OFFSET;
    this.lights.push({
      position: new Vector3(spot.floor.x + step.x * reach, SCONCE_LIGHT_HEIGHT + ground, spot.floor.y + step.y * reach),
      color: spot.color ?? (spot.failing ? FAILING_LIGHT_COLOR : SCONCE_LIGHT_COLOR),
      intensity: spot.intensity,
      radius: spot.radius,
      flicker: spot.flicker,
      seed: spot.seed,
    });
  }
}

interface Glow {
  readonly centre: Vector3;
  readonly color: number;
  readonly size: number;
}

function glowOf(cacheKey: string, parts: ObjectMeshes): Glow | null {
  const cached = GLOW_CACHE.get(cacheKey);
  if (cached !== undefined) return cached;
  const geometries = [parts.base.emissive, ...parts.animated.map(({ meshes }) => meshes.emissive)].filter((geometry): geometry is BufferGeometry => geometry !== null);
  const bounds = new Box3();
  const sum = new Color(0, 0, 0);
  let vertices = 0;
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    const colors = geometry.getAttribute('color');
    if (!colors) continue;
    for (let index = 0; index < colors.count; index++) {
      sum.r += colors.getX(index);
      sum.g += colors.getY(index);
      sum.b += colors.getZ(index);
    }
    vertices += colors.count;
  }
  let glow: Glow | null = null;
  if (vertices / 4 >= GLOW_MIN_FACES) {
    sum.multiplyScalar(1 / vertices);
    sum.multiplyScalar(1 / Math.max(sum.r, sum.g, sum.b, 0.001));
    glow = { centre: bounds.getCenter(new Vector3()), color: sum.getHex(), size: bounds.getSize(new Vector3()).length() };
  }
  GLOW_CACHE.set(cacheKey, glow);
  return glow;
}

function sconceMeshes(failing: boolean): VoxelMeshes {
  const cached = SCONCE_MESH_CACHE.get(failing);
  if (cached) return cached;
  const frame = 0x2a343b;
  const glow = failing ? 0xff9a72 : 0xffe6bf;
  const model = new VoxelModel();
  model.fill(-2, 19, -8, 1, 27, -8, frame);
  model.fill(-1, 20, -7, 0, 21, -7, frame);
  model.fill(-2, 22, -7, 1, 22, -5, frame);
  model.fill(-2, 23, -7, 1, 25, -5, (x, y) => (failing && x === 1 && y === 25 ? 0x5a3a30 : glow), VOXEL_EMISSIVE);
  model.fill(-2, 26, -7, 1, 26, -5, frame);
  const meshes = model.mesh(MODEL_VOXEL_SIZE);
  SCONCE_MESH_CACHE.set(failing, meshes);
  return meshes;
}
