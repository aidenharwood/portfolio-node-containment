import type { LevelDefinition } from '../../world/level.ts';
import { joinDistricts } from '../../world/levelPlan.ts';
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

export const MAIN_FLOOR: LevelDefinition = {
  id: 'main-floor',
  name: 'Site Meridian',
  kind: 'floor',
  depth: 0,
  capacity: 300,
  spawn: { districtId: 'meridian-atrium', position: ATRIUM_ANCHORS.transit },
  districts: joinDistricts(DISTRICTS, 'meridian-atrium', [
    { districtId: 'sector-two', exit: 'south', to: 'meridian-atrium', toExit: 'north' },
    { districtId: 'meridian-circuit', from: 'meridian-atrium', offset: { x: -CIRCUIT_HOLLOW_FOR_ATRIUM.x, y: -CIRCUIT_HOLLOW_FOR_ATRIUM.y } },
    { districtId: 'verdance-concourse', exit: 'east', to: 'meridian-circuit', toExit: 'west' },
    { districtId: 'hydroponics', exit: 'east', to: 'verdance-concourse', toExit: 'west' },
    { districtId: 'service-concourse', exit: 'west', to: 'meridian-circuit', toExit: 'east' },
    { districtId: 'service-yards', exit: 'west', to: 'service-concourse', toExit: 'east' },
    { districtId: 'waterworks', exit: 'south', to: 'service-yards', toExit: 'north' },
    { districtId: 'intake-wing', from: 'meridian-circuit', offset: { x: 40, y: MERIDIAN_CIRCUIT.map.length + CHASM_WIDTH } },
    { districtId: 'vesper-causeway', from: 'hydroponics', offset: { x: -26, y: 45 } },
    { districtId: 'vesper-wards', from: 'vesper-causeway', offset: { x: -44, y: -16 } },
    { districtId: 'vesper-lodge', from: 'vesper-causeway', offset: { x: -60, y: -10 } },
    { districtId: 'vesper-pharmacy', from: 'vesper-causeway', offset: { x: -100, y: -19 } },
    { districtId: 'calder-causeway', from: 'waterworks', offset: { x: 116, y: 59 } },
    { districtId: 'brine-galleries', from: 'calder-causeway', offset: { x: 26, y: -16 } },
    { districtId: 'calder-gatehouse', from: 'calder-causeway', offset: { x: 70, y: -10 } },
    { districtId: 'salt-cathedral', from: 'calder-causeway', offset: { x: 86, y: -19 } },
  ]),
  connectors: [],
};
