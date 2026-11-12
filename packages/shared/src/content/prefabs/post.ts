import { prefab, type Prefab } from './types.ts';

export const POST_PREFABS: readonly Prefab[] = [
  prefab('mail-carts', ['post'], ['island', 'edge'], [[0, 0, 'book-trolley'], [1, 0, 'mail-sacks'], [2, 0, 'book-trolley']]),
  prefab('post-corner', ['post'], ['corner'], [[0, 0, 'mail-sacks']]),
];
