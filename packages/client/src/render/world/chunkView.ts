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
import { Group, Mesh, RingGeometry, Vector3, type Material, type Object3D } from 'three';
import type { ActiveZone } from '../../state/worldState.ts';
import { buildObjectModel, type AnimatedPart } from '../models/objectModels.ts';
import { hex, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { meshVoxels } from '../voxel/voxelMesher.ts';
import { createVoxelObject } from '../voxel/voxelMaterials.ts';
import { LiquidSurface } from './liquidSurface.ts';
import { buildFloorScatter } from './floorScatter.ts';
import { buildTileVolume } from './levelVoxels.ts';
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
  readonly group: Group;
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

export class ChunkView {
  readonly root = new Group();
  readonly walls: WallPiece[] = [];
  readonly fixtures: WallPiece[] = [];
  readonly objects: ObjectView[] = [];
  readonly lights: LightSource[] = [];
  private coolant: LiquidSurface | null = null;
  private readonly ringMaterial: Material;

  constructor(zone: ActiveZone, region: TileRect, contents: ChunkContents, ringMaterial: Material) {
    this.ringMaterial = ringMaterial;
    if (hasStructure(zone, region)) this.buildStructure(zone, region, new Set(contents.objects.map(({ placement }) => tileKey(placement.position))));
    contents.objects.forEach(({ placement, index }) => this.addObject(placement, index));
    contents.fixtures.forEach((spot) => this.addCeilingFixture(spot));
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
  }

  update(time: number): void {
    this.coolant?.update(time);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
    this.coolant?.dispose();
  }

  private buildStructure(zone: ActiveZone, region: TileRect, occupied: ReadonlySet<string>): void {
    const { layout } = zone;
    const volume = buildTileVolume(layout, region);
    const meshOptions = { voxelSize: ZONE_VOXEL_SIZE, origin: ZONE_MESH_ORIGIN };
    const R = TILE_RESOLUTION;
    const floorBounds = {
      min: [region.x * R, 0, region.y * R] as const,
      max: [(region.x + region.width) * R, 2, (region.y + region.height) * R] as const,
    };
    const floor = createVoxelObject(meshVoxels(volume, floorBounds, { ...meshOptions, clipToBounds: true }), { castShadow: false });
    floor.name = 'floor';
    this.root.add(floor);
    const scatter = buildFloorScatter(layout, region, (tile) => occupied.has(tileKey(tile)));
    if (!scatter.isEmpty) {
      const litter = createVoxelObject(scatter.mesh(MODEL_VOXEL_SIZE), { castShadow: false });
      litter.name = 'floorScatter';
      this.root.add(litter);
    }

    for (let ty = region.y; ty < region.y + region.height; ty++) {
      for (let tx = region.x; tx < region.x + region.width; tx++) {
        const kind = layout.tileAt({ x: tx, y: ty });
        if (TILE_KINDS[kind].structure !== 'wall' && kind !== 'door') continue;
        const bounds = {
          min: [tx * R, 2, ty * R] as const,
          max: [(tx + 1) * R, ZONE_VOLUME_HEIGHT, (ty + 1) * R] as const,
        };
        const group = createVoxelObject(meshVoxels(volume, bounds, meshOptions));
        if (group.children.length === 0) continue;
        group.name = 'wall';
        this.root.add(group);
        this.walls.push({ tile: { x: tx, y: ty }, group, faded: false });
      }
    }

    this.coolant = LiquidSurface.build(layout, 'coolant', region);
    if (this.coolant) this.root.add(this.coolant.mesh);
  }

  private addObject(placement: ObjectPlacement, index: number): void {
    const definition = GAME_CONTENT.worldObjects.get(placement.objectId);
    if (!definition) return;
    const seed = (placement.position.x * 31 + placement.position.y * 17 + index) % 97;
    const parts = buildObjectModel(definition.model, seed);
    const scale = definition.modelScale ?? 1;

    const group = new Group();
    group.position.set(placement.position.x, 0, placement.position.y);
    group.scale.setScalar(scale);
    group.rotation.y = OBJECT_FACING_YAW[placement.facing ?? 'south'];
    group.add(createVoxelObject(parts.base.mesh(MODEL_VOXEL_SIZE)));
    const animated = parts.animated.map((spec) => {
      const part = createVoxelObject(spec.model.mesh(MODEL_VOXEL_SIZE), { castShadow: false });
      group.add(part);
      return { part, spec };
    });
    group.userData.pick = { kind: 'object', instanceId: placement.instanceId };

    const objectiveRing = new Mesh(new RingGeometry(0.52, 0.62, 32), this.ringMaterial);
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

  private addCeilingFixture({ position, index, failing }: FixtureSpot): void {
    const panelY = Math.round(CEILING_FIXTURE_HEIGHT / MODEL_VOXEL_SIZE);
    const panelColor = failing ? 0xd9846a : 0xb4d4e6;
    const panelStripe = failing ? 0x8a3a2a : 0x8fb3c8;
    const model = new VoxelModel();
    const cx = position.x * 16;
    const cz = position.y * 16;
    model.fill(cx - 6, panelY, cz - 3, cx + 5, panelY + 1, cz + 2, (x, y, z) => {
      const rim = x === cx - 6 || x === cx + 5 || z === cz - 3 || z === cz + 2 || y === panelY + 1;
      return rim ? 0x2a343b : null;
    });
    model.fill(cx - 5, panelY, cz - 2, cx + 4, panelY, cz + 1, (x) => (x === cx ? panelStripe : panelColor), VOXEL_EMISSIVE);
    for (const x of [cx - 5, cx + 4]) model.fill(x, panelY + 2, cz, x, panelY + 12, cz, 0x1b2228);
    const fixture = createVoxelObject(model.mesh(MODEL_VOXEL_SIZE), { castShadow: false, receiveShadow: false });
    fixture.name = 'ceilingFixture';
    this.root.add(fixture);
    this.fixtures.push({ tile: position, group: fixture, faded: false });
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
