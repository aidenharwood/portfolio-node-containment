import layout from './layouts/vesper-pharmacy.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const VESPER_PHARMACY = buildDistrict(layout);
export const VESPER_PHARMACY_ANCHORS = anchorsOf(VESPER_PHARMACY, []);
