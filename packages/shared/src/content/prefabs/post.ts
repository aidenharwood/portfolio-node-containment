import { prefab, row, type Prefab } from './types.ts';

export const POST_PREFABS: readonly Prefab[] = [
  prefab('mail-carts', ['island', 'edge'], [[0, 0, 'book-trolley'], [1, 0, 'mail-sacks'], [2, 0, 'book-trolley']]),
  prefab('franking-island', ['focal'], [...row('mail-sacks', 4), [0, 1, 'book-trolley'], [1, 1, 'office-desk'], [2, 1, 'office-desk'], [3, 1, 'book-trolley']]),
  prefab('parcel-stack', ['island', 'edge'], [[0, 0, 'crate-stack'], [1, 0, 'mail-sacks'], [2, 0, 'packing-crate']]),
  prefab('pigeonholes', ['wall', 'bay'], [[0, 0, 'sorting-case'], [1, 0, 'sorting-case'], [2, 0, 'mail-sacks']], { rows: true }),
];
