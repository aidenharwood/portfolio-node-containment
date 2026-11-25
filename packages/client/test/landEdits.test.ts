import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LandPlan } from '@containment/shared';
import { FIXTURE_LAND } from '@containment/shared/fixtures';
import { addStep, insertVertex, moveStep, moveStepBy, moveVertex, removeStep, removeVertex, replaceStep, resizeStep, type LandEditResult } from '../src/editor/landEdits.ts';

const freeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    for (const inner of Object.values(value)) freeze(inner);
    Object.freeze(value);
  }
  return value;
};

const PLAN: LandPlan = freeze(structuredClone(FIXTURE_LAND.plan));
const COPY = structuredClone(PLAN);

const planOf = (result: LandEditResult): LandPlan => {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.plan;
};
const refused = (result: LandEditResult, pattern: RegExp): void => {
  assert.equal(result.ok, false);
  assert.match(result.ok ? '' : result.error, pattern);
};

test('addStep puts a step at the end or where it is asked', () => {
  const step = { kind: 'fill', shape: { kind: 'rect', rect: { x: 100, y: 4, width: 4, height: 4 } }, tile: 'rock' } as const;
  assert.deepEqual(planOf(addStep(PLAN, step)).steps.at(-1), step);
  assert.deepEqual(planOf(addStep(PLAN, step, 1)).steps[1], step);
  refused(addStep(PLAN, step, 99), /99/);
  refused(addStep(PLAN, { kind: 'gate', id: 'fx-wall-gate', rect: { x: 60, y: 4, width: 1, height: 1 }, tile: 'door' }), /named twice/);
  refused(addStep(PLAN, { kind: 'ramp', rect: { x: 100, y: 4, width: 2, height: 2 }, side: 'north', from: 0, to: 5 }), /steps\[7\]/);
});

test('replaceStep swaps a step and refuses an even line width', () => {
  const plan = planOf(replaceStep(PLAN, 2, { kind: 'rise', shape: { kind: 'round', rect: { x: 24, y: 10, width: 16, height: 12 } }, height: 2 }));
  assert.deepEqual(plan.steps[2], { kind: 'rise', shape: { kind: 'round', rect: { x: 24, y: 10, width: 16, height: 12 } }, height: 2 });
  refused(replaceStep(PLAN, 3, { kind: 'line', points: [{ x: 48, y: 1 }, { x: 48, y: 30 }], width: 2, tile: 'brick' }), /odd/);
  refused(replaceStep(PLAN, 9, PLAN.steps[0] as never), /no step 9/);
});

test('removeStep and moveStep keep the other steps in order', () => {
  assert.deepEqual(planOf(removeStep(PLAN, 2)).steps, PLAN.steps.filter((_, index) => index !== 2));
  const moved = planOf(moveStep(PLAN, 5, 6)).steps;
  assert.deepEqual([moved[5], moved[6]], [PLAN.steps[6], PLAN.steps[5]]);
  refused(removeStep(PLAN, -1), /no step/);
  refused(moveStep(PLAN, 0, 7), /no step 7/);
});

test('vertex edits reshape a polygon and a line', () => {
  const polygon = (plan: LandPlan) => {
    const step = plan.steps[1];
    assert.ok(step?.kind === 'fill' && step.shape.kind === 'polygon');
    return step.shape.points;
  };
  assert.deepEqual(polygon(planOf(moveVertex(PLAN, 1, 0, { x: 3, y: 4 })))[0], { x: 3, y: 4 });
  assert.deepEqual(polygon(planOf(insertVertex(PLAN, 1, 0, { x: 20, y: 1 }))).slice(0, 3), [{ x: 2, y: 3 }, { x: 20, y: 1 }, { x: 40, y: 2 }]);
  assert.equal(polygon(planOf(removeVertex(PLAN, 1, 1))).length, 5);
  const line = planOf(insertVertex(PLAN, 3, 0, { x: 50, y: 15 })).steps[3];
  assert.ok(line?.kind === 'line');
  assert.deepEqual(line.points, [{ x: 48, y: 13 }, { x: 50, y: 15 }, { x: 48, y: 18 }]);
  refused(removeVertex(PLAN, 3, 0), /at least 2/);
  refused(moveVertex(PLAN, 0, 0, { x: 1, y: 1 }), /no points/);
  refused(moveVertex(PLAN, 1, 9, { x: 1, y: 1 }), /no point 9/);
});

test('a polygon cannot drop below three points', () => {
  const triangle = planOf(replaceStep(PLAN, 1, { kind: 'fill', shape: { kind: 'polygon', points: [{ x: 2, y: 3 }, { x: 40, y: 2 }, { x: 20, y: 28 }] }, tile: 'grass' }));
  refused(removeVertex(triangle, 1, 0), /at least 3/);
});

test('moveStepBy shifts shapes, lines, ramps and gates', () => {
  const by = { x: 1, y: 2 };
  const plan = planOf(moveStepBy(planOf(moveStepBy(planOf(moveStepBy(PLAN, 2, by)), 3, by)), 4, by));
  assert.deepEqual(plan.steps[2], { kind: 'rise', shape: { kind: 'round', rect: { x: 25, y: 12, width: 16, height: 12 } }, height: 1 });
  assert.deepEqual(plan.steps[3], { kind: 'line', points: [{ x: 49, y: 15 }, { x: 49, y: 20 }], width: 1, tile: 'brick' });
  assert.deepEqual(plan.steps[4], { kind: 'gate', id: 'fx-wall-gate', rect: { x: 49, y: 17, width: 1, height: 2 }, tile: 'door' });
  const polygon = planOf(moveStepBy(PLAN, 1, by)).steps[1];
  assert.ok(polygon?.kind === 'fill' && polygon.shape.kind === 'polygon');
  assert.deepEqual(polygon.shape.points[0], { x: 3, y: 5 });
  refused(moveStepBy(PLAN, 4, { x: 200, y: 0 }), /outside/);
});

test('resizeStep resizes rectangles and refuses polygons, lines and steep ramps', () => {
  const rect = { x: 20, y: 8, width: 10, height: 10 };
  assert.deepEqual(planOf(resizeStep(PLAN, 2, rect)).steps[2], { kind: 'rise', shape: { kind: 'round', rect }, height: 1 });
  assert.deepEqual(planOf(resizeStep(PLAN, 4, { x: 48, y: 14, width: 1, height: 3 })).steps[4], { kind: 'gate', id: 'fx-wall-gate', rect: { x: 48, y: 14, width: 1, height: 3 }, tile: 'door' });
  refused(resizeStep(PLAN, 1, rect), /no rectangle/);
  refused(resizeStep(PLAN, 3, rect), /no rectangle/);
  const ramp = planOf(addStep(PLAN, { kind: 'ramp', rect: { x: 100, y: 4, width: 2, height: 8 }, side: 'north', from: 0, to: 3 }));
  refused(resizeStep(ramp, 7, { x: 100, y: 4, width: 2, height: 2 }), /steps\[7\]/);
});

test('no edit changes the plan it was given', () => {
  assert.deepEqual(PLAN, COPY);
});
