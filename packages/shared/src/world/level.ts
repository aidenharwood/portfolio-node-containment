import type { ConnectorId, DistrictId, LevelId, SiteId } from '../ids.ts';
import type { ZoneAmbience, ZoneLight } from './district.ts';
import type { TilePoint } from './geometry.ts';

export interface DistrictPlacement {
  readonly districtId: DistrictId;
  readonly origin: TilePoint;
}

export interface ConnectorDefinition {
  readonly id: ConnectorId;
  readonly name: string;
  readonly origin: TilePoint;
  readonly map: readonly string[];
  readonly ambience: ZoneAmbience;
  readonly lights: readonly ZoneLight[];
}

export interface LevelDefinition {
  readonly id: LevelId;
  readonly name: string;
  readonly site: SiteId;
  readonly kind: 'floor' | 'pocket';
  readonly depth: number;
  readonly districts: readonly DistrictPlacement[];
  readonly connectors: readonly ConnectorDefinition[];
  readonly spawn: { readonly districtId: DistrictId; readonly position: TilePoint };
  readonly capacity?: number;
}

export const visitedLevelFlag = (levelId: LevelId): string => `visited:${levelId}`;

export interface WorldLocation {
  readonly levelId: LevelId;
  readonly position: TilePoint;
}
