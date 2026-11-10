import type { DistrictId, RegionId } from '../ids.ts';

export interface RegionDefinition {
  readonly id: RegionId;
  readonly name: string;
  readonly hubDistrictId: DistrictId;
}

export const isRegionHub = (regions: ReadonlyMap<RegionId, RegionDefinition>, districtId: DistrictId | undefined): boolean =>
  [...regions.values()].some((region) => region.hubDistrictId === districtId);
