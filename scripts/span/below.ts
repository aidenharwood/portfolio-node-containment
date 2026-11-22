import { readFileSync } from 'node:fs';

type Json = Record<string, any>;

const source = (name: string): Json => JSON.parse(readFileSync(new URL('./source/meridian-' + name + '.json', import.meta.url), 'utf8'));

function retitle(layout: Json, options: { id: string; name: string; subtitle: string; tier: number; region: string; condition: string; objects: Record<string, string | null>; creatures: Record<string, string>; areas: Record<string, string>; npcs: Json[]; multiCombat?: readonly string[]; ambience?: Json; extraCreatures?: Json[] }): Json {
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
    }),
    creatures: [...layout.creatures.map((creature: Json, index: number) => ({ ...creature, id: options.id + '-' + index, creature: options.creatures[creature.creature] ?? creature.creature })), ...(options.extraCreatures ?? [])],
    npcs: options.npcs,
  };
}

const intake = source('intake');
const secure = source('secure');
const vault = source('vault');

let hound = 0;
const intakeCreatures = intake.creatures.map((creature: Json) => (creature.creature === 'glass-hound' ? { ...creature, creature: hound++ % 2 === 0 ? 'grounds-mite' : 'sim-wisp' } : creature));

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
  }),
];
