import type { WorldObjectId } from '../../ids.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { objectFootprintSize } from '../../world/footprint.ts';
import type { Facing, TilePoint } from '../../world/geometry.ts';
import type { Prefab, PrefabDecal } from '../prefabs/index.ts';

export type ObjectLookup = (id: WorldObjectId) => WorldObjectDefinition | undefined;

export interface TurnPiece {
  readonly dx: number;
  readonly dy: number;
  readonly width: number;
  readonly height: number;
  readonly objectId: WorldObjectId;
  readonly facing: Facing;
}

export interface Turn {
  readonly pieces: readonly TurnPiece[];
  readonly decals: readonly PrefabDecal[];
  readonly width: number;
  readonly height: number;
}

const TURN_CLOCKWISE: Readonly<Record<Facing, Facing>> = { south: 'west', west: 'north', north: 'east', east: 'south' };

const boundedTurn = (pieces: readonly TurnPiece[], decals: readonly PrefabDecal[]): Turn => ({
  pieces,
  decals,
  width: Math.max(...pieces.map((piece) => piece.dx + piece.width)),
  height: Math.max(...pieces.map((piece) => piece.dy + piece.height)),
});

const turnClockwise = (turn: Turn, objectOf: ObjectLookup): Turn =>
  boundedTurn(
    turn.pieces.map((piece) => {
      const facing = TURN_CLOCKWISE[piece.facing];
      const size = objectFootprintSize(objectOf(piece.objectId), facing);
      return { dx: turn.height - piece.dy - piece.height, dy: piece.dx, objectId: piece.objectId, facing, ...size };
    }),
    turn.decals.map((decal) => ({ ...decal, rect: { x: turn.height - decal.rect.y - decal.rect.height, y: decal.rect.x, width: decal.rect.height, height: decal.rect.width } })),
  );

export function turnsOf(prefab: Prefab, objectOf: ObjectLookup): readonly Turn[] {
  const first = boundedTurn(
    prefab.pieces.map((piece) => {
      const facing = piece.facing ?? 'south';
      return { dx: piece.dx, dy: piece.dy, objectId: piece.objectId, facing, ...objectFootprintSize(objectOf(piece.objectId), facing) };
    }),
    prefab.decals ?? [],
  );
  const turns = [first];
  for (let index = 1; index < 4; index++) turns.push(turnClockwise(turns[index - 1] as Turn, objectOf));
  return turns;
}

const ROTATION_OF: Readonly<Record<Facing, number>> = { south: 0, west: 1, north: 2, east: 3 };

export const rotationOf = (facing: Facing): number => ROTATION_OF[facing];

export const pieceTiles = (origin: TilePoint, turn: Turn): TilePoint[] =>
  turn.pieces.flatMap((piece) => {
    const tiles: TilePoint[] = [];
    for (let dy = 0; dy < piece.height; dy++) for (let dx = 0; dx < piece.width; dx++) tiles.push({ x: origin.x + piece.dx + dx, y: origin.y + piece.dy + dy });
    return tiles;
  });
