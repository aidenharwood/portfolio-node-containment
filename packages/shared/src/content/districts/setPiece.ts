import type { Blueprint } from '../../world/blueprint.ts';
import type { Facing, TilePoint } from '../../world/geometry.ts';
import { pieceTiles } from './prefabTurns.ts';
import { setPieceTurn } from './furnish.ts';

export interface SetPiece {
  readonly room: string;
  readonly prefab: string;
  readonly origin: TilePoint;
  readonly facing: Facing;
  readonly instanceId?: string;
}

export function setPiece(plan: Blueprint, room: string, prefab: string, dx: number, dy: number, facing: Facing = 'south', instanceId?: string): SetPiece {
  const fail = (reason: string): never => {
    throw new Error(`Set-piece "${prefab}" in room "${room}": ${reason}`);
  };
  const rect = plan.rooms[room] ?? fail('no such room.');
  const origin = (() => {
    try {
      return plan.at(room, dx, dy);
    } catch (error) {
      return fail((error as Error).message);
    }
  })();
  const piece: SetPiece = instanceId === undefined ? { room, prefab, origin, facing } : { room, prefab, origin, facing, instanceId };
  const turn = setPieceTurn(piece) ?? fail('no such prefab.');
  for (const tile of pieceTiles(origin, turn)) {
    try {
      plan.at(room, tile.x - rect.x, tile.y - rect.y);
    } catch (error) {
      fail(`a piece lands on ${tile.x},${tile.y}. ${(error as Error).message}`);
    }
  }
  return piece;
}
