import {
  CARDINAL_OFFSETS,
  DIAGONAL_OFFSETS,
  isCardinallyAdjacent,
  samePoint,
  tileKey,
  type TilePoint,
} from './geometry.ts';
import { MinHeap } from './minHeap.ts';

export interface WalkabilityGrid {
  isWalkable(point: TilePoint): boolean;
}

export interface PathRequest {
  readonly from: TilePoint;
  readonly to: TilePoint;
  readonly arriveAdjacent?: boolean;
  readonly maxSearchNodes?: number;
}

interface SearchNode {
  readonly point: TilePoint;
  readonly costSoFar: number;
  readonly estimatedTotal: number;
}

const STRAIGHT_STEP_COST = 10;
const DIAGONAL_STEP_COST = 14;
const DEFAULT_MAX_SEARCH_NODES = 6000;

export function findPath(grid: WalkabilityGrid, request: PathRequest): TilePoint[] | null {
  const { from, to } = request;
  const isGoal = request.arriveAdjacent
    ? (point: TilePoint) => isCardinallyAdjacent(point, to)
    : (point: TilePoint) => samePoint(point, to);
  const estimate = request.arriveAdjacent
    ? (point: TilePoint) => Math.max(0, octileDistance(point, to) - STRAIGHT_STEP_COST)
    : (point: TilePoint) => octileDistance(point, to);

  if (isGoal(from)) return [];
  if (!request.arriveAdjacent && !grid.isWalkable(to)) return null;

  const open = new MinHeap<SearchNode>((a, b) => a.estimatedTotal - b.estimatedTotal);
  const bestCost = new Map<string, number>([[tileKey(from), 0]]);
  const cameFrom = new Map<string, TilePoint>();
  const maxSearchNodes = request.maxSearchNodes ?? DEFAULT_MAX_SEARCH_NODES;
  let expandedNodes = 0;

  open.push({ point: from, costSoFar: 0, estimatedTotal: estimate(from) });

  while (open.size > 0 && expandedNodes < maxSearchNodes) {
    const current = open.pop() as SearchNode;
    if (current.costSoFar > (bestCost.get(tileKey(current.point)) ?? Infinity)) continue;
    if (isGoal(current.point)) return reconstructPath(cameFrom, current.point);
    expandedNodes++;

    for (const step of walkableSteps(grid, current.point)) {
      const costSoFar = current.costSoFar + step.cost;
      const key = tileKey(step.point);
      if (costSoFar >= (bestCost.get(key) ?? Infinity)) continue;
      bestCost.set(key, costSoFar);
      cameFrom.set(key, current.point);
      open.push({ point: step.point, costSoFar, estimatedTotal: costSoFar + estimate(step.point) });
    }
  }

  return null;
}

function* walkableSteps(grid: WalkabilityGrid, origin: TilePoint): Generator<{ point: TilePoint; cost: number }> {
  for (const offset of CARDINAL_OFFSETS) {
    const point = { x: origin.x + offset.x, y: origin.y + offset.y };
    if (grid.isWalkable(point)) yield { point, cost: STRAIGHT_STEP_COST };
  }
  for (const offset of DIAGONAL_OFFSETS) {
    const point = { x: origin.x + offset.x, y: origin.y + offset.y };
    const cutsCorner =
      !grid.isWalkable({ x: origin.x + offset.x, y: origin.y }) ||
      !grid.isWalkable({ x: origin.x, y: origin.y + offset.y });
    if (!cutsCorner && grid.isWalkable(point)) yield { point, cost: DIAGONAL_STEP_COST };
  }
}

function octileDistance(a: TilePoint, b: TilePoint): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return STRAIGHT_STEP_COST * Math.max(dx, dy) + (DIAGONAL_STEP_COST - STRAIGHT_STEP_COST) * Math.min(dx, dy);
}

function reconstructPath(cameFrom: ReadonlyMap<string, TilePoint>, goal: TilePoint): TilePoint[] {
  const path: TilePoint[] = [goal];
  let cursor = cameFrom.get(tileKey(goal));
  while (cursor && cameFrom.has(tileKey(cursor))) {
    path.push(cursor);
    cursor = cameFrom.get(tileKey(cursor));
  }
  return path.reverse();
}
