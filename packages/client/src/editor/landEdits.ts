import { drawLand, parseLandPlan, type LandPlan, type LandShape, type LandStep, type TilePoint, type TileRect } from '@containment/shared';

export type LandEditResult = { readonly ok: true; readonly plan: LandPlan } | { readonly ok: false; readonly error: string };

const MIN_POINTS = { polygon: 3, line: 2 } as const;

const refuse = (error: string): LandEditResult => ({ ok: false, error });

function checked(plan: LandPlan): LandEditResult {
  try {
    const parsed = parseLandPlan(plan);
    drawLand(parsed);
    return { ok: true, plan: parsed };
  } catch (error) {
    return refuse((error as Error).message);
  }
}

const hasStep = (plan: LandPlan, index: number): boolean => Number.isInteger(index) && index >= 0 && index < plan.steps.length;
const noStep = (index: number): LandEditResult => refuse('There is no step ' + index + '.');

function withStep(plan: LandPlan, index: number, change: (step: LandStep) => LandStep | string): LandEditResult {
  const step = plan.steps[index];
  if (!step || !hasStep(plan, index)) return noStep(index);
  const next = change(step);
  if (typeof next === 'string') return refuse(next);
  return checked({ ...plan, steps: plan.steps.map((each, at) => (at === index ? next : each)) });
}

const pointsOf = (step: LandStep): { readonly kind: 'polygon' | 'line'; readonly points: readonly TilePoint[] } | null => {
  if (step.kind === 'line') return { kind: 'line', points: step.points };
  if ((step.kind === 'fill' || step.kind === 'rise' || step.kind === 'ward' || step.kind === 'relief' || step.kind === 'soften') && step.shape.kind === 'polygon') return { kind: 'polygon', points: step.shape.points };
  return null;
};

const withPoints = (step: LandStep, points: readonly TilePoint[]): LandStep => {
  if (step.kind === 'line') return { ...step, points };
  if (step.kind === 'fill' || step.kind === 'rise' || step.kind === 'ward' || step.kind === 'relief' || step.kind === 'soften') return { ...step, shape: { kind: 'polygon', points } };
  return step;
};

function reshapePoints(plan: LandPlan, index: number, change: (points: readonly TilePoint[], kind: 'polygon' | 'line') => readonly TilePoint[] | string): LandEditResult {
  return withStep(plan, index, (step) => {
    const found = pointsOf(step);
    if (!found) return 'Step ' + index + ' has no points to edit.';
    const points = change(found.points, found.kind);
    return typeof points === 'string' ? points : withPoints(step, points);
  });
}

const shift = (point: TilePoint, by: TilePoint): TilePoint => ({ x: point.x + by.x, y: point.y + by.y });
const shiftRect = (rect: TileRect, by: TilePoint): TileRect => ({ ...rect, x: rect.x + by.x, y: rect.y + by.y });
const shiftShape = (shape: LandShape, by: TilePoint): LandShape => (shape.kind === 'polygon' ? { kind: 'polygon', points: shape.points.map((point) => shift(point, by)) } : { kind: shape.kind, rect: shiftRect(shape.rect, by) });

export function addStep(plan: LandPlan, step: LandStep, at: number = plan.steps.length): LandEditResult {
  if (!Number.isInteger(at) || at < 0 || at > plan.steps.length) return refuse('A step cannot go at ' + at + '.');
  return checked({ ...plan, steps: [...plan.steps.slice(0, at), step, ...plan.steps.slice(at)] });
}

export function replaceStep(plan: LandPlan, index: number, step: LandStep): LandEditResult {
  return withStep(plan, index, () => step);
}

export function removeStep(plan: LandPlan, index: number): LandEditResult {
  if (!hasStep(plan, index)) return noStep(index);
  return checked({ ...plan, steps: plan.steps.filter((_, at) => at !== index) });
}

export function moveStep(plan: LandPlan, from: number, to: number): LandEditResult {
  if (!hasStep(plan, from)) return noStep(from);
  if (!hasStep(plan, to)) return noStep(to);
  const steps = plan.steps.filter((_, at) => at !== from);
  steps.splice(to, 0, plan.steps[from] as LandStep);
  return checked({ ...plan, steps });
}

export function moveVertex(plan: LandPlan, index: number, vertex: number, to: TilePoint): LandEditResult {
  return reshapePoints(plan, index, (points) => (vertex >= 0 && vertex < points.length ? points.map((point, at) => (at === vertex ? to : point)) : 'There is no point ' + vertex + '.'));
}

export function insertVertex(plan: LandPlan, index: number, after: number, point: TilePoint): LandEditResult {
  return reshapePoints(plan, index, (points) => (after >= 0 && after < points.length ? [...points.slice(0, after + 1), point, ...points.slice(after + 1)] : 'There is no point ' + after + '.'));
}

export function removeVertex(plan: LandPlan, index: number, vertex: number): LandEditResult {
  return reshapePoints(plan, index, (points, kind) => {
    if (vertex < 0 || vertex >= points.length) return 'There is no point ' + vertex + '.';
    if (points.length <= MIN_POINTS[kind]) return kind === 'polygon' ? 'A polygon needs at least 3 points.' : 'A line needs at least 2 points.';
    return points.filter((_, at) => at !== vertex);
  });
}

export function moveStepBy(plan: LandPlan, index: number, by: TilePoint): LandEditResult {
  return withStep(plan, index, (step) => {
    if (step.kind === 'line') return { ...step, points: step.points.map((point) => shift(point, by)) };
    if (step.kind === 'ramp' || step.kind === 'gate') return { ...step, rect: shiftRect(step.rect, by) };
    return { ...step, shape: shiftShape(step.shape, by) };
  });
}

export function resizeStep(plan: LandPlan, index: number, rect: TileRect): LandEditResult {
  return withStep(plan, index, (step) => {
    if (step.kind === 'ramp' || step.kind === 'gate') return { ...step, rect };
    if (step.kind !== 'line' && step.shape.kind !== 'polygon') return { ...step, shape: { kind: step.shape.kind, rect } };
    return 'Step ' + index + ' has no rectangle to resize.';
  });
}
