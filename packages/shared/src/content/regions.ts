import type { RegionDefinition } from '../world/region.ts';

export const MERIDIAN_CORE: RegionDefinition = {
  id: 'meridian-core',
  name: 'Meridian Core',
  hubDistrictId: 'meridian-atrium',
};

export const REGIONS: readonly RegionDefinition[] = [MERIDIAN_CORE];
