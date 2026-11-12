import brineGalleries from './brine-galleries.json' with { type: 'json' };
import calderCauseway from './calder-causeway.json' with { type: 'json' };
import calderDeeps from './calder-deeps.json' with { type: 'json' };
import calderGatehouse from './calder-gatehouse.json' with { type: 'json' };
import cryovault from './cryovault.json' with { type: 'json' };
import deadLetterOffice from './dead-letter-office.json' with { type: 'json' };
import deepConcourse from './deep-concourse.json' with { type: 'json' };
import deepwatch from './deepwatch.json' with { type: 'json' };
import drownedArchive from './drowned-archive.json' with { type: 'json' };
import furnace from './furnace.json' with { type: 'json' };
import furnaceCauseway from './furnace-causeway.json' with { type: 'json' };
import hydroponics from './hydroponics.json' with { type: 'json' };
import intakeWing from './intake-wing.json' with { type: 'json' };
import meridianAtrium from './meridian-atrium.json' with { type: 'json' };
import meridianBelow from './meridian-below.json' with { type: 'json' };
import meridianCircuit from './meridian-circuit.json' with { type: 'json' };
import saltCathedral from './salt-cathedral.json' with { type: 'json' };
import sectorThree from './sector-three.json' with { type: 'json' };
import sectorTwo from './sector-two.json' with { type: 'json' };
import serviceConcourse from './service-concourse.json' with { type: 'json' };
import serviceYards from './service-yards.json' with { type: 'json' };
import signalArray from './signal-array.json' with { type: 'json' };
import undercroft from './undercroft.json' with { type: 'json' };
import verdanceConcourse from './verdance-concourse.json' with { type: 'json' };
import verdantFold from './verdant-fold.json' with { type: 'json' };
import vesperCauseway from './vesper-causeway.json' with { type: 'json' };
import vesperCellars from './vesper-cellars.json' with { type: 'json' };
import vesperLodge from './vesper-lodge.json' with { type: 'json' };
import vesperPharmacy from './vesper-pharmacy.json' with { type: 'json' };
import vesperWards from './vesper-wards.json' with { type: 'json' };
import waterworks from './waterworks.json' with { type: 'json' };
import type { DistrictId } from '../../../ids.ts';

export const LAYOUT_SOURCES: Readonly<Record<DistrictId, unknown>> = {
  'brine-galleries': brineGalleries,
  'calder-causeway': calderCauseway,
  'calder-deeps': calderDeeps,
  'calder-gatehouse': calderGatehouse,
  'cryovault': cryovault,
  'dead-letter-office': deadLetterOffice,
  'deep-concourse': deepConcourse,
  'deepwatch': deepwatch,
  'drowned-archive': drownedArchive,
  'furnace': furnace,
  'furnace-causeway': furnaceCauseway,
  'hydroponics': hydroponics,
  'intake-wing': intakeWing,
  'meridian-atrium': meridianAtrium,
  'meridian-below': meridianBelow,
  'meridian-circuit': meridianCircuit,
  'salt-cathedral': saltCathedral,
  'sector-three': sectorThree,
  'sector-two': sectorTwo,
  'service-concourse': serviceConcourse,
  'service-yards': serviceYards,
  'signal-array': signalArray,
  'undercroft': undercroft,
  'verdance-concourse': verdanceConcourse,
  'verdant-fold': verdantFold,
  'vesper-causeway': vesperCauseway,
  'vesper-cellars': vesperCellars,
  'vesper-lodge': vesperLodge,
  'vesper-pharmacy': vesperPharmacy,
  'vesper-wards': vesperWards,
  'waterworks': waterworks,
};
