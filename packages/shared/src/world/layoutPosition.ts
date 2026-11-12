import type { Blueprint } from './blueprint.ts';
import { rectContains, type TilePoint } from './geometry.ts';
import type { LayoutPosition } from './layoutSchema.ts';

export function positionAt(plan: Blueprint, point: TilePoint): LayoutPosition {
  for (const step of plan.steps) {
    if (step.kind !== 'room') continue;
    const rect = plan.rooms[step.id];
    if (rect && rectContains(rect, point)) return { room: step.id, dx: point.x - rect.x, dy: point.y - rect.y };
  }
  for (const [exit, value] of Object.entries(plan.exits)) {
    const index = value.tiles.findIndex((tile) => tile.x === point.x && tile.y === point.y);
    if (index >= 0) return { exit, index };
  }
  for (const [key, tiles] of Object.entries(plan.links)) {
    const index = tiles.findIndex((tile) => tile.x === point.x && tile.y === point.y);
    const [from, to] = key.split('>') as [string, string];
    if (index >= 0) return { link: [from, to], index };
  }
  return { x: point.x, y: point.y };
}

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
