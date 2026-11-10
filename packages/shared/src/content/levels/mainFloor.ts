import type { LevelDefinition } from '../../world/level.ts';
import { joinDistricts } from '../../world/levelPlan.ts';
import { drawTrackway, trackCorner, trackPoint } from '../../world/trackway.ts';
import { BRINE_GALLERIES } from '../districts/brineGalleries.ts';
import { CALDER_CAUSEWAY } from '../districts/calderCauseway.ts';
import { CALDER_GATEHOUSE } from '../districts/calderGatehouse.ts';
import { HYDROPONICS } from '../districts/hydroponics.ts';
import { INTAKE_WING } from '../districts/intakeWing.ts';
import { ATRIUM_ANCHORS, MERIDIAN_ATRIUM } from '../districts/meridianAtrium.ts';
import { CIRCUIT_HOLLOW_FOR_ATRIUM, MERIDIAN_CIRCUIT } from '../districts/meridianCircuit.ts';
import { SALT_CATHEDRAL } from '../districts/saltCathedral.ts';
import { SECTOR_TWO } from '../districts/sectorTwo.ts';
import { SERVICE_CONCOURSE } from '../districts/serviceConcourse.ts';
import { SERVICE_YARDS } from '../districts/serviceYards.ts';
import { VERDANCE_CONCOURSE } from '../districts/verdanceConcourse.ts';
import { VESPER_CAUSEWAY } from '../districts/vesperCauseway.ts';
import { VESPER_LODGE } from '../districts/vesperLodge.ts';
import { VESPER_PHARMACY } from '../districts/vesperPharmacy.ts';
import { VESPER_WARDS } from '../districts/vesperWards.ts';
import { WATERWORKS } from '../districts/waterworks.ts';

const CHASM_WIDTH = 24;

const DISTRICTS = [
  MERIDIAN_ATRIUM,
  MERIDIAN_CIRCUIT,
  SECTOR_TWO,
  VERDANCE_CONCOURSE,
  HYDROPONICS,
  SERVICE_CONCOURSE,
  SERVICE_YARDS,
  WATERWORKS,
  INTAKE_WING,
  VESPER_CAUSEWAY,
  VESPER_WARDS,
  VESPER_LODGE,
  VESPER_PHARMACY,
  CALDER_CAUSEWAY,
  BRINE_GALLERIES,
  CALDER_GATEHOUSE,
  SALT_CATHEDRAL,
];

const PLACEMENTS = joinDistricts(DISTRICTS, 'meridian-atrium', [
  { districtId: 'sector-two', exit: 'south', to: 'meridian-atrium', toExit: 'north' },
  { districtId: 'meridian-circuit', from: 'meridian-atrium', offset: { x: -CIRCUIT_HOLLOW_FOR_ATRIUM.x, y: -CIRCUIT_HOLLOW_FOR_ATRIUM.y } },
  { districtId: 'verdance-concourse', exit: 'east', to: 'meridian-circuit', toExit: 'west' },
  { districtId: 'hydroponics', exit: 'east', to: 'verdance-concourse', toExit: 'west' },
  { districtId: 'service-concourse', exit: 'west', to: 'meridian-circuit', toExit: 'east' },
  { districtId: 'service-yards', exit: 'west', to: 'service-concourse', toExit: 'east' },
  { districtId: 'waterworks', exit: 'south', to: 'service-yards', toExit: 'north' },
  { districtId: 'intake-wing', from: 'meridian-circuit', offset: { x: 40, y: MERIDIAN_CIRCUIT.map.length + CHASM_WIDTH } },
  { districtId: 'vesper-causeway', exit: 'east', to: 'hydroponics', toExit: 'west' },
  { districtId: 'vesper-wards', exit: 'south', to: 'vesper-causeway', toExit: 'north' },
  { districtId: 'vesper-lodge', exit: 'east', to: 'vesper-wards', toExit: 'west' },
  { districtId: 'vesper-pharmacy', exit: 'east', to: 'vesper-lodge', toExit: 'west' },
  { districtId: 'calder-causeway', exit: 'west', to: 'waterworks', toExit: 'east' },
  { districtId: 'brine-galleries', exit: 'north', to: 'calder-causeway', toExit: 'south' },
  { districtId: 'calder-gatehouse', exit: 'west', to: 'brine-galleries', toExit: 'east' },
  { districtId: 'salt-cathedral', exit: 'west', to: 'calder-gatehouse', toExit: 'east' },
]);

const CHASM_TRUNK_ROW = MERIDIAN_CIRCUIT.map.length + 8;

const LODGE_MOUTH = trackPoint('vesper-lodge', 58, 46);
const VERDANCE_BRANCH = trackPoint('vesper-causeway', -2, 16);
const ATRIUM_JUNCTION = trackPoint('meridian-circuit', 70, CHASM_TRUNK_ROW);
const ATRIUM_MOUTH = trackPoint('meridian-circuit', 70, MERIDIAN_CIRCUIT.map.length);
const INTAKE_MOUTH = trackPoint('intake-wing', (INTAKE_WING.map[0] ?? '').length, 62);
const YARDS_MOUTH = trackPoint('service-concourse', 98, SERVICE_CONCOURSE.map.length);
const CALDER_TURN = trackPoint('service-yards', (SERVICE_YARDS.map[0] ?? '').length + 36, 0);
const SALT_ROAD_WEST = trackPoint('calder-causeway', -2, 52);
const SALT_ROAD_EAST = trackPoint('calder-causeway', (CALDER_CAUSEWAY.map[0] ?? '').length, 52);
const GATEHOUSE_MOUTH = trackPoint('calder-gatehouse', 3, -2);

const MERIDIAN_LINE = drawTrackway(PLACEMENTS, DISTRICTS, {
  id: 'meridian-line-trackway',
  name: 'Meridian Line',
  ambience: { darkness: 0.72, tint: '#0a0f12', fog: '#0c1216' },
  routes: [
    [LODGE_MOUTH, trackCorner(LODGE_MOUTH, ATRIUM_JUNCTION), ATRIUM_JUNCTION, ATRIUM_MOUTH],
    [trackCorner(LODGE_MOUTH, VERDANCE_BRANCH), VERDANCE_BRANCH],
    [ATRIUM_JUNCTION, trackCorner(CALDER_TURN, ATRIUM_JUNCTION), trackCorner(CALDER_TURN, SALT_ROAD_WEST), SALT_ROAD_WEST],
    [trackCorner(YARDS_MOUTH, ATRIUM_JUNCTION), YARDS_MOUTH],
    [trackCorner(INTAKE_MOUTH, ATRIUM_JUNCTION), INTAKE_MOUTH],
    [SALT_ROAD_EAST, trackCorner(GATEHOUSE_MOUTH, SALT_ROAD_EAST), GATEHOUSE_MOUTH],
  ],
});

export const MAIN_FLOOR: LevelDefinition = {
  id: 'main-floor',
  name: 'Site Meridian',
  kind: 'floor',
  depth: 0,
  capacity: 300,
  spawn: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.transit },
  districts: PLACEMENTS,
  connectors: [MERIDIAN_LINE],
};
