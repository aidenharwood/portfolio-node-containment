import { prefab, row, type Prefab } from './types.ts';

export const POST_PREFABS: readonly Prefab[] = [
  prefab('mail-carts', ['post'], ['island', 'edge'], [[0, 0, 'book-trolley'], [1, 0, 'mail-sacks'], [2, 0, 'book-trolley']]),
  prefab('franking-island', ['post'], ['focal'], [...row('mail-sacks', 4), [0, 1, 'book-trolley'], [1, 1, 'office-desk'], [2, 1, 'office-desk'], [3, 1, 'book-trolley']], { symmetric: true }),
  prefab('parcel-stack', ['post'], ['island', 'edge'], [[0, 0, 'crate-stack'], [1, 0, 'mail-sacks'], [2, 0, 'packing-crate']]),
  prefab('pigeonholes', ['post'], ['wall', 'bay'], [[0, 0, 'sorting-case'], [1, 0, 'sorting-case'], [2, 0, 'mail-sacks']]),
  prefab('post-corner', ['post'], ['corner'], [[0, 0, 'mail-sacks']]),
];
