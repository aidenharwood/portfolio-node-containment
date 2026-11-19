import { LOW_WARD_DISTRICTS } from '../districts/lowWard.ts';
import { SITE_MERIDIAN_DISTRICTS } from '../districts/siteMeridian.ts';
import { HINTERLAND_DISTRICTS } from '../districts/hinterland.ts';
import { LAYOUT_SOURCES } from '../districts/layouts/index.ts';
import { landFrom, SHIPPED_LANDS } from '../land/index.ts';
import type { DistrictId } from '../../ids.ts';
import type { DistrictDefinition } from '../../world/district.ts';
import { firstHollowOf } from '../../world/layout.ts';
import type { LevelContext } from '../../world/level.ts';

const SHIPPED_DISTRICTS: ReadonlyMap<DistrictId, DistrictDefinition> = new Map([...LOW_WARD_DISTRICTS, ...SITE_MERIDIAN_DISTRICTS, ...HINTERLAND_DISTRICTS].map((district) => [district.id, district]));

export const SHIPPED_CONTEXT: LevelContext = {
  districtOf: (id) => {
    const district = SHIPPED_DISTRICTS.get(id);
    if (!district) throw new Error(`There is no district "${id}".`);
    return district;
  },
  hollowOf: (id) => firstHollowOf(LAYOUT_SOURCES[id]),
  landOf: (id) => landFrom(SHIPPED_LANDS, id),
};
