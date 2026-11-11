import type { LevelDefinition } from '../../world/level.ts';
import { joinDistricts } from '../../world/levelPlan.ts';
import { drawTrackway, trackCorner, trackPoint } from '../../world/trackway.ts';
import { CRYOVAULT } from '../districts/cryovault.ts';
import { CONCOURSE_HOLLOW_FOR_DEEPWATCH, DEEP_CONCOURSE } from '../districts/deepConcourse.ts';
import { DEEPWATCH, DEEPWATCH_ANCHORS } from '../districts/deepwatch.ts';
import { DROWNED_ARCHIVE } from '../districts/drownedArchive.ts';
import { FURNACE } from '../districts/furnace.ts';
import { FURNACE_CAUSEWAY } from '../districts/furnaceCauseway.ts';
import { SIGNAL_ARRAY } from '../districts/signalArray.ts';

const DISTRICTS = [DEEPWATCH, DEEP_CONCOURSE, FURNACE_CAUSEWAY, CRYOVAULT, SIGNAL_ARRAY, DROWNED_ARCHIVE, FURNACE];

const PLACEMENTS = joinDistricts(DISTRICTS, 'deepwatch', [
  { districtId: 'deep-concourse', from: 'deepwatch', offset: { x: -CONCOURSE_HOLLOW_FOR_DEEPWATCH.x, y: -CONCOURSE_HOLLOW_FOR_DEEPWATCH.y } },
  { districtId: 'cryovault', exit: 'east', to: 'deep-concourse', toExit: 'cryovault' },
  { districtId: 'drowned-archive', exit: 'west', to: 'deep-concourse', toExit: 'archive' },
  { districtId: 'signal-array', exit: 'north', to: 'deep-concourse', toExit: 'array' },
  { districtId: 'furnace-causeway', exit: 'south', to: 'deep-concourse', toExit: 'causeway' },
  { districtId: 'furnace', exit: 'south', to: 'furnace-causeway', toExit: 'north' },
]);

const widthOf = (district: { readonly map: readonly string[] }): number => district.map[0]?.length ?? 0;

const CRYOVAULT_NORTH = trackPoint('cryovault', 82, -2);
const CRYOVAULT_SOUTH = trackPoint('cryovault', 82, CRYOVAULT.map.length);
const ARCHIVE_NORTH = trackPoint('drowned-archive', 2, -2);
const ARCHIVE_SOUTH = trackPoint('drowned-archive', 2, DROWNED_ARCHIVE.map.length);
const FURNACE_WEST = trackPoint('furnace', -2, 58);
const FURNACE_EAST = trackPoint('furnace', widthOf(FURNACE), 58);
const FURNACE_SOUTH = trackPoint('furnace', 75, FURNACE.map.length);
const ARRAY_WEST = trackPoint('signal-array', -2, 2);
const ARRAY_EAST = trackPoint('signal-array', widthOf(SIGNAL_ARRAY), 2);
const CONCOURSE_NORTH = trackPoint('deep-concourse', 115, -2);

const ABYSSAL_TRACKWAY = drawTrackway(PLACEMENTS, DISTRICTS, {
  id: 'abyssal-trackway',
  name: 'Abyssal Circuit Trackway',
  ambience: { darkness: 0.8, tint: '#07090d', fog: '#0a0d14' },
  routes: [
    [CRYOVAULT_NORTH, trackCorner(CRYOVAULT_NORTH, FURNACE_WEST), FURNACE_WEST],
    [FURNACE_EAST, trackCorner(ARCHIVE_NORTH, FURNACE_EAST), ARCHIVE_NORTH],
    [ARCHIVE_SOUTH, trackCorner(ARCHIVE_SOUTH, ARRAY_EAST), ARRAY_EAST],
    [ARRAY_WEST, trackCorner(CRYOVAULT_SOUTH, ARRAY_WEST), CRYOVAULT_SOUTH],
    [FURNACE_SOUTH, CONCOURSE_NORTH],
  ],
});

export const THE_DEEP: LevelDefinition = {
  id: 'the-deep',
  name: 'The Deep',
  kind: 'floor',
  depth: -2,
  capacity: 200,
  spawn: { districtId: 'deepwatch', position: DEEPWATCH_ANCHORS.liftArrival },
  districts: PLACEMENTS,
  connectors: [ABYSSAL_TRACKWAY],
};
