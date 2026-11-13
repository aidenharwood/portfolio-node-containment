import { prefab, row, type Prefab } from './types.ts';

export const ARCHIVE_PREFABS: readonly Prefab[] = [
  prefab('ledger-trolleys', ['island', 'edge'], [[0, 0, 'book-trolley'], [1, 0, 'book-trolley']]),
  prefab('sorting-cases', ['wall', 'bay'], [...row('sorting-case', 4), [0, 1, 'mail-sacks'], [2, 1, 'mail-sacks']], { rows: true }),
  prefab('reading-table', ['island'], [[0, 0, 'office-chair'], [1, 0, 'office-chair'], [0, 1, 'office-desk'], [1, 1, 'office-desk'], [0, 2, 'office-chair', 'north'], [1, 2, 'office-chair', 'north']], { rows: true }),
];
