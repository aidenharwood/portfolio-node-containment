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

export const VESPER_WING: RegionDefinition = {
  id: 'vesper',
  name: 'Vesper Wing',
  hubDistrictId: 'vesper-lodge',
};

export const REGIONS: readonly RegionDefinition[] = [MERIDIAN_CORE, CALDER_WING, VESPER_WING];
