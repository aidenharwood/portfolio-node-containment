import {
  GAME_CONTENT,
  TILE_KINDS,
  type Facing,
  type InstanceId,
  type ObjectPlacement,
  type TilePoint,
  type WorldObjectDefinition,
} from '@containment/shared';
import {
  AdditiveBlending,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
  type Object3D,
} from 'three';
import type { ActiveZone } from '../../state/worldState.ts';
import { buildObjectModel, type AnimatedPart } from '../models/objectModels.ts';
import { hex, noise3 } from '../voxel/palette.ts';
import { VOXEL_EMISSIVE } from '../voxel/voxelKinds.ts';
import { VoxelModel } from '../voxel/voxelModel.ts';
import { meshVoxels } from '../voxel/voxelMesher.ts';
import { LiquidSurface } from './liquidSurface.ts';
import { createVoxelObject, setVoxelObjectFaded } from '../voxel/voxelMaterials.ts';
import {
  MODEL_VOXEL_SIZE,
  TILE_RESOLUTION,
  WALL_HEIGHT,
  ZONE_MESH_ORIGIN,
  ZONE_VOLUME_HEIGHT,
  ZONE_VOXEL_SIZE,
} from './worldScale.ts';
import { buildZoneVolume } from './zoneVoxels.ts';

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

const OBJECT_FACING_YAW: Readonly<Record<Facing, number>> = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };

const FADE_RADIUS = 1.4;
const FADE_REACH = 7;
const CEILING_FIXTURE_HEIGHT = WALL_HEIGHT - 0.06;
const CEILING_LIGHT_COLOR = 0xe6f2ff;
const FAILING_LIGHT_COLOR = 0xff8a6a;
const FIXTURE_SPACING = 4;
const FIXTURE_MIN_SEPARATION = 2.5;
const FIXTURE_OVERHEAD_ALLOWANCE = 1.2;

function ceilingFixturePositions(zone: ActiveZone, occupied: ReadonlySet<string>): TilePoint[] {
  const positions: TilePoint[] = [];
  const isOpenFloor = (x: number, y: number) => {
    const kind = zone.layout.tileAt({ x, y });
    return TILE_KINDS[kind].walkable && !occupied.has(`${x},${y}`);
  };
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
  return positions;
}

const DEPLETED_HEIGHT = 0.35;

export class ZoneScene {
  readonly root = new Group();
  readonly walls: WallPiece[] = [];
  private readonly fixtures: WallPiece[] = [];
  readonly objects = new Map<InstanceId, ObjectView>();
  readonly lights: LightSource[] = [];
  private readonly coolant: LiquidSurface | null;
  private readonly ringMaterial = new MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, toneMapped: false });

  constructor(zone: ActiveZone) {
    const { layout, definition } = zone;
    const volume = buildZoneVolume(layout);
    const meshOptions = { voxelSize: ZONE_VOXEL_SIZE, origin: ZONE_MESH_ORIGIN };

    const floor = createVoxelObject(meshVoxels(volume, { min: [0, 0, 0], max: [volume.width, 2, volume.depth] }, { ...meshOptions, clipToBounds: true }), { castShadow: false });
    floor.name = 'floor';
    this.root.add(floor);

    for (let ty = 0; ty < layout.height; ty++) {
      for (let tx = 0; tx < layout.width; tx++) {
        const kind = layout.tileAt({ x: tx, y: ty });
        if (TILE_KINDS[kind].structure !== 'wall' && kind !== 'door') continue;
        const region = {
          min: [tx * TILE_RESOLUTION, 2, ty * TILE_RESOLUTION] as const,
          max: [(tx + 1) * TILE_RESOLUTION, ZONE_VOLUME_HEIGHT, (ty + 1) * TILE_RESOLUTION] as const,
        };
        const group = createVoxelObject(meshVoxels(volume, region, meshOptions));
        if (group.children.length === 0) continue;
        group.name = 'wall';
        this.root.add(group);
        this.walls.push({ tile: { x: tx, y: ty }, group, faded: false });
      }
    }

    this.coolant = LiquidSurface.build(layout, 'coolant');
    if (this.coolant) this.root.add(this.coolant.mesh);

    definition.objects.forEach((placement, index) => this.addObject(placement, index));

    this.addCeilingFixtures(zone);

    definition.lights.forEach((light, index) => {
      this.lights.push({
        position: new Vector3(light.position.x, WALL_HEIGHT + 0.6, light.position.y),
        color: hex(light.color),
        intensity: light.intensity,
        radius: light.radius,
        flicker: false,
        seed: index,
      });
    });
  }

  update(time: number, objectiveObjectIds: ReadonlySet<string>, depletedObjects: ReadonlySet<string>): void {
    for (const view of this.objects.values()) {
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
    this.coolant?.update(time);
    this.ringMaterial.opacity = 0.55 + Math.sin(time * 3) * 0.3;
  }

  updateCutaway(camera: Vector3, focus: Vector3): void {
    const toCameraX = camera.x - focus.x;
    const toCameraZ = camera.z - focus.z;
    const lengthSquared = toCameraX * toCameraX + toCameraZ * toCameraZ;
    const length = Math.sqrt(lengthSquared) || 1;
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
    for (const wall of this.walls) apply(wall, blocksView(wall.tile, 0));
    for (const fixture of this.fixtures) apply(fixture, blocksView(fixture.tile, FIXTURE_OVERHEAD_ALLOWANCE));
  }

  solidWalls(): Object3D[] {
    return this.walls.filter((wall) => !wall.faded).map((wall) => wall.group);
  }

  dispose(): void {
    this.root.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
    this.coolant?.dispose();
    this.ringMaterial.dispose();
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
    this.objects.set(placement.instanceId, { instanceId: placement.instanceId, placement, definition, group, objectiveRing, height, animated, seed });

    if (definition.light) {
      this.lights.push({
        position: new Vector3(placement.position.x, Math.max(height + 0.35, WALL_HEIGHT + 0.3), placement.position.y),
        color: hex(definition.light.color),
        intensity: definition.light.intensity,
        radius: definition.light.radius,
        flicker: definition.light.flicker ?? false,
        seed,
      });
    }
  }

  private addCeilingFixtures(zone: ActiveZone): void {
    const positions = ceilingFixturePositions(zone, new Set(zone.definition.objects.map((placement) => `${placement.position.x},${placement.position.y}`)));
    if (positions.length === 0) return;
    const panelY = Math.round(CEILING_FIXTURE_HEIGHT / MODEL_VOXEL_SIZE);
    const failing = zone.definition.ambience.fixtures === 'failing';
    const panelColor = failing ? 0xd9846a : 0xb4d4e6;
    const panelStripe = failing ? 0x8a3a2a : 0x8fb3c8;
    positions.forEach((position, index) => {
      const flickers = failing ? index % 3 === 0 : noise3(position.x, position.y, 0, 77) > 0.93;
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
        flicker: flickers,
        seed: position.x * 7 + position.y,
      });
    });
  }

}
