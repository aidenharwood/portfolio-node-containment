import layout from './layouts/deep-concourse.json' with { type: 'json' };
import { anchorsOf, buildDistrict, firstHollowOf } from '../../world/layout.ts';
import type { TilePoint } from '../../world/geometry.ts';

export const CONCOURSE_HOLLOW_FOR_DEEPWATCH: TilePoint = firstHollowOf(layout);
export const DEEP_CONCOURSE = buildDistrict(layout);
export const DEEP_CONCOURSE_ANCHORS = anchorsOf(DEEP_CONCOURSE, ['cryovaultDoor', 'arrayDoor', 'archiveDoor', 'causewayGate', 'northSpan', 'southSpan', 'westSpan', 'eastSpan']);
