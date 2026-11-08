import type { AssemblyId, ConnectorId, DistrictId, LevelId } from '../ids.ts';
import { expandAssembly, type AssemblyDefinition } from './assemblies.ts';
import {
  parseTileLayout,
  type AreaDefinition,
  type CreaturePlacement,
  type DistrictDefinition,
  type NpcPlacement,
  type ObjectPlacement,
  type TileLayout,
  type ZoneAmbience,
  type ZoneLight,
} from './district.ts';
import type { TilePoint, TileRect } from './geometry.ts';
import type { LevelDefinition } from './level.ts';
import type { TileKindId } from './tiles.ts';

export interface LevelLayout extends TileLayout {
  districtAt(point: TilePoint): DistrictId | undefined;
  connectorAt(point: TilePoint): ConnectorId | undefined;
  toLevelPoint(districtId: DistrictId, local: TilePoint): TilePoint;
  toLocalPoint(point: TilePoint): { readonly districtId: DistrictId; readonly position: TilePoint } | undefined;
}

export interface ResolvedArea extends AreaDefinition {
  readonly districtId: DistrictId;
}

export interface PlacedDistrict {
  readonly districtId: DistrictId;
  readonly rect: TileRect;
}

export interface ResolvedLevel {
  readonly definition: LevelDefinition;
  readonly id: LevelId;
  readonly name: string;
  readonly layout: LevelLayout;
  readonly spawn: TilePoint;
  readonly capacity?: number;
  readonly ambience: ZoneAmbience;
  readonly areas: readonly ResolvedArea[];
  readonly districts: readonly PlacedDistrict[];
  readonly npcs: readonly NpcPlacement[];
  readonly objects: readonly ObjectPlacement[];
  readonly creatures: readonly CreaturePlacement[];
  readonly lights: readonly ZoneLight[];
  ambienceAt(point: TilePoint): ZoneAmbience;
}

type Owner = { readonly kind: 'district'; readonly id: DistrictId } | { readonly kind: 'connector'; readonly id: ConnectorId };

interface Stamp {
  readonly owner: Owner;
  readonly origin: TilePoint;
  readonly layout: TileLayout;
}

const offset = (point: TilePoint, origin: TilePoint): TilePoint => ({ x: point.x + origin.x, y: point.y + origin.y });

function districtOf(districts: ReadonlyMap<DistrictId, DistrictDefinition>, districtId: DistrictId): DistrictDefinition {
  const district = districts.get(districtId);
  if (!district) throw new Error(`Unknown district "${districtId}".`);
  return district;
}

function stampsOf(level: LevelDefinition, districts: ReadonlyMap<DistrictId, DistrictDefinition>): Stamp[] {
  return [
    ...level.districts.map((placement) => ({
      owner: { kind: 'district' as const, id: placement.districtId },
      origin: placement.origin,
      layout: parseTileLayout(districtOf(districts, placement.districtId).map),
    })),
    ...level.connectors.map((connector) => ({
      owner: { kind: 'connector' as const, id: connector.id },
      origin: connector.origin,
      layout: parseTileLayout(connector.map),
    })),
  ];
}

