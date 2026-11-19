import { FIXTURE_CONTENT, FIXTURE_LAND, FIXTURE_LAYOUT_SOURCES, FIXTURE_WILDS_LAYOUTS } from '@containment/shared/fixtures';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resolvePosition, drawBlueprint, type DistrictLayout, type LandStep } from '@containment/shared';
import { EditorDocument } from '../src/editor/document.ts';
import { EditController } from '../src/editor/editController.ts';
import { addStep } from '../src/editor/edits.ts';

const FIXTURE = new URL('../../shared/test/fixtures/sample-layout.json', import.meta.url);
const ID = 'sample-district';

const setup = () => {
  const document = new EditorDocument({ [ID]: JSON.parse(readFileSync(FIXTURE, 'utf8')) }, FIXTURE_CONTENT);
  const controller = new EditController(document, ID);
  return { document, controller };
};

const placeOf = (layout: DistrictLayout, index: number) => {
  const at = layout.objects[index]?.at;
  assert.ok(at);
  return resolvePosition(drawBlueprint(layout.size, layout.steps, layout.tiles), at, 'test');
};

const drag = (controller: EditController, from: { x: number; y: number }, to: { x: number; y: number }) => {
  controller.pointerDown(from, {});
  controller.pointerMove(to);
  controller.pointerUp(to);
};

test('selecting then dragging an object moves it by the drag', () => {
  const { document, controller } = setup();
  drag(controller, { x: 2, y: 2 }, { x: 4, y: 2 });
  assert.deepEqual(placeOf(document.layout(ID), 0), { x: 4, y: 2 });
  assert.deepEqual(controller.selection, { kind: 'entry', ref: { collection: 'objects', index: 0 } });
});

test('R rotates the selection, Delete removes it and Ctrl+Z brings it back', () => {
  const { document, controller } = setup();
  controller.pointerDown({ x: 2, y: 2 }, {});
  controller.pointerUp({ x: 2, y: 2 });
  assert.equal(controller.key('r', {}), true);
  assert.equal(document.layout(ID).objects[0]?.facing, 'west');
  controller.key('Delete', {});
  assert.equal(document.layout(ID).objects.some((object) => object.id === 'hall-planter'), false);
  controller.key('z', { ctrl: true });
  assert.equal(document.layout(ID).objects.some((object) => object.id === 'hall-planter'), true);
});

test('dragging the edge of a selected room resizes it', () => {
  const { document, controller } = setup();
  controller.pointerDown({ x: 22, y: 9 }, {});
  controller.pointerUp({ x: 22, y: 9 });
  controller.select({ kind: 'room', room: 'side' });
  drag(controller, { x: 22, y: 9 }, { x: 21, y: 9 });
  const side = document.layout(ID).steps.find((step) => step.kind === 'room' && step.id === 'side');
  assert.deepEqual(side && 'rect' in side ? side.rect : null, { x: 17, y: 1, width: 5, height: 12 });
});

test('a paint stroke over three floor tiles paints all three in one undo step', () => {
  const { document, controller } = setup();
  controller.tool = 'paint';
  controller.brush = 'hazard';
  controller.pointerDown({ x: 4, y: 6 }, {});
  controller.pointerMove({ x: 5, y: 6 });
  controller.pointerMove({ x: 6, y: 6 });
  controller.pointerUp({ x: 6, y: 6 });
  assert.equal(document.layout(ID).tiles.length, 3);
  document.undo();
  assert.equal(document.layout(ID).tiles.length, 0);
});

test('a drag onto a wall leaves the layout alone and says why', () => {
  const { document, controller } = setup();
  const before = document.layout(ID);
  drag(controller, { x: 2, y: 2 }, { x: 0, y: 2 });
  assert.deepEqual(document.layout(ID), before);
  assert.match(controller.status, /wall/);
});

test('the add tool places the pending palette entry and selects it', () => {
  const { document, controller } = setup();
  controller.setPending({ collection: 'objects', label: 'trash-bin', entry: { object: 'trash-bin' } });
  controller.pointerDown({ x: 5, y: 5 }, {});
  controller.pointerUp({ x: 5, y: 5 });
  const added = document.layout(ID).objects.at(-1);
  assert.equal(added?.object, 'trash-bin');
  assert.deepEqual(controller.selection, { kind: 'entry', ref: { collection: 'objects', index: document.layout(ID).objects.length - 1 } });
});

