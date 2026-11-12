import layout from './layouts/service-yards.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const SERVICE_YARDS = buildDistrict(layout);
export const SERVICE_YARDS_ANCHORS = anchorsOf(SERVICE_YARDS, ['tramPlatform']);
