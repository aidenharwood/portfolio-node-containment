import {
  CARDINAL_OFFSETS,
  DIAGONAL_OFFSETS,
  isCardinallyAdjacent,
  samePoint,
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
  readonly isGoal?: (point: TilePoint) => boolean;
  readonly goalSlack?: number;
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
const DIAGONAL_STEPS = DIAGONAL_OFFSETS.map((offset) => ({
  offset,
  horizontal: CARDINAL_OFFSETS.findIndex((cardinal) => cardinal.x === offset.x && cardinal.y === 0),
  vertical: CARDINAL_OFFSETS.findIndex((cardinal) => cardinal.x === 0 && cardinal.y === offset.y),
}));

export function findPath(grid: WalkabilityGrid, request: PathRequest): TilePoint[] | null {
  const { from, to } = request;
  const isGoal =
    request.isGoal ??
    (request.arriveAdjacent ? (point: TilePoint) => isCardinallyAdjacent(point, to) : (point: TilePoint) => samePoint(point, to));
  const slack = request.goalSlack ?? (request.arriveAdjacent || request.isGoal ? STRAIGHT_STEP_COST : 0);
  const estimate = (point: TilePoint) => Math.max(0, octileDistance(point, to) - slack);

  if (isGoal(from)) return [];
  if (!request.arriveAdjacent && !request.isGoal && !grid.isWalkable(to)) return null;

  const open = new MinHeap<SearchNode>((a, b) => a.estimatedTotal - b.estimatedTotal || b.costSoFar - a.costSoFar);
  const bestCost = new Map<number, number>([[packKey(from.x, from.y), 0]]);
  const cameFrom = new Map<number, TilePoint>();
  const maxSearchNodes = request.maxSearchNodes ?? DEFAULT_MAX_SEARCH_NODES;
  let expandedNodes = 0;

  open.push({ point: from, costSoFar: 0, estimatedTotal: estimate(from) });

  const relax = (current: SearchNode, x: number, y: number, cost: number) => {
    const costSoFar = current.costSoFar + cost;
    const key = packKey(x, y);
    if (costSoFar >= (bestCost.get(key) ?? Infinity)) return;
    bestCost.set(key, costSoFar);
    cameFrom.set(key, current.point);
    const point = { x, y };
    open.push({ point, costSoFar, estimatedTotal: costSoFar + estimate(point) });
  };

  while (open.size > 0 && expandedNodes < maxSearchNodes) {
    const current = open.pop() as SearchNode;
    const { x, y } = current.point;
    if (current.costSoFar > (bestCost.get(packKey(x, y)) ?? Infinity)) continue;
    if (isGoal(current.point)) return reconstructPath(cameFrom, current.point);
    expandedNodes++;

    const open4: boolean[] = [];
    for (const offset of CARDINAL_OFFSETS) {
      const nx = x + offset.x;
      const ny = y + offset.y;
      const walkable = grid.isWalkable({ x: nx, y: ny });
      open4.push(walkable);
      if (walkable) relax(current, nx, ny, STRAIGHT_STEP_COST);
    }
    for (const { offset, horizontal, vertical } of DIAGONAL_STEPS) {
      if (!open4[horizontal] || !open4[vertical]) continue;
      const nx = x + offset.x;
      const ny = y + offset.y;
      if (grid.isWalkable({ x: nx, y: ny })) relax(current, nx, ny, DIAGONAL_STEP_COST);
    }
  }

  return null;
}

const KEY_OFFSET = 1 << 20;

const packKey = (x: number, y: number): number => (x + KEY_OFFSET) * (KEY_OFFSET * 2) + (y + KEY_OFFSET);

export const WALK_SNAP_RADIUS = 6;

export function walkableTilesNear(grid: WalkabilityGrid, target: TilePoint, from: TilePoint, maxRadius = WALK_SNAP_RADIUS): TilePoint[] {
  if (grid.isWalkable(target)) return [target];
  const candidates: { point: TilePoint; distance: number; detour: number }[] = [];
  for (let dy = -maxRadius; dy <= maxRadius; dy++) {
    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || distance > maxRadius) continue;
      const point = { x: target.x + dx, y: target.y + dy };
      if (grid.isWalkable(point)) candidates.push({ point, distance, detour: Math.hypot(point.x - from.x, point.y - from.y) });
    }
  }
  return candidates
    .sort((a, b) => a.distance - b.distance || a.detour - b.detour)
    .map((candidate) => candidate.point);
}

function octileDistance(a: TilePoint, b: TilePoint): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return STRAIGHT_STEP_COST * Math.max(dx, dy) + (DIAGONAL_STEP_COST - STRAIGHT_STEP_COST) * Math.min(dx, dy);
}

function reconstructPath(cameFrom: ReadonlyMap<number, TilePoint>, goal: TilePoint): TilePoint[] {
  const path: TilePoint[] = [goal];
  let cursor = cameFrom.get(packKey(goal.x, goal.y));
  while (cursor && cameFrom.has(packKey(cursor.x, cursor.y))) {
    path.push(cursor);
    cursor = cameFrom.get(packKey(cursor.x, cursor.y));
  }
  return path.reverse();
}
