import layout from './layouts/vesper-wards.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const VESPER_WARDS = buildDistrict(layout);
export const VESPER_WARDS_ANCHORS = anchorsOf(VESPER_WARDS, []);
