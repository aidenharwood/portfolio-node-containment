import layout from './layouts/calder-causeway.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const CALDER_CAUSEWAY = buildDistrict(layout);
export const CALDER_CAUSEWAY_ANCHORS = anchorsOf(CALDER_CAUSEWAY, []);