test('a first drag on bare floor moves neither the room nor a patch under it', () => {
  const { document, controller } = setup();
  document.apply(ID, (layout) => addStep(layout, { kind: 'patch', rect: { x: 3, y: 3, width: 4, height: 4 }, tile: 'plating' }));
  const before = document.layout(ID);
  drag(controller, { x: 4, y: 4 }, { x: 6, y: 4 });
  assert.deepEqual(document.layout(ID), before);
  assert.deepEqual(controller.selection, { kind: 'room', room: 'hall' });
});

test('clicking the same floor again reaches the patch under it', () => {
  const { document, controller } = setup();
  document.apply(ID, (layout) => addStep(layout, { kind: 'patch', rect: { x: 3, y: 3, width: 4, height: 4 }, tile: 'plating' }));
  for (let click = 0; click < 2; click++) {
    controller.pointerDown({ x: 4, y: 4 }, {});
    controller.pointerUp({ x: 4, y: 4 });
  }
  assert.deepEqual(controller.selection, { kind: 'step', index: document.layout(ID).steps.length - 1 });
});

test('arrow keys nudge the selected object one tile and refuse walls', () => {
  const { document, controller } = setup();
  controller.pointerDown({ x: 2, y: 2 }, {});
  controller.pointerUp({ x: 2, y: 2 });
  assert.equal(controller.key('ArrowRight', {}), true);
  assert.deepEqual(placeOf(document.layout(ID), 0), { x: 3, y: 2 });
  assert.equal(controller.key('ArrowLeft', {}), true);
  assert.equal(controller.key('ArrowLeft', {}), true);
  assert.deepEqual(placeOf(document.layout(ID), 0), { x: 1, y: 2 });
  const before = document.layout(ID);
  controller.key('ArrowLeft', {});
  assert.deepEqual(document.layout(ID), before);
  assert.match(controller.status, /wall/);
});

test('arrow keys nudge a selected room', () => {
  const { document, controller } = setup();
  controller.select({ kind: 'room', room: 'side' });
  const rectOf = () => {
    const side = document.layout(ID).steps.find((step) => step.kind === 'room' && step.id === 'side');
    return side && 'rect' in side ? side.rect : null;
  };
  const before = rectOf();
  assert.ok(before);
  assert.equal(controller.key('ArrowDown', {}), true);
  const after = rectOf();
  assert.ok(after);
  assert.equal(after.y, before.y + 1);
});

test('arrow keys do nothing without a selection', () => {
  const { controller } = setup();
  assert.equal(controller.key('ArrowUp', {}), false);
});

test('V, B and E pick the select, paint and erase tools', () => {
  const { controller } = setup();
  assert.equal(controller.key('b', {}), true);
  assert.equal(controller.tool, 'paint');
  assert.equal(controller.key('e', {}), true);
  assert.equal(controller.tool, 'erase');
  assert.equal(controller.key('v', {}), true);
  assert.equal(controller.tool, 'select');
});

const LAND = 'fx-land';

const landSetup = (only = true) => {
  const document = new EditorDocument({ ...FIXTURE_LAYOUT_SOURCES, ...Object.fromEntries(FIXTURE_WILDS_LAYOUTS) }, FIXTURE_CONTENT, { [LAND]: FIXTURE_LAND.plan });
  const controller = new EditController(document, 'fx-hub');
  controller.setLand(LAND, only);
  return { document, controller };
};

const click = (controller: EditController, tile: { x: number; y: number }) => {
  controller.pointerDown(tile, {});
  controller.pointerUp(tile);
};

const lastStep = (document: EditorDocument): LandStep | undefined => document.landPlan(LAND).steps.at(-1);

