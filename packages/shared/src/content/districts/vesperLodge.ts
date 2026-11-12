import layout from './layouts/vesper-lodge.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const VESPER_LODGE = buildDistrict(layout);
export const VESPER_LODGE_ANCHORS = anchorsOf(VESPER_LODGE, ['liftArrival', 'tramPlatform']);
