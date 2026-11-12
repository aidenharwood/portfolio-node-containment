import layout from './layouts/meridian-below.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const MERIDIAN_BELOW = buildDistrict(layout);
export const MERIDIAN_BELOW_ANCHORS = anchorsOf(MERIDIAN_BELOW, ['arrival']);
