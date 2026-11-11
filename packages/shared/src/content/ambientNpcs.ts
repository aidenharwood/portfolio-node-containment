import type { CharacterAppearance } from '../character/appearance.ts';
import type { ItemId, NpcId } from '../ids.ts';
import type { NpcDefinition } from '../world/entities.ts';

type Look = readonly [
  physique: CharacterAppearance['physique'],
  bodyType: CharacterAppearance['bodyType'],
  height: number,
  skinTone: string,
  hairStyle: CharacterAppearance['hairStyle'],
  hairColor: string,
  faceMark?: CharacterAppearance['faceMark'],
  augment?: CharacterAppearance['augment'],
];

interface Role {
  readonly key: string;
  readonly name: string;
  readonly title: string;
  readonly examine: string;
  readonly gear: readonly ItemId[];
  readonly looks: readonly Look[];
}

const EYES = ['#3b2a1a', '#6a4b2b', '#4f7a3a', '#3d6e9c', '#7c8a92'] as const;

const ROLES: readonly Role[] = [
  {
    key: 'staffer',
    name: 'Site Staffer',
    title: 'Meridian Staff',
    examine: 'Lanyard, clipboard, the thousand-yard stare of someone on their third double shift.',
    gear: ['intake-jumpsuit', 'intake-trousers', 'work-boots', 'operative-badge'],
    looks: [
      ['female', 'average', 1.0, '#d9a37f', 'bun', '#3b2618'],
      ['male', 'slight', 0.97, '#a86f4c', 'crop', '#151214', 'freckles'],
      ['female', 'slight', 0.95, '#f6d7c3', 'swept', '#a5763d'],
      ['male', 'broad', 1.03, '#4a2b1c', 'buzz', '#151214'],
    ],
  },
  {
    key: 'operative',
    name: 'Off-Shift Operative',
    title: 'Containment Response',
    examine: 'Boots unlaced, vest half open. Off duty, technically. Their hand never strays far from the holster.',
    gear: ['field-vest-mk1', 'intake-trousers', 'work-boots', 'containment-gloves'],
    looks: [
      ['male', 'broad', 1.05, '#8a5537', 'undercut', '#151214', 'scarBrow'],
      ['female', 'average', 1.02, '#c48a62', 'braids', '#151214'],
      ['male', 'average', 1.0, '#eac0a0', 'shaved', '#6b4423', 'none', 'ocularImplant'],
      ['female', 'broad', 1.04, '#6b3f28', 'mohawk', '#8f2f2a', 'barcodeTattoo'],
    ],
  },
  {
    key: 'clerk',
    name: 'Directorate Clerk',
    title: 'Records and Requisitions',
    examine: 'Carries three forms for every problem and a fourth for the forms.',
    gear: ['lab-coat', 'intake-trousers', 'work-boots', 'research-datapad'],
    looks: [
      ['male', 'slight', 0.96, '#d9a37f', 'swept', '#e8e2d4'],
      ['female', 'average', 0.98, '#8a5537', 'long', '#151214'],
    ],
  },
  {
    key: 'security',
    name: 'Security Officer',
    title: 'Site Security',
    examine: 'Helmet on, visor up, eyes on everyone. Mostly on you.',
    gear: ['response-helmet', 'field-vest-mk1', 'intake-trousers', 'work-boots', 'stun-baton'],
    looks: [
      ['male', 'broad', 1.06, '#a86f4c', 'buzz', '#3b2618', 'none', 'jawPlate'],
      ['female', 'average', 1.01, '#eac0a0', 'bun', '#d8b46a'],
    ],
  },
  {
    key: 'janitor',
    name: 'Custodian',
    title: 'Facilities',
    examine: 'Has mopped up things the incident reports refuse to name.',
    gear: ['intake-jumpsuit', 'intake-trousers', 'work-boots', 'containment-gloves'],
    looks: [
      ['male', 'average', 0.99, '#6b3f28', 'crop', '#e8e2d4'],
      ['female', 'slight', 0.94, '#c48a62', 'bun', '#6b4423', 'burnMark'],
    ],
  },
  {
    key: 'cook',
    name: 'Mess Cook',
    title: 'Catering Section',
    examine: 'Smells of onions and machine oil. Insists the stew is mostly vegetable.',
    gear: ['intake-jumpsuit', 'intake-trousers', 'work-boots'],
    looks: [
      ['male', 'broad', 1.02, '#eac0a0', 'shaved', '#151214'],
      ['female', 'broad', 1.0, '#4a2b1c', 'braids', '#151214'],
    ],
  },
  {
    key: 'technician',
    name: 'Maintenance Tech',
    title: 'Facilities Engineering',
    examine: 'Tool belt, burn scars, and a running feud with every junction box on the level.',
    gear: ['intake-jumpsuit', 'intake-trousers', 'work-boots', 'containment-gloves', 'hazard-visor'],
    looks: [
      ['male', 'average', 1.01, '#c48a62', 'undercut', '#3b2618', 'burnMark'],
      ['female', 'average', 0.99, '#a86f4c', 'crop', '#4f6f9e', 'none', 'neuralPort'],
      ['male', 'slight', 0.97, '#f6d7c3', 'buzz', '#d8b46a', 'freckles'],
    ],
  },
  {
    key: 'freight',
    name: 'Freight Hand',
    title: 'Service Logistics',
    examine: 'Shoulders built by crates. Has signed for things that should not have been posted.',
    gear: ['field-vest-mk1', 'intake-trousers', 'work-boots', 'containment-gloves'],
    looks: [
      ['male', 'broad', 1.07, '#8a5537', 'shaved', '#151214', 'scarCheek'],
      ['female', 'broad', 1.03, '#d9a37f', 'undercut', '#6b4423'],
    ],
  },
  {
    key: 'researcher',
    name: 'Research Assistant',
    title: 'Anomalous Studies',
    examine: 'Taking notes on everything, including, now, you.',
    gear: ['lab-coat', 'intake-trousers', 'work-boots', 'research-datapad'],
    looks: [
      ['female', 'slight', 0.96, '#eac0a0', 'long', '#3b2618', 'none', 'ocularImplant'],
      ['male', 'slight', 0.98, '#6b3f28', 'swept', '#151214'],
      ['female', 'average', 1.0, '#b7c7cf', 'bun', '#5fd1b8', 'none', 'circuitTrace'],
    ],
  },
  {
    key: 'orderly',
    name: 'Orderly',
    title: 'Medical Section',
    examine: 'Gloves on, sleeves rolled, already looking at the next bed.',
    gear: ['lab-coat', 'intake-trousers', 'work-boots', 'filter-respirator'],
    looks: [
      ['male', 'average', 1.0, '#a86f4c', 'crop', '#151214'],
      ['female', 'slight', 0.97, '#f6d7c3', 'bun', '#8f2f2a'],
    ],
  },
  {
    key: 'deckhand',
    name: 'Deep Station Hand',
    title: 'Deepwatch',
    examine: 'Breathes through a respirator out of habit. Down here, it is a good habit.',
    gear: ['intake-jumpsuit', 'intake-trousers', 'work-boots', 'filter-respirator', 'hazard-visor'],
    looks: [
      ['male', 'average', 1.0, '#4a2b1c', 'buzz', '#151214', 'none', 'respirator'],
      ['female', 'average', 0.99, '#c48a62', 'undercut', '#e8e2d4', 'scarBrow'],
    ],
  },
  {
    key: 'saltworker',
    name: 'Saltworker',
    title: 'Calder Saltworks',
    examine: 'Salt in the creases of their knuckles and the corners of their eyes. They do not wipe it away.',
    gear: ['saltworks-plate', 'saltworks-trousers', 'saltworks-boots'],
    looks: [
      ['male', 'broad', 1.04, '#d9a37f', 'shaved', '#e8e2d4', 'scarCheek'],
      ['female', 'average', 1.0, '#8a5537', 'braids', '#e8e2d4'],
    ],
  },
  {
    key: 'porter',
    name: 'Ward Porter',
    title: 'Vesper Sanatorium',
    examine: 'Starched whites gone grey. Pushes an empty chair everywhere, in case.',
    gear: ['ward-plate', 'ward-trousers', 'ward-boots'],
    looks: [
      ['male', 'slight', 0.98, '#f6d7c3', 'swept', '#151214'],
      ['female', 'average', 1.0, '#6b3f28', 'bun', '#151214'],
    ],
  },
];

