import type { TilePoint } from '../../packages/shared/src/world/geometry.ts';
import type { LandSquare } from '../../packages/shared/src/world/landPlan.ts';
import { megastructurePieces } from '../../packages/shared/src/world/megastructure.ts';
import { registerFurnishingKit } from '../../packages/shared/src/content/furnishingKit.ts';
import { MEGASTRUCTURE_KIT, SPAN_MEGASTRUCTURES } from '../../packages/shared/src/content/span/megastructures.ts';
import { SQUARE } from './atlas.ts';

registerFurnishingKit(MEGASTRUCTURE_KIT);

export const MEGASTRUCTURE_CLEARANCE = 2;

export interface MegastructureGround {
  readonly footings: ReadonlySet<string>;
  readonly overhead: ReadonlySet<string>;
}

const keyOf = (point: TilePoint): string => point.x + ',' + point.y;

let squares = new Map<string, Pick<LandSquare, 'column' | 'row'>>();

export function knowSquares(entries: Iterable<readonly [string, Pick<LandSquare, 'column' | 'row'>]>): void {
  squares = new Map(entries);
}

export function megastructureGround(square: Pick<LandSquare, 'column' | 'row'>): MegastructureGround {
  const footings = new Set<string>();
  const overhead = new Set<string>();
  const local = (tile: TilePoint): TilePoint => ({ x: tile.x - square.column * SQUARE, y: tile.y - square.row * SQUARE });
  for (const placement of SPAN_MEGASTRUCTURES) {
    const anchor = squares.get(placement.at.districtId);
    if (!anchor) throw new Error('Megastructure ' + placement.id + ' names district ' + placement.at.districtId + ', which no square holds.');
    if (placement.at.room !== 'ground') throw new Error('Megastructure ' + placement.id + ' must be anchored to the ground room of a land square.');
    const origin = { x: anchor.column * SQUARE + placement.at.dx, y: anchor.row * SQUARE + placement.at.dy };
    for (const piece of megastructurePieces(placement.prefab, placement.facing ?? 'south', origin)) {
      for (const tile of piece.tiles) {
        if (!piece.blocks) {
          overhead.add(keyOf(local(tile)));
          continue;
        }
        for (let dy = -MEGASTRUCTURE_CLEARANCE; dy <= MEGASTRUCTURE_CLEARANCE; dy++) {
          for (let dx = -MEGASTRUCTURE_CLEARANCE; dx <= MEGASTRUCTURE_CLEARANCE; dx++) footings.add(keyOf(local({ x: tile.x + dx, y: tile.y + dy })));
        }
      }
    }
  }
  return { footings, overhead };
}

export function megastructureTiles(squareOf: (districtId: string) => Pick<LandSquare, 'column' | 'row'> | undefined): TilePoint[][] {
  return SPAN_MEGASTRUCTURES.map((placement) => {
    const square = squareOf(placement.at.districtId);
    if (!square) throw new Error('Megastructure ' + placement.id + ' names district ' + placement.at.districtId + ', which no square holds.');
    const origin = { x: square.column * SQUARE + placement.at.dx, y: square.row * SQUARE + placement.at.dy };
    return megastructurePieces(placement.prefab, placement.facing ?? 'south', origin).flatMap((piece) => piece.tiles);
  });
}

export const reservedBy = (ground: MegastructureGround, x: number, y: number): boolean => ground.footings.has(x + ',' + y) || ground.overhead.has(x + ',' + y);
