import type { SiteDefinition } from '../world/site.ts';

export const MERIDIAN_SITE: SiteDefinition = {
  id: 'meridian',
  name: 'Site Meridian',
  hubDistrictId: 'meridian-atrium',
};

export const SITES: readonly SiteDefinition[] = [MERIDIAN_SITE];
