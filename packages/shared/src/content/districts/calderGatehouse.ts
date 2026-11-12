import layout from './layouts/calder-gatehouse.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const CALDER_GATEHOUSE = buildDistrict(layout);
export const CALDER_GATEHOUSE_ANCHORS = anchorsOf(CALDER_GATEHOUSE, ['liftArrival', 'tramPlatform']);
