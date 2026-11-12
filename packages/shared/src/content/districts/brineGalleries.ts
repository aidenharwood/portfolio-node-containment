import layout from './layouts/brine-galleries.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const BRINE_GALLERIES = buildDistrict(layout);
export const BRINE_GALLERIES_ANCHORS = anchorsOf(BRINE_GALLERIES, []);
