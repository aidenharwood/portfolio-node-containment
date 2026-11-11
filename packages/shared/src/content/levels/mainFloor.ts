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
const TRACKWAY_MARGIN = { x: 8, y: 8 };

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
], TRACKWAY_MARGIN);

const widthOf = (district: { readonly map: readonly string[] }): number => (district.map[0] ?? '').length;

const RETURN_LEG = trackPoint('intake-wing', 0, 65);
const LODGE_NORTH = trackPoint('vesper-lodge', 55, -2);
const LODGE_SOUTH = trackPoint('vesper-lodge', 55, VESPER_LODGE.map.length);
const PHARMACY_CORNER = trackPoint('vesper-pharmacy', -5, -5);
const VERDANCE_WEST = trackPoint('hydroponics', -2, 68);
const VERDANCE_EAST = trackPoint('hydroponics', widthOf(HYDROPONICS), 68);
const CONCOURSE_JOG = trackPoint('verdance-concourse', 50, 0);
const CIRCUIT_WEST = trackPoint('meridian-circuit', -2, 189);
const CIRCUIT_EAST = trackPoint('meridian-circuit', widthOf(MERIDIAN_CIRCUIT), 189);
const YARDS_MOUTH = trackPoint('service-concourse', 98, SERVICE_CONCOURSE.map.length);
const YARDS_EAST = trackPoint('service-yards', widthOf(SERVICE_YARDS), 85);
const CALDER_TURN = trackPoint('service-yards', widthOf(SERVICE_YARDS) + 36, 0);
const SALT_ROAD_WEST = trackPoint('calder-causeway', -2, 52);
const SALT_ROAD_EAST = trackPoint('calder-causeway', widthOf(CALDER_CAUSEWAY), 52);
const GATEHOUSE_NORTH = trackPoint('calder-gatehouse', 3, -2);
const GATEHOUSE_SOUTH = trackPoint('calder-gatehouse', 3, CALDER_GATEHOUSE.map.length);
const INTAKE_WEST = trackPoint('intake-wing', -2, 65);
const INTAKE_EAST = trackPoint('intake-wing', widthOf(INTAKE_WING), 65);

const MERIDIAN_LINE = drawTrackway(PLACEMENTS, DISTRICTS, {
  id: 'meridian-line-trackway',
  name: 'Meridian Line',
  ambience: { darkness: 0.72, tint: '#0a0f12', fog: '#0c1216' },
  routes: [
    [LODGE_NORTH, trackCorner(LODGE_NORTH, PHARMACY_CORNER), PHARMACY_CORNER, trackCorner(PHARMACY_CORNER, RETURN_LEG), INTAKE_WEST],
    [INTAKE_EAST, trackCorner(GATEHOUSE_SOUTH, RETURN_LEG), GATEHOUSE_SOUTH],
    [LODGE_SOUTH, trackCorner(LODGE_SOUTH, VERDANCE_WEST), VERDANCE_WEST],
    [VERDANCE_EAST, trackCorner(CONCOURSE_JOG, VERDANCE_EAST), trackCorner(CONCOURSE_JOG, CIRCUIT_WEST), CIRCUIT_WEST],
    [CIRCUIT_EAST, trackCorner(YARDS_MOUTH, CIRCUIT_EAST), YARDS_MOUTH],
    [YARDS_EAST, trackCorner(CALDER_TURN, YARDS_EAST), trackCorner(CALDER_TURN, SALT_ROAD_WEST), SALT_ROAD_WEST],
    [SALT_ROAD_EAST, trackCorner(GATEHOUSE_NORTH, SALT_ROAD_EAST), GATEHOUSE_NORTH],
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
