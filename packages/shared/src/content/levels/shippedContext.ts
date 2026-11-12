import { BRINE_GALLERIES } from '../districts/brineGalleries.ts';
import { CALDER_CAUSEWAY } from '../districts/calderCauseway.ts';
import { CALDER_DEEPS } from '../districts/calderDeeps.ts';
import { CALDER_GATEHOUSE } from '../districts/calderGatehouse.ts';
import { CRYOVAULT } from '../districts/cryovault.ts';
import { DEAD_LETTER_OFFICE } from '../districts/deadLetterOffice.ts';
import { DEEP_CONCOURSE } from '../districts/deepConcourse.ts';
import { DEEPWATCH } from '../districts/deepwatch.ts';
import { DROWNED_ARCHIVE } from '../districts/drownedArchive.ts';
import { FURNACE } from '../districts/furnace.ts';
import { FURNACE_CAUSEWAY } from '../districts/furnaceCauseway.ts';
import { HYDROPONICS } from '../districts/hydroponics.ts';
import { INTAKE_WING } from '../districts/intakeWing.ts';
import { MERIDIAN_ATRIUM } from '../districts/meridianAtrium.ts';
import { MERIDIAN_BELOW } from '../districts/meridianBelow.ts';
import { MERIDIAN_CIRCUIT } from '../districts/meridianCircuit.ts';
import { SALT_CATHEDRAL } from '../districts/saltCathedral.ts';
import { SECTOR_THREE } from '../districts/sectorThree.ts';
import { SECTOR_TWO } from '../districts/sectorTwo.ts';
import { SERVICE_CONCOURSE } from '../districts/serviceConcourse.ts';
import { SERVICE_YARDS } from '../districts/serviceYards.ts';
import { SIGNAL_ARRAY } from '../districts/signalArray.ts';
import { UNDERCROFT } from '../districts/undercroft.ts';
import { VERDANCE_CONCOURSE } from '../districts/verdanceConcourse.ts';
import { VERDANT_FOLD } from '../districts/verdantFold.ts';
import { VESPER_CAUSEWAY } from '../districts/vesperCauseway.ts';
import { VESPER_CELLARS } from '../districts/vesperCellars.ts';
import { VESPER_LODGE } from '../districts/vesperLodge.ts';
import { VESPER_PHARMACY } from '../districts/vesperPharmacy.ts';
import { VESPER_WARDS } from '../districts/vesperWards.ts';
import { WATERWORKS } from '../districts/waterworks.ts';
import { LAYOUT_SOURCES } from '../districts/layouts/index.ts';
import type { DistrictId } from '../../ids.ts';
import type { DistrictDefinition } from '../../world/district.ts';
import { firstHollowOf } from '../../world/layout.ts';
import type { LevelContext } from '../../world/level.ts';

const SHIPPED_DISTRICTS: ReadonlyMap<DistrictId, DistrictDefinition> = new Map([BRINE_GALLERIES, CALDER_CAUSEWAY, CALDER_DEEPS, CALDER_GATEHOUSE, CRYOVAULT, DEAD_LETTER_OFFICE, DEEP_CONCOURSE, DEEPWATCH, DROWNED_ARCHIVE, FURNACE, FURNACE_CAUSEWAY, HYDROPONICS, INTAKE_WING, MERIDIAN_ATRIUM, MERIDIAN_BELOW, MERIDIAN_CIRCUIT, SALT_CATHEDRAL, SECTOR_THREE, SECTOR_TWO, SERVICE_CONCOURSE, SERVICE_YARDS, SIGNAL_ARRAY, UNDERCROFT, VERDANCE_CONCOURSE, VERDANT_FOLD, VESPER_CAUSEWAY, VESPER_CELLARS, VESPER_LODGE, VESPER_PHARMACY, VESPER_WARDS, WATERWORKS].map((district) => [district.id, district]));

export const SHIPPED_CONTEXT: LevelContext = {
  districtOf: (id) => {
    const district = SHIPPED_DISTRICTS.get(id);
    if (!district) throw new Error(`There is no district "${id}".`);
    return district;
  },
  hollowOf: (id) => firstHollowOf(LAYOUT_SOURCES[id]),
};
