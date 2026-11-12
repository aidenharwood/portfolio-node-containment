import type { FitSpace } from './sidePanel.ts';

export interface GridFit {
  readonly columns: number;
  readonly rows: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
}

export function gridFit(space: FitSpace, count: number, columns: number, gap: number, maxCell: number): GridFit {
  const rows = Math.ceil(count / columns);
  return {
    columns,
    rows,
    cellWidth: Math.min(maxCell, (space.width - (columns - 1) * gap) / columns),
    cellHeight: Math.min(maxCell, (space.height - (rows - 1) * gap) / rows),
  };
}

export function applyGrid(element: HTMLElement, fit: GridFit): void {
  element.style.setProperty('--cols', String(fit.columns));
  element.style.setProperty('--rows', String(fit.rows));
}
