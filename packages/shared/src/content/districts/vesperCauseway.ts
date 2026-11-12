import layout from './layouts/vesper-causeway.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const VESPER_CAUSEWAY = buildDistrict(layout);
export const VESPER_CAUSEWAY_ANCHORS = anchorsOf(VESPER_CAUSEWAY, []);
