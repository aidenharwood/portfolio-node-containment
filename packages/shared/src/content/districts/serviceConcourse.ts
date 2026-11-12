import layout from './layouts/service-concourse.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const SERVICE_CONCOURSE = buildDistrict(layout);
export const SERVICE_CONCOURSE_ANCHORS = anchorsOf(SERVICE_CONCOURSE, []);
