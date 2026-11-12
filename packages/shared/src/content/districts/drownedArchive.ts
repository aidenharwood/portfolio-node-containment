import layout from './layouts/drowned-archive.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const DROWNED_ARCHIVE = buildDistrict(layout);
export const DROWNED_ARCHIVE_ANCHORS = anchorsOf(DROWNED_ARCHIVE, ['tramPlatform', 'entrance', 'sealedApproach']);
