import type { LevelDefinition } from '../../world/level.ts';
import { joinDistricts } from '../../world/levelPlan.ts';
import { CRYOVAULT } from '../districts/cryovault.ts';
import { CONCOURSE_HOLLOW_FOR_DEEPWATCH, DEEP_CONCOURSE } from '../districts/deepConcourse.ts';
import { DEEPWATCH, DEEPWATCH_ANCHORS } from '../districts/deepwatch.ts';
import { DROWNED_ARCHIVE } from '../districts/drownedArchive.ts';
import { FURNACE } from '../districts/furnace.ts';
import { FURNACE_CAUSEWAY } from '../districts/furnaceCauseway.ts';
import { SIGNAL_ARRAY } from '../districts/signalArray.ts';

const DISTRICTS = [DEEPWATCH, DEEP_CONCOURSE, FURNACE_CAUSEWAY, CRYOVAULT, SIGNAL_ARRAY, DROWNED_ARCHIVE, FURNACE];

export const THE_DEEP: LevelDefinition = {
  id: 'the-deep',
  name: 'The Deep',
  kind: 'floor',
  depth: -2,
  capacity: 200,
  spawn: { districtId: 'deepwatch', position: DEEPWATCH_ANCHORS.liftArrival },
  districts: joinDistricts(DISTRICTS, 'deepwatch', [
    { districtId: 'deep-concourse', from: 'deepwatch', offset: { x: -CONCOURSE_HOLLOW_FOR_DEEPWATCH.x, y: -CONCOURSE_HOLLOW_FOR_DEEPWATCH.y } },
    { districtId: 'cryovault', exit: 'east', to: 'deep-concourse', toExit: 'cryovault' },
    { districtId: 'drowned-archive', exit: 'west', to: 'deep-concourse', toExit: 'archive' },
    { districtId: 'signal-array', exit: 'north', to: 'deep-concourse', toExit: 'array' },
    { districtId: 'furnace-causeway', exit: 'south', to: 'deep-concourse', toExit: 'causeway' },
    { districtId: 'furnace', exit: 'south', to: 'furnace-causeway', toExit: 'north' },
  ]),
  connectors: [],
};