test('three clicks and Enter add a polygon fill with those corners and the brush tile', () => {
  const { document, controller } = landSetup();
  assert.equal(controller.key('l', {}), true);
  controller.landBrush = { ...controller.landBrush, step: 'fill', shape: 'polygon', tile: 'rock' };
  const corners = [{ x: 100, y: 4 }, { x: 120, y: 4 }, { x: 110, y: 20 }];
  for (const corner of corners) click(controller, corner);
  assert.equal(controller.key('Enter', {}), true);
  assert.deepEqual(lastStep(document), { kind: 'fill', shape: { kind: 'polygon', points: corners }, tile: 'rock' });
  assert.equal(document.landPlan(LAND).steps.length, FIXTURE_LAND.plan.steps.length + 1);
  assert.equal(controller.landDraft, null);
});

test('two clicks and Enter with width 3 add a line', () => {
  const { document, controller } = landSetup();
  controller.tool = 'land';
  controller.landBrush = { ...controller.landBrush, step: 'line', width: 3, tile: 'water' };
  click(controller, { x: 100, y: 4 });
  click(controller, { x: 100, y: 24 });
  controller.key('Enter', {});
  assert.deepEqual(lastStep(document), { kind: 'line', points: [{ x: 100, y: 4 }, { x: 100, y: 24 }], width: 3, tile: 'water' });
});

test('a drag adds a round rise with the dragged rect and the brush height', () => {
  const { document, controller } = landSetup();
  controller.tool = 'land';
  controller.landBrush = { ...controller.landBrush, step: 'rise', shape: 'round', height: 2 };
  drag(controller, { x: 110, y: 20 }, { x: 100, y: 10 });
  assert.deepEqual(lastStep(document), { kind: 'rise', shape: { kind: 'round', rect: { x: 100, y: 10, width: 11, height: 11 } }, height: 2 });
});

test('Escape after two clicks adds nothing', () => {
  const { document, controller } = landSetup();
  controller.tool = 'land';
  click(controller, { x: 100, y: 4 });
  click(controller, { x: 120, y: 4 });
  controller.key('Escape', {});
  controller.key('Enter', {});
  assert.equal(document.landPlan(LAND).steps.length, FIXTURE_LAND.plan.steps.length);
  assert.equal(document.canUndo(), false);
});

test('dragging a selected polygon vertex moves only that vertex in one undo step', () => {
  const { document, controller } = landSetup();
  const before = document.landPlan(LAND);
  controller.select({ kind: 'landStep', index: 1 });
  drag(controller, { x: 40, y: 2 }, { x: 42, y: 4 });
  const step = document.landPlan(LAND).steps[1];
  const old = before.steps[1];
  assert.ok(step?.kind === 'fill' && step.shape.kind === 'polygon' && old?.kind === 'fill' && old.shape.kind === 'polygon');
  assert.deepEqual(step.shape.points, old.shape.points.map((point, index) => (index === 1 ? { x: 42, y: 4 } : point)));
  assert.deepEqual(document.landPlan(LAND).steps.filter((_, index) => index !== 1), before.steps.filter((_, index) => index !== 1));
  document.undo();
  assert.deepEqual(document.landPlan(LAND), before);
  assert.equal(document.canUndo(), false);
});

test('a click selects the topmost step and changing its tile in the panel replaces it', () => {
  const { document, controller } = landSetup();
  click(controller, { x: 110, y: 4 });
  assert.deepEqual(controller.selection, { kind: 'landStep', index: 6 });
  controller.select({ kind: 'landStep', index: 0 });
  const step = document.landPlan(LAND).steps[0];
  assert.ok(step?.kind === 'fill');
  assert.equal(controller.editLandStep(0, { ...step, tile: 'rock' }).ok, true);
  assert.deepEqual(document.landPlan(LAND).steps[0], { ...step, tile: 'rock' });
});

test('in a district scope L does not pick the land tool', () => {
  const { controller } = setup();
  assert.equal(controller.key('l', {}), false);
  assert.equal(controller.tool, 'select');
});

test('a refused land edit says why', () => {
  const { document, controller } = landSetup();
  controller.tool = 'land';
  controller.landBrush = { ...controller.landBrush, step: 'gate', gate: 'fx-wall-gate' };
  drag(controller, { x: 100, y: 4 }, { x: 101, y: 4 });
  assert.equal(document.landPlan(LAND).steps.length, FIXTURE_LAND.plan.steps.length);
  assert.match(controller.status, /named twice/);
});
