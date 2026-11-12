import layout from './layouts/sector-three.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const SECTOR_THREE = buildDistrict(layout);
export const SECTOR_THREE_ANCHORS = anchorsOf(SECTOR_THREE, ['arrival', 'deepwatchArrival', 'knockReturn']);
