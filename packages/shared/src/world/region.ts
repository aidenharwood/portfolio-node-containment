import type { DistrictId, SiteId } from '../ids.ts';

export interface SiteDefinition {
  readonly id: SiteId;
  readonly name: string;
  readonly hubDistrictId: DistrictId;
}

export const isSiteHub = (sites: ReadonlyMap<SiteId, SiteDefinition>, districtId: DistrictId | undefined): boolean =>
  [...sites.values()].some((site) => site.hubDistrictId === districtId);
