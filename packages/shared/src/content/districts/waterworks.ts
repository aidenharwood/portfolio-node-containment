import layout from './layouts/waterworks.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const WATERWORKS = buildDistrict(layout);
export const WATERWORKS_ANCHORS = anchorsOf(WATERWORKS, ['recovery']);
