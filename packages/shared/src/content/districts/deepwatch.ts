import layout from './layouts/deepwatch.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const DEEPWATCH = buildDistrict(layout);
export const DEEPWATCH_ANCHORS = anchorsOf(DEEPWATCH, ['liftArrival', 'recovery', 'thresholdLanding', 'tramPlatform']);
