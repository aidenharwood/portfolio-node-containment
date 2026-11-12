import layout from './layouts/intake-wing.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const INTAKE_WING = buildDistrict(layout);
export const INTAKE_WING_ANCHORS = anchorsOf(INTAKE_WING, ['tramPlatform', 'start']);
