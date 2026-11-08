import type { AssemblyId, InstanceId, WorldObjectId } from '../ids.ts';
import type { ObjectPlacement } from './district.ts';
import type { Facing, TilePoint } from './geometry.ts';

export type QuarterTurns = 0 | 1 | 2 | 3;

export interface AssemblyPiece {
  readonly objectId: WorldObjectId;
  readonly turns?: QuarterTurns;
}

export interface AssemblyDefinition {
  readonly id: AssemblyId;
  readonly name: string;
  readonly pieces: Readonly<Record<string, AssemblyPiece>>;
  readonly layout: readonly string[];
  readonly stretchRow?: number;
}

export interface AssemblyPlacement {
  readonly instanceId: InstanceId;
  readonly assemblyId: AssemblyId;
  readonly position: TilePoint;
  readonly facing?: Facing;
  readonly span?: number;
}

export const EMPTY_ASSEMBLY_CELL = ' ';

const FACINGS_BY_TURNS: readonly Facing[] = ['south', 'east', 'north', 'west'];

export const turnsOf = (facing: Facing): QuarterTurns => FACINGS_BY_TURNS.indexOf(facing) as QuarterTurns;

export const turnFacing = (facing: Facing, turns: QuarterTurns): Facing => FACINGS_BY_TURNS[(turnsOf(facing) + turns) % 4] as Facing;

export function rotateOffset(offset: TilePoint, facing: Facing): TilePoint {
  switch (facing) {
    case 'south':
      return { x: offset.x, y: offset.y };
    case 'east':
      return { x: offset.y, y: -offset.x };
    case 'north':
      return { x: -offset.x, y: -offset.y };
    case 'west':
      return { x: -offset.y, y: offset.x };
  }
}

export function stretchedLayout(definition: AssemblyDefinition, span = 1): readonly string[] {
  const row = definition.stretchRow;
  if (row === undefined) return definition.layout;
  const repeated = definition.layout[row] ?? '';
  return [...definition.layout.slice(0, row), ...Array.from({ length: Math.max(1, span) }, () => repeated), ...definition.layout.slice(row + 1)];
}

export function assemblyFootprint(definition: AssemblyDefinition, facing: Facing = 'south', span = 1): { readonly width: number; readonly height: number } {
  const layout = stretchedLayout(definition, span);
  const width = Math.max(0, ...layout.map((row) => row.length));
  const sideways = facing === 'east' || facing === 'west';
  return sideways ? { width: layout.length, height: width } : { width, height: layout.length };
}

export function expandAssembly(definition: AssemblyDefinition, placement: AssemblyPlacement): ObjectPlacement[] {
  const facing = placement.facing ?? 'south';
  const cells = stretchedLayout(definition, placement.span).flatMap((row, y) =>
    [...row].flatMap((symbol, x) => {
      const piece = definition.pieces[symbol];
      return symbol === EMPTY_ASSEMBLY_CELL || !piece ? [] : [{ local: { x, y }, piece, rotated: rotateOffset({ x, y }, facing) }];
    }),
  );
  const minX = Math.min(...cells.map((cell) => cell.rotated.x));
  const minY = Math.min(...cells.map((cell) => cell.rotated.y));
  return cells.map(({ local, piece, rotated }) => ({
    instanceId: `${placement.instanceId}/${local.x},${local.y}`,
    objectId: piece.objectId,
    position: { x: placement.position.x + rotated.x - minX, y: placement.position.y + rotated.y - minY },
    facing: turnFacing(facing, piece.turns ?? 0),
  }));
}

export function findAssemblyDefinitionIssues(definition: AssemblyDefinition, hasObject: (objectId: WorldObjectId) => boolean): string[] {
  const issues: string[] = [];
  const report = (problem: string) => issues.push(`assembly ${definition.id}: ${problem}`);
  const width = definition.layout[0]?.length ?? 0;
  if (width === 0) report('has an empty layout');
  definition.layout.forEach((row, y) => {
    if (row.length !== width) report(`row ${y} has width ${row.length}, expected ${width}`);
    for (const [x, symbol] of [...row].entries()) {
      if (symbol !== EMPTY_ASSEMBLY_CELL && !definition.pieces[symbol]) report(`unknown piece "${symbol}" at ${x},${y}`);
    }
  });
  for (const [symbol, piece] of Object.entries(definition.pieces)) {
    if (symbol.length !== 1 || symbol === EMPTY_ASSEMBLY_CELL) report(`piece key "${symbol}" must be one non-space character`);
    if (!hasObject(piece.objectId)) report(`piece "${symbol}" uses unknown object "${piece.objectId}"`);
  }
  if (definition.stretchRow !== undefined && (definition.stretchRow < 0 || definition.stretchRow >= definition.layout.length)) {
    report(`stretch row ${definition.stretchRow} is outside the layout`);
  }
  return issues;
}
