import { SKILL_IDS } from '@containment/shared';
import { gridFit } from '../fitLayout.ts';
import type { FitSpace } from '../sidePanel.ts';

export type SkillTileMode = 'full' | 'short' | 'tiny';

export interface SkillLayout {
  readonly columns: number;
  readonly rows: number;
  readonly mode: SkillTileMode;
}

export const SKILL_GAP = 4;
export const SKILL_MAX_ROW = 64;

const MODES: readonly { readonly mode: SkillTileMode; readonly width: number; readonly height: number }[] = [
  { mode: 'full', width: 66, height: 64 },
  { mode: 'short', width: 66, height: 47 },
  { mode: 'tiny', width: 54, height: 30 },
];

const COLUMN_CHOICES = [3, 5, 4, 2] as const;

export function skillLayout(space: FitSpace): SkillLayout {
  const fits = COLUMN_CHOICES.map((columns) => gridFit(space, SKILL_IDS.length, columns, SKILL_GAP, Infinity));
  for (const { mode, width, height } of MODES) {
    const fit = fits.find((candidate) => candidate.cellWidth >= width && Math.min(SKILL_MAX_ROW, candidate.cellHeight) >= height);
    if (fit) return { columns: fit.columns, rows: fit.rows, mode };
  }
  const tiny = MODES[MODES.length - 1];
  const score = (fit: (typeof fits)[number]) => Math.min(fit.cellWidth / (tiny?.width ?? 1), fit.cellHeight / (tiny?.height ?? 1));
  const best = fits.reduce((winner, fit) => (score(fit) > score(winner) ? fit : winner));
  return { columns: best.columns, rows: best.rows, mode: 'tiny' };
}
