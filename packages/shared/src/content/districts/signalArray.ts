import layout from './layouts/signal-array.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const SIGNAL_ARRAY = buildDistrict(layout);
export const SIGNAL_ARRAY_ANCHORS = anchorsOf(SIGNAL_ARRAY, ['tramPlatform', 'entrance', 'chuteLanding']);
