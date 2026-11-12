import layout from './layouts/meridian-atrium.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const MERIDIAN_ATRIUM = buildDistrict(layout);
export const ATRIUM_ANCHORS = anchorsOf(MERIDIAN_ATRIUM, ['transit', 'deepLineArrival', 'serviceLiftArrival', 'recovery']);
