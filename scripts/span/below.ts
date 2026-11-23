import { readFileSync } from 'node:fs';

type Json = Record<string, any>;

const source = (name: string): Json => JSON.parse(readFileSync(new URL('./source/meridian-' + name + '.json', import.meta.url), 'utf8'));

function retitle(layout: Json, options: { id: string; name: string; subtitle: string; tier: number; region: string; condition: string; objects: Record<string, string | null>; creatures: Record<string, string>; areas: Record<string, string>; npcs: Json[]; multiCombat?: readonly string[]; elites?: Json[]; recast?: Record<number, string>; ambience?: Json; extraCreatures?: Json[]; extraObjects?: Json[]; setPieces?: Json[]; landmarks?: string[] }): Json {
  return {
    ...layout,
    id: options.id,
    name: options.name,
    subtitle: options.subtitle,
    tier: options.tier,
    region: options.region,
    condition: options.condition,
    ...(options.ambience ? { ambience: options.ambience } : {}),
    areas: layout.areas.map((area: Json) => ({ ...area, name: options.areas[area.room] ?? area.name, ...(options.multiCombat?.includes(area.room) ? { multiCombat: true } : {}) })),
    objects: layout.objects.flatMap((object: Json) => {
      const replacement = options.objects[object.object];
      if (replacement === null) return [];
      return [{ ...object, id: options.id + '-' + object.id, object: replacement ?? object.object }];
    }).concat(options.extraObjects ?? []),
    creatures: [...(options.elites ?? []), ...layout.creatures.map((creature: Json, index: number) => ({ ...creature, id: options.id + '-' + index, creature: options.recast?.[index] ?? options.creatures[creature.creature] ?? creature.creature })), ...(options.extraCreatures ?? [])],
    npcs: options.npcs,
    ...(options.setPieces ? { setPieces: options.setPieces } : {}),
    ...(options.landmarks ? { furnish: { ...layout.furnish, landmarks: options.landmarks } } : {}),
  };
}

const intake = source('intake');
const secure = source('secure');
const vault = source('vault');

let hound = 0;
const intakeCreatures = intake.creatures.map((creature: Json) => (creature.creature === 'glass-hound' ? { ...creature, creature: hound++ % 2 === 0 ? 'grounds-mite' : 'sim-wisp' } : creature));

let wreck = 0;
const tallowCreatures = intake.creatures.map((creature: Json) => (creature.creature === 'moth-lantern' ? { ...creature, creature: wreck++ % 3 === 2 ? 'rustling' : 'bilge-wraith' } : creature));
const DEEP = ['glass-stalker', 'prism-hound'];
let deep = 0;
const deepCreatures = vault.creatures.map((creature: Json) => (creature.creature === 'vault-echo' ? { ...creature, creature: DEEP[deep++ % DEEP.length] } : creature));

