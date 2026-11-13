import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resolvePosition, drawBlueprint, type DistrictLayout } from '@containment/shared';
import { EditorDocument } from '../src/editor/document.ts';
import { EditController } from '../src/editor/editController.ts';
import { addStep } from '../src/editor/edits.ts';

const FIXTURE = new URL('../../shared/test/fixtures/sample-layout.json', import.meta.url);
const ID = 'sample-district';

const setup = () => {
  const document = new EditorDocument({ [ID]: JSON.parse(readFileSync(FIXTURE, 'utf8')) });
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
