import type { NpcDefinition } from '../world/entities.ts';

export const WATERWORKS_NPCS: readonly NpcDefinition[] = [
  {
    id: 'pumpwright-ngata',
    name: 'Pumpwright Ngata',
    title: 'Meridian Waterworks',
    examine: 'Waders to the chest, a pressure gauge on a lanyard, and the patience of someone who has unblocked every drain on the Site.',
    appearance: {
      physique: 'male',
      bodyType: 'broad',
      height: 1.02,
      skinTone: '#8d5a3b',
      hairStyle: 'buzz',
      hairColor: '#151214',
      eyeColor: '#3b2a1a',
      faceMark: 'burnMark',
      augment: 'ocularImplant',
    },
    gear: ['field-vest-mk1', 'intake-trousers', 'work-boots', 'containment-gloves'],
    dialogueId: 'ngata',
    wanderRadius: 1,
  },
];
