import layout from './layouts/verdance-concourse.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const VERDANCE_CONCOURSE = buildDistrict(layout);
export const VERDANCE_CONCOURSE_ANCHORS = anchorsOf(VERDANCE_CONCOURSE, []);
