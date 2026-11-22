import type { DistrictDefinition } from '../../world/district.ts';
import { buildDistrict } from '../../world/layout.ts';
import { CITY_KIT } from '../catalog/cityKit.ts';
import { LANDMARK_KIT } from '../catalog/landmarks.ts';
import { BELOW_LAYOUT_IDS, LAYOUT_SOURCES, SQUARE_LAYOUT_IDS } from '../districts/layouts/index.ts';
import { registerFurnishingKit } from '../furnishingKit.ts';
import { landFrom, SHIPPED_LANDS } from '../land/index.ts';
import { SPAN_KIT } from './objects.ts';

registerFurnishingKit(CITY_KIT);
registerFurnishingKit(LANDMARK_KIT);
registerFurnishingKit(SPAN_KIT);

export const SPAN_LAND_ID = 'the-span';

const LAND = landFrom(SHIPPED_LANDS, SPAN_LAND_ID);

export const SPAN_SQUARES: readonly DistrictDefinition[] = SQUARE_LAYOUT_IDS.map((id) => buildDistrict(LAYOUT_SOURCES[id], LAND));

export const SPAN_BELOW: readonly DistrictDefinition[] = BELOW_LAYOUT_IDS.map((id) => buildDistrict(LAYOUT_SOURCES[id]));

export const SPAN_DISTRICTS: readonly DistrictDefinition[] = [...SPAN_SQUARES, ...SPAN_BELOW];

export function spanDistrict(id: string): DistrictDefinition {
  const district = SPAN_DISTRICTS.find((entry) => entry.id === id);
  if (!district) throw new Error(`There is no Span district "${id}".`);
  return district;
}

export function spanAnchor(districtId: string, anchor: string) {
  const point = spanDistrict(districtId).anchors?.[anchor];
  if (!point) throw new Error(`District "${districtId}" has no anchor "${anchor}".`);
  return point;
}
