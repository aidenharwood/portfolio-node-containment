import type { TilePoint } from './geometry.ts';
import { TILE_KINDS } from './tiles.ts';
import type { TileLayout } from './district.ts';

export function hasLineOfSight(layout: TileLayout, from: TilePoint, to: TilePoint): boolean {
  let x = from.x;
  let y = from.y;
  const stepX = Math.sign(to.x - x);
  const stepY = Math.sign(to.y - y);
  const deltaX = Math.abs(to.x - x);
  const deltaY = -Math.abs(to.y - y);
  let error = deltaX + deltaY;

  while (x !== to.x || y !== to.y) {
    const doubled = 2 * error;
    if (doubled >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubled <= deltaX) {
      error += deltaX;
      y += stepY;
    }
    if ((x !== to.x || y !== to.y) && TILE_KINDS[layout.tileAt({ x, y })].structure === 'wall') return false;
  }
  return true;
}
