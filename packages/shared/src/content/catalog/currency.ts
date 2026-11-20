import type { ItemDefinition } from '../../gear/items.ts';

export const CURRENCY_ITEMS: readonly ItemDefinition[] = [
  {
    id: 'meridian-scrip',
    name: 'Scrip',
    examine: 'Directorate pay chits. Good anywhere the Directorate is looking.',
    category: 'currency',
    rarity: 'standard',
    icon: 'credits',
    iconColors: ['#e3c35a', '#8a6a1f'],
    maxStack: 1_000_000,
    value: 1,
  },
  {
    id: 'directorate-commendation',
    name: 'Commendation',
    examine: 'Stamped, countersigned and filed. Worth more than the work was.',
    category: 'currency',
    rarity: 'issued',
    icon: 'keycard',
    iconColors: ['#ffcf4d', '#7a3a8a'],
    maxStack: 1_000_000,
    value: 0,
  },
];
