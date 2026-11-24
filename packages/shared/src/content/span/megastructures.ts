import type { PieceSpec, Prefab } from '../prefabs/types.ts';
import { prefab } from '../prefabs/types.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import type { MegastructurePlacement } from '../../world/megastructure.ts';
import type { FurnishingKit } from '../furnishingKit.ts';
import { LANDMARK_HOMES, prop } from '../catalog/landmarks.ts';

const huge = { mount: 'free', homes: LANDMARK_HOMES } as const;
const MEGA_SCALE = 2;

const footing = (definition: Omit<Parameters<typeof prop>[0], 'furnishing' | 'modelScale'>): WorldObjectDefinition => prop({ ...definition, modelScale: MEGA_SCALE, furnishing: huge });
const overhead = (definition: Omit<Parameters<typeof prop>[0], 'furnishing' | 'modelScale'>): WorldObjectDefinition => ({ ...footing(definition), blocksMovement: false });

const MAGLEV = 'The Halcyon Spur: a Combine maglev guideway on its way to a district nobody built. The levitation strip still glows, and nothing has run on it since the anomalies.';
const SIPHON = 'The Terrace Siphon, a precursor pipe the co-op found running down the Massif and taught to carry water to the terraces. It sweats in the morning and hums at night.';
const RIBS = 'A run of the Meridian’s keel ribs, thrown clear when she came down. Scavengers have stripped the plate. The ribs were too big to move, so they stayed.';
const RING = 'A precursor ring of black glass, standing on its edge in the Steppe. The air inside it is a degree colder and very slightly brighter.';
const ARRAY = 'The Kestrel Uplink, a line of Directorate dishes listening up the Spindle. They have heard something every night since the anomalies, and they log it, and nobody reads the logs.';

export const MEGASTRUCTURE_OBJECTS: readonly WorldObjectDefinition[] = [
  footing({ id: 'maglev-pylon', name: 'Spur Pylon', examine: MAGLEV, model: 'maglevPylon', footprint: { width: 2, height: 2 } }),
  overhead({ id: 'maglev-span', name: 'Halcyon Spur', examine: MAGLEV, model: 'maglevSpan', footprint: { width: 8, height: 2 } }),
  overhead({ id: 'maglev-span-end', name: 'Halcyon Spur', examine: MAGLEV, model: 'maglevSpanEnd', footprint: { width: 8, height: 2 } }),
  footing({ id: 'siphon-trestle', name: 'Siphon Trestle', examine: SIPHON, model: 'siphonTrestle', footprint: { width: 2, height: 2 } }),
  overhead({ id: 'siphon-pipe', name: 'Terrace Siphon', examine: SIPHON, model: 'siphonPipe', footprint: { width: 8, height: 2 } }),
  footing({ id: 'keel-rib-foot', name: 'Keel Rib', examine: RIBS, model: 'ribFoot', footprint: { width: 2, height: 2 } }),
  overhead({ id: 'keel-rib-arch', name: 'Keel Rib', examine: RIBS, model: 'ribArch', footprint: { width: 10, height: 2 } }),
  footing({ id: 'resonance-foot', name: 'Ring Footing', examine: RING, model: 'ringFoot', footprint: { width: 3, height: 3 } }),
  overhead({ id: 'resonance-ring', name: 'Resonance Ring', examine: RING, model: 'ringArch', footprint: { width: 18, height: 3 }, light: { radius: 9, color: '#7fe8ff', intensity: 0.8 } }),
  footing({ id: 'uplink-dish', name: 'Uplink Dish', examine: ARRAY, model: 'uplinkDish', footprint: { width: 3, height: 3 } }),
  overhead({ id: 'uplink-cable', name: 'Uplink Cable', examine: ARRAY, model: 'uplinkCable', footprint: { width: 10, height: 1 } }),
];

function line(id: string, post: string, postSize: number, span: string, spanLength: number, posts: number, end?: string): Prefab {
  const pieces: PieceSpec[] = [];
  for (let index = 0; index < posts; index++) {
    const at = index * (postSize + spanLength);
    pieces.push([at, 0, post]);
    if (index < posts - 1) pieces.push([at + postSize, 0, span]);
  }
  if (end) pieces.push([posts * (postSize + spanLength) - spanLength, 0, end]);
  return prefab(id, ['megastructure'], pieces);
}

function ribs(id: string, count: number, pitch: number): Prefab {
  const pieces: PieceSpec[] = [];
  for (let index = 0; index < count; index++) {
    const dy = index * pitch;
    pieces.push([0, dy, 'keel-rib-foot'], [2, dy, 'keel-rib-arch'], [12, dy, 'keel-rib-foot']);
  }
  return prefab(id, ['megastructure'], pieces);
}

function dishes(id: string, count: number): Prefab {
  const pieces: PieceSpec[] = [];
  for (let index = 0; index < count; index++) {
    pieces.push([index * 13, 0, 'uplink-dish']);
    if (index < count - 1) pieces.push([index * 13 + 3, 1, 'uplink-cable']);
  }
  return prefab(id, ['megastructure'], pieces);
}

export const MEGASTRUCTURE_PREFABS: readonly Prefab[] = [
  line('mega-halcyon-spur', 'maglev-pylon', 2, 'maglev-span', 8, 6, 'maglev-span-end'),
  line('mega-terrace-siphon', 'siphon-trestle', 2, 'siphon-pipe', 8, 5),
  ribs('mega-keel-ribs', 4, 5),
  prefab('mega-resonance-ring', ['megastructure'], [[0, 0, 'resonance-foot'], [3, 0, 'resonance-ring'], [21, 0, 'resonance-foot']]),
  dishes('mega-kestrel-uplink', 4),
];

export const MEGASTRUCTURE_KIT: FurnishingKit = {
  objects: MEGASTRUCTURE_OBJECTS,
  prefabs: MEGASTRUCTURE_PREFABS,
  signatures: {},
};

export const SPAN_MEGASTRUCTURES: readonly MegastructurePlacement[] = [
  { id: 'halcyon-spur', prefab: 'mega-halcyon-spur', at: { districtId: 'combine-blocks', room: 'ground', dx: 42, dy: 18 } },
  { id: 'terrace-siphon', prefab: 'mega-terrace-siphon', at: { districtId: 'fallow-rows', room: 'ground', dx: 2, dy: 24 }, facing: 'east' },
  { id: 'meridian-ribs', prefab: 'mega-keel-ribs', at: { districtId: 'hull-shadow', room: 'ground', dx: 58, dy: 30 }, facing: 'east' },
  { id: 'resonance-ring', prefab: 'mega-resonance-ring', at: { districtId: 'vesper-approach', room: 'ground', dx: 59, dy: 7 } },
  { id: 'kestrel-uplink', prefab: 'mega-kestrel-uplink', at: { districtId: 'recruit-lines', room: 'ground', dx: 27, dy: 48 } },
];
