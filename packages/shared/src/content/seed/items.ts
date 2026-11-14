import type { ItemDefinition } from '../../gear/items.ts';

export const CURRENCY_ITEMS: readonly ItemDefinition[] = [
  {
    id: 'meridian-scrip',
    name: 'Scrip',
    examine: 'Directorate-issued credit chits.',
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
    examine: 'A stamped commendation chit for contract work.',
    category: 'currency',
    rarity: 'issued',
    icon: 'keycard',
    iconColors: ['#ffcf4d', '#7a3a8a'],
    maxStack: 1_000_000,
    value: 0,
  },
];