export const BELOW: readonly Json[] = [
  retitle({ ...intake, creatures: intakeCreatures }, {
    id: 'kestrel-intake',
    name: 'Kestrel Intake',
    subtitle: 'Site Kestrel, B1 · the Roster',
    tier: 2,
    region: 'kestrel-reach',
    condition: 'pristine',
    objects: { 'intake-lift-up': 'kestrel-lift-up', 'intake-lift-down': null, 'culture-bench': 'faint-trace', 'amber-trace': 'cable-drum', 'specimen-tank': 'the-roster' },
    creatures: { 'moth-lantern': 'sim-wisp' },
    areas: { 'lift-lobby': 'B1 Lift Lobby', processing: 'Processing Hall', 'lab-a': 'Print Room', ward: 'Recovery Ward', 'amber-cells': 'Roster Holding', 'lower-lift': 'Sealed Lift' },
    npcs: [{ id: 'kestrel-intake-hask', npc: 'officer-hask', at: { room: 'processing', dx: 15, dy: 2 } }],
    multiCombat: ['amber-cells'],
    elites: [{ id: 'amber-cells-drill-master-0', creature: 'drill-master', at: { room: 'amber-cells', dx: 20, dy: 6 } }],
  }),
  retitle(secure, {
    id: 'gallowglass-undercity',
    name: 'Gallowglass Undercity',
    subtitle: 'Site Gallowglass, B1 · Breached',
    tier: 7,
    region: 'halcyon',
    condition: 'breached',
    objects: { 'secure-lift-up': 'gallowglass-lift-up', 'secure-lift-down': null, 'b2-records': 'brightly-reel', 'directorate-salvage': 'crusher-housing', 'sprung-cell-door': 'lock-gear', 'red-moss': 'culture-bench', 'red-trace': 'amber-trace' },
    creatures: { 'red-twin': 'ad-wraith', 'cell-breaker': 'glass-hound' },
    areas: { 'secure-lift': 'Undercity Landing', 'red-gallery': 'The Arcade Gallery', cellblock: 'Cellblock Glass', 'breach-ward': 'The Studio', observation: 'Control Room', 'vault-stair': 'Dead Lift' },
    npcs: [],
    extraCreatures: [{ id: 'gallowglass-undercity-mr-brightly', creature: 'mr-brightly', at: { room: 'breach-ward', dx: 12, dy: 7 } }],
    multiCombat: ['breach-ward'],
    ambience: { darkness: 0.78, tint: '#2a1838', fog: '#140a1c', fixtures: 'failing', weather: ['sparks', 'dust'], haze: 1.1 },
  }),
  retitle(vault, {
    id: 'null-below',
    name: 'Null Below',
    subtitle: 'Site Null, B1 · Inverted',
    tier: 13,
    region: 'the-spindle',
    condition: 'uncanny',
    objects: { 'vault-lift-up': 'null-lift-up', 'sealed-hatch': 'null-console' },
    creatures: { 'vault-echo': 'null-echo', 'the-warden': 'warden-of-null' },
    areas: { landing: 'Null Landing', 'chamber-b': 'The Waiting Room', 'chamber-a': 'North Ward', 'chamber-c': 'South Ward', heart: 'The Review' },
    npcs: [],
    multiCombat: ['heart'],
    recast: { 1: 'cell-breaker' },
  }),
  retitle({ ...intake, creatures: tallowCreatures }, {
    id: 'tallow-holding',
    name: 'Tallow Holding',
    subtitle: 'Site Tallow, B1 · Overrun',
    tier: 9,
    region: 'wreckfield',
    condition: 'breached',
    objects: { 'intake-lift-up': 'tallow-lift-up', 'intake-lift-down': null, 'culture-bench': 'hull-trace', 'amber-trace': 'rivet-seam', 'specimen-tank': 'tallow-ledger', 'containment-cell': 'secure-cell' },
    creatures: { 'glass-hound': 'misprint' },
    areas: { 'lift-lobby': 'Holding Lift Lobby', processing: 'Casualty Hall', 'lab-a': 'Print Lab', ward: 'Sick Bay', 'amber-cells': 'The Overrun Cells', 'lower-lift': 'Flooded Shaft' },
    npcs: [{ id: 'tallow-holding-orderly-nasser', npc: 'orderly-nasser', at: { room: 'processing', dx: 15, dy: 2 } }],
    extraObjects: [{ id: 'tallow-holding-strongroom', object: 'wreck-strongroom', at: { room: 'amber-cells', dx: 35, dy: 10 } }],
    setPieces: [{ id: 'tallow-holding-landmark', prefab: 'landmark-holding-furnace', at: { room: 'amber-cells', dx: 22, dy: 6 }, facing: 'south' }],
    landmarks: ['amber-cells'],
    ambience: { darkness: 0.72, tint: '#5a3a28', fog: '#2a1810', fixtures: 'failing', weather: ['dust', 'embers'], haze: 1.2 },
  }),
  retitle({ ...vault, creatures: deepCreatures }, {
    id: 'vesper-deep',
    name: 'Vesper Deep',
    subtitle: 'Site Vesper, B1 · Lost',
    tier: 11,
    region: 'glass-steppe',
    condition: 'alien',
    objects: { 'vault-lift-up': 'vesper-lift-up', 'sealed-hatch': 'vesper-cradle', 'vault-residue': 'directorate-salvage', 'vault-bloom': 'red-moss', 'vault-trace': 'red-trace' },
    creatures: { 'the-warden': 'glass-stalker' },
    areas: { landing: 'Deep Landing', 'chamber-b': 'The Undercroft', 'chamber-a': 'North Choir', 'chamber-c': 'South Choir', heart: 'The Cradle' },
    npcs: [],
    multiCombat: ['heart'],
    extraCreatures: [
      { id: 'vesper-deep-cradle-echo-0', creature: 'choir-echo', at: { room: 'heart', dx: 6, dy: 30 } },
      { id: 'vesper-deep-cradle-echo-1', creature: 'red-twin', at: { room: 'heart', dx: 18, dy: 32 } },
      { id: 'vesper-deep-cradle-echo-2', creature: 'choir-echo', at: { room: 'heart', dx: 3, dy: 22 } },
    ],
    extraObjects: [{ id: 'vesper-deep-reliquary', object: 'steppe-reliquary', at: { room: 'chamber-a', dx: 2, dy: 2 } }],
    setPieces: [{ id: 'vesper-deep-landmark', prefab: 'landmark-glass-spire', at: { room: 'heart', dx: 19, dy: 4 }, facing: 'south' }],
    landmarks: ['heart'],
    ambience: { darkness: 0.8, tint: '#3c3a5a', fog: '#1a1830', fixtures: 'failing', weather: ['spores'], haze: 1.3 },
  }),
];
