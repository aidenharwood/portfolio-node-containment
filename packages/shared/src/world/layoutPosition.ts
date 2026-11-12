import type { Blueprint } from './blueprint.ts';
import { rectContains, type TilePoint } from './geometry.ts';
import type { LayoutPosition } from './layoutSchema.ts';

export function resolvePosition(plan: Blueprint, at: LayoutPosition, path: string): TilePoint {
  const fail = (reason: string): never => {
    throw new Error(`${path}: ${reason}`);
  };
  if ('room' in at) {
    const rect = plan.rooms[at.room] ?? fail(`room "${at.room}" is not in this district`);
    const point = { x: rect.x + at.dx, y: rect.y + at.dy };
    if (!rectContains(rect, point)) fail(`${at.dx},${at.dy} is outside room "${at.room}" (${rect.width}x${rect.height})`);
    return point;
  }
  if ('exit' in at) {
    const exit = plan.exits[at.exit] ?? fail(`exit "${at.exit}" is not in this district`);
    return exit.tiles[at.index] ?? fail(`exit "${at.exit}" has no tile ${at.index}`);
  }
  if ('link' in at) {
    const [from, to] = at.link;
    return plan.links[`${from}>${to}`]?.[at.index] ?? fail(`link "${from}" to "${to}" has no tile ${at.index}`);
  }
  return { x: at.x, y: at.y };
}
