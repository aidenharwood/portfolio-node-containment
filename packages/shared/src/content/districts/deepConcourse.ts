import layout from './layouts/deep-concourse.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const DEEP_CONCOURSE = buildDistrict(layout);
export const DEEP_CONCOURSE_ANCHORS = anchorsOf(DEEP_CONCOURSE, ['cryovaultDoor', 'arrayDoor', 'archiveDoor', 'causewayGate', 'northSpan', 'southSpan', 'westSpan', 'eastSpan']);