export function assembleLevel(level: LevelDefinition, districts: ReadonlyMap<DistrictId, DistrictDefinition>): LevelLayout {
  const stamps = stampsOf(level, districts);
  const width = Math.max(0, ...stamps.map((stamp) => stamp.origin.x + stamp.layout.width));
  const height = Math.max(0, ...stamps.map((stamp) => stamp.origin.y + stamp.layout.height));
  const tiles: TileKindId[] = new Array(width * height).fill('void');
  const owners: (Owner | undefined)[] = new Array(width * height).fill(undefined);
  const origins = new Map(level.districts.map((placement) => [placement.districtId, placement.origin]));

  for (const stamp of stamps) {
    for (let y = 0; y < stamp.layout.height; y++) {
      for (let x = 0; x < stamp.layout.width; x++) {
        const kind = stamp.layout.tileAt({ x, y });
        if (kind === 'void') continue;
        const index = (stamp.origin.y + y) * width + stamp.origin.x + x;
        tiles[index] = kind;
        owners[index] = stamp.owner;
      }
    }
  }

  const ownerAt = ({ x, y }: TilePoint): Owner | undefined => (x < 0 || y < 0 || x >= width || y >= height ? undefined : owners[y * width + x]);

  return {
    width,
    height,
    tileAt: ({ x, y }) => (x < 0 || y < 0 || x >= width || y >= height ? 'void' : (tiles[y * width + x] ?? 'void')),
    districtAt: (point) => {
      const owner = ownerAt(point);
      return owner?.kind === 'district' ? owner.id : undefined;
    },
    connectorAt: (point) => {
      const owner = ownerAt(point);
      return owner?.kind === 'connector' ? owner.id : undefined;
    },
    toLevelPoint: (districtId, local) => {
      const origin = origins.get(districtId);
      if (!origin) throw new Error(`District "${districtId}" is not on level "${level.id}".`);
      return offset(local, origin);
    },
    toLocalPoint: (point) => {
      const owner = ownerAt(point);
      if (owner?.kind !== 'district') return undefined;
      const origin = origins.get(owner.id) as TilePoint;
      return { districtId: owner.id, position: { x: point.x - origin.x, y: point.y - origin.y } };
    },
  };
}

function assemblyOf(assemblies: ReadonlyMap<AssemblyId, AssemblyDefinition>, assemblyId: AssemblyId): AssemblyDefinition {
  const assembly = assemblies.get(assemblyId);
  if (!assembly) throw new Error(`Unknown assembly "${assemblyId}".`);
  return assembly;
}

export function districtObjects(district: DistrictDefinition, assemblies: ReadonlyMap<AssemblyId, AssemblyDefinition>): ObjectPlacement[] {
  return [
    ...district.objects,
    ...(district.assemblies ?? []).flatMap((placement) => expandAssembly(assemblyOf(assemblies, placement.assemblyId), placement)),
  ];
}

export function resolveLevel(
  level: LevelDefinition,
  districts: ReadonlyMap<DistrictId, DistrictDefinition>,
  assemblies: ReadonlyMap<AssemblyId, AssemblyDefinition> = new Map(),
): ResolvedLevel {
  const layout = assembleLevel(level, districts);
  const placed = level.districts.map((placement) => ({ origin: placement.origin, district: districtOf(districts, placement.districtId) }));
  const ambience = districtOf(districts, level.spawn.districtId).ambience;
  const connectorAmbience = new Map(level.connectors.map((connector) => [connector.id, connector.ambience]));

  return {
    definition: level,
    id: level.id,
    name: level.name,
    layout,
    spawn: layout.toLevelPoint(level.spawn.districtId, level.spawn.position),
    ...(level.capacity === undefined ? {} : { capacity: level.capacity }),
    ambience,
    areas: placed.flatMap(({ origin, district }) =>
      district.areas.map((area) => ({ ...area, rect: { ...area.rect, ...offset(area.rect, origin) }, districtId: district.id })),
    ),
    districts: placed.map(({ origin, district }) => ({
      districtId: district.id,
      rect: { x: origin.x, y: origin.y, width: Math.max(0, ...district.map.map((row) => row.length)), height: district.map.length },
    })),
    npcs: placed.flatMap(({ origin, district }) => district.npcs.map((npc) => ({ ...npc, position: offset(npc.position, origin) }))),
    objects: placed.flatMap(({ origin, district }) =>
      districtObjects(district, assemblies).map((object) => ({ ...object, position: offset(object.position, origin) })),
    ),
    creatures: placed.flatMap(({ origin, district }) =>
      (district.creatures ?? []).map((creature) => ({ ...creature, position: offset(creature.position, origin) })),
    ),
    lights: [
      ...placed.flatMap(({ origin, district }) => district.lights.map((light) => ({ ...light, position: offset(light.position, origin) }))),
      ...level.connectors.flatMap((connector) => connector.lights.map((light) => ({ ...light, position: offset(light.position, connector.origin) }))),
    ],
    ambienceAt: (point) => {
      const districtId = layout.districtAt(point);
      if (districtId) return districtOf(districts, districtId).ambience;
      const connectorId = layout.connectorAt(point);
      return (connectorId && connectorAmbience.get(connectorId)) || ambience;
    },
  };
}
