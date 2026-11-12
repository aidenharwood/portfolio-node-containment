import layout from './layouts/sector-two.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const SECTOR_TWO = buildDistrict(layout);
export const SECTOR_TWO_ANCHORS = anchorsOf(SECTOR_TWO, []);
