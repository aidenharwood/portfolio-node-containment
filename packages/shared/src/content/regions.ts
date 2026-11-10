import type { RegionDefinition } from '../world/region.ts';

export const MERIDIAN_CORE: RegionDefinition = {
  id: 'meridian-core',
  name: 'Meridian Core',
  hubDistrictId: 'meridian-atrium',
};

export const CALDER_WING: RegionDefinition = {
  id: 'calder',
  name: 'Calder Wing',
  hubDistrictId: 'calder-gatehouse',
};

export const REGIONS: readonly RegionDefinition[] = [MERIDIAN_CORE, CALDER_WING];