const npcIdOf = (role: Role, index: number): NpcId => `ambient-${role.key}-${index + 1}`;

const toNpc = (role: Role, look: Look, index: number): NpcDefinition => {
  const [physique, bodyType, height, skinTone, hairStyle, hairColor, faceMark = 'none', augment = 'none'] = look;
  return {
    id: npcIdOf(role, index),
    name: role.name,
    title: role.title,
    examine: role.examine,
    appearance: { physique, bodyType, height, skinTone, hairStyle, hairColor, eyeColor: EYES[index % EYES.length] as string, faceMark, augment },
    gear: role.gear,
    dialogueId: `ambient-${role.key}`,
    wanderRadius: 3,
  };
};

export const AMBIENT_NPCS: readonly NpcDefinition[] = ROLES.flatMap((role) => role.looks.map((look, index) => toNpc(role, look, index)));

export type AmbientRole = 'staffer' | 'operative' | 'clerk' | 'security' | 'janitor' | 'cook' | 'technician' | 'freight' | 'researcher' | 'orderly' | 'deckhand' | 'saltworker' | 'porter';

export const ambientCast = (...roles: readonly AmbientRole[]): NpcId[] =>
  roles.flatMap((key) => {
    const role = ROLES.find((candidate) => candidate.key === key);
    return role ? role.looks.map((_look, index) => npcIdOf(role, index)) : [];
  });
