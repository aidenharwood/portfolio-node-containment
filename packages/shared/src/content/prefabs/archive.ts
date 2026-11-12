import { prefab, row, type Prefab } from './types.ts';

export const ARCHIVE_PREFABS: readonly Prefab[] = [
  prefab('ledger-trolleys', ['archive', 'post'], ['island', 'edge'], [[0, 0, 'book-trolley'], [1, 0, 'book-trolley']]),
  prefab('sorting-cases', ['archive', 'post'], ['wall', 'bay'], [...row('sorting-case', 4), [0, 1, 'mail-sacks'], [2, 1, 'mail-sacks']]),
  prefab('archive-corner', ['archive'], ['corner'], [[0, 0, 'potted-fern']]),
];
