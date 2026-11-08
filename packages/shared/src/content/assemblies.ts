import type { AssemblyDefinition } from '../world/assemblies.ts';

export const TRAM_CAR: AssemblyDefinition = {
  id: 'tram-car',
  name: 'Tram Car',
  pieces: {
    L: { objectId: 'tram-car-nose-left' },
    R: { objectId: 'tram-car-nose-right' },
    D: { objectId: 'tram-car-door' },
    W: { objectId: 'tram-car-window' },
    l: { objectId: 'tram-car-nose-left', turns: 2 },
    r: { objectId: 'tram-car-nose-right', turns: 2 },
    d: { objectId: 'tram-car-door', turns: 2 },
    w: { objectId: 'tram-car-window', turns: 2 },
  },
  layout: ['rdwwdl', 'LDWWDR'],
};

export const BRIDGE: AssemblyDefinition = {
  id: 'bridge',
  name: 'Bridge',
  pieces: {
    L: { objectId: 'bridge-end-left' },
    R: { objectId: 'bridge-end-right' },
    l: { objectId: 'bridge-end-left', turns: 2 },
    r: { objectId: 'bridge-end-right', turns: 2 },
    s: { objectId: 'bridge-span' },
    S: { objectId: 'bridge-span', turns: 2 },
  },
  layout: ['LR', 'sS', 'rl'],
  stretchRow: 1,
};

export const CATWALK: AssemblyDefinition = {
  id: 'catwalk',
  name: 'Catwalk',
  pieces: {
    E: { objectId: 'catwalk-end' },
    e: { objectId: 'catwalk-end', turns: 2 },
    c: { objectId: 'catwalk-span' },
  },
  layout: ['E', 'c', 'e'],
  stretchRow: 1,
};

export const CABLE_RUN: AssemblyDefinition = {
  id: 'cable-run',
  name: 'Cable Run',
  pieces: {
    E: { objectId: 'cable-run-end' },
    e: { objectId: 'cable-run-end', turns: 2 },
    c: { objectId: 'cable-run' },
  },
  layout: ['E', 'c', 'e'],
  stretchRow: 1,
};

export const ASSEMBLIES: readonly AssemblyDefinition[] = [TRAM_CAR, BRIDGE, CATWALK, CABLE_RUN];
