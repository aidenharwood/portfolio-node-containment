import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTileLayout, type LandPlan, type LandStep } from '@containment/shared';
import { FIXTURE_CONTENT, FIXTURE_LAND, FIXTURE_LAYOUT_SOURCES, FIXTURE_WILDS_LAYOUTS } from '@containment/shared/fixtures';
import { EditorDocument, type DocumentChange } from '../src/editor/document.ts';
import type { LandEditResult } from '../src/editor/landEdits.ts';
import { moveEntry, rotateEntry } from '../src/editor/edits.ts';

const ATRIUM = 'fx-hub';
const LODGE = 'fx-outpost';

test('undo and redo walk back and forth across two districts', () => {
  const document = new EditorDocument(FIXTURE_LAYOUT_SOURCES, FIXTURE_CONTENT);
  const atriumBefore = document.layout(ATRIUM);
  const lodgeBefore = document.layout(LODGE);
  assert.ok(document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 })).ok);
  const atriumAfter = document.layout(ATRIUM);
  assert.ok(document.apply(LODGE, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 })).ok);
  assert.equal(document.undo(), LODGE);
  assert.deepEqual(document.layout(LODGE), lodgeBefore);
  assert.equal(document.undo(), ATRIUM);
  assert.deepEqual(document.layout(ATRIUM), atriumBefore);
  assert.equal(document.undo(), null);
  assert.equal(document.redo(), ATRIUM);
  assert.deepEqual(document.layout(ATRIUM), atriumAfter);
  assert.deepEqual(document.dirtyIds(), [ATRIUM]);
});

test('a new edit clears redo', () => {
  const document = new EditorDocument(FIXTURE_LAYOUT_SOURCES, FIXTURE_CONTENT);
  document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 }));
  document.undo();
  document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 1 }));
  assert.equal(document.redo(), null);
});

test('saving clears dirty, and undo after a save makes it dirty again', () => {
  const document = new EditorDocument(FIXTURE_LAYOUT_SOURCES, FIXTURE_CONTENT);
  document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 }));
  assert.equal(document.isDirty(ATRIUM), true);
  document.markSaved(ATRIUM, document.layout(ATRIUM));
  assert.equal(document.isDirty(ATRIUM), false);
  document.undo();
  assert.equal(document.isDirty(ATRIUM), true);
});

test('a refused edit changes nothing and reports why', () => {
  const document = new EditorDocument(FIXTURE_LAYOUT_SOURCES, FIXTURE_CONTENT);
  const before = document.layout(ATRIUM);
  const result = document.apply(ATRIUM, (layout) => moveEntry(layout, { collection: 'objects', index: 0 }, { x: 0, y: 0 }));
  assert.equal(result.ok, false);
  assert.deepEqual(document.layout(ATRIUM), before);
  assert.equal(document.isDirty(ATRIUM), false);
  assert.equal(document.undo(), null);
});

test('listeners hear which district changed', () => {
  const document = new EditorDocument(FIXTURE_LAYOUT_SOURCES, FIXTURE_CONTENT);
  const heard: DocumentChange[] = [];
  document.onChange((change) => heard.push(change));
  document.apply(LODGE, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 }));
  document.undo();
  assert.deepEqual(heard, [{ kind: 'district', id: LODGE }, { kind: 'district', id: LODGE }]);
  assert.equal(document.district(LODGE).id, LODGE);
});

test('canUndo and canRedo follow the history', () => {
  const document = new EditorDocument(FIXTURE_LAYOUT_SOURCES, FIXTURE_CONTENT);
  assert.equal(document.canUndo(), false);
  assert.equal(document.canRedo(), false);
  document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 }));
  assert.equal(document.canUndo(), true);
  document.undo();
  assert.equal(document.canUndo(), false);
  assert.equal(document.canRedo(), true);
});

const LAND = 'fx-land';
const WEST = 'fx-wild-west';
const WILD_SOURCES: Readonly<Record<string, unknown>> = { ...FIXTURE_LAYOUT_SOURCES, ...Object.fromEntries(FIXTURE_WILDS_LAYOUTS) };
const LAND_SOURCES: Readonly<Record<string, unknown>> = { [LAND]: FIXTURE_LAND.plan };

const wildDocument = (): EditorDocument => new EditorDocument(WILD_SOURCES, FIXTURE_CONTENT, LAND_SOURCES);
const withStep = (step: LandStep) => (plan: LandPlan): LandEditResult => ({ ok: true, plan: { ...plan, steps: [...plan.steps, step] } });
const tileOf = (document: EditorDocument, id: string, x: number, y: number) => {
  const district = document.district(id);
  return parseTileLayout(district.map, district.heights).tileAt({ x, y });
};

test('a land edit in one square re-cuts only the district in that square', () => {
  const document = wildDocument();
  for (const id of FIXTURE_WILDS_LAYOUTS.keys()) document.district(id);
  assert.equal(tileOf(document, WEST, 3, 27), 'grass');
  const heard: DocumentChange[] = [];
  document.onChange((change) => heard.push(change));
  const result = document.applyLand(LAND, withStep({ kind: 'fill', shape: { kind: 'rect', rect: { x: 2, y: 26, width: 3, height: 3 } }, tile: 'water' }));
  assert.equal(result.ok, true);
  assert.deepEqual(heard, [{ kind: 'land', id: LAND }, { kind: 'district', id: WEST }]);
  assert.equal(tileOf(document, WEST, 3, 27), 'water');
  assert.equal(document.land(LAND).tileAt({ x: 3, y: 27 }), 'water');
  assert.equal(document.isLandDirty(LAND), true);
  assert.deepEqual(document.dirtyLands(), [LAND]);
  assert.equal(document.editedLands().get(LAND), document.land(LAND));
});

test('a land edit that changes no square re-cuts nothing', () => {
  const document = wildDocument();
  const heard: DocumentChange[] = [];
  document.onChange((change) => heard.push(change));
  const rename = (plan: LandPlan): LandEditResult => ({ ok: true, plan: { ...plan, steps: plan.steps.map((step) => (step.kind === 'gate' ? { ...step, id: 'fx-renamed-gate' } : step)) } });
  assert.equal(document.applyLand(LAND, rename).ok, true);
  assert.deepEqual(heard, [{ kind: 'land', id: LAND }]);
});

test('a land edit that leaves no land under a crate shows its build error until undone', () => {
  const document = wildDocument();
  document.district(WEST);
  const result = document.applyLand(LAND, withStep({ kind: 'fill', shape: { kind: 'rect', rect: { x: 12, y: 8, width: 1, height: 1 } }, tile: 'void' }));
  assert.equal(result.ok, true);
  assert.equal(document.land(LAND).tileAt({ x: 12, y: 8 }), 'void');
  assert.match(document.buildError(WEST) ?? '', /objects\[0\]/);
  assert.equal(document.undo(), LAND);
  assert.equal(document.buildError(WEST), null);
});

test('undo and redo walk interleaved land and district edits in order', () => {
  const document = wildDocument();
  const plans: LandPlan[] = [document.landPlan(LAND)];
  const hubBefore = document.layout(ATRIUM);
  assert.ok(document.applyLand(LAND, withStep({ kind: 'fill', shape: { kind: 'rect', rect: { x: 2, y: 26, width: 3, height: 3 } }, tile: 'water' })).ok);
  plans.push(document.landPlan(LAND));
  assert.ok(document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 })).ok);
  const hubAfter = document.layout(ATRIUM);
  assert.ok(document.applyLand(LAND, withStep({ kind: 'fill', shape: { kind: 'rect', rect: { x: 100, y: 4, width: 3, height: 3 } }, tile: 'rock' })).ok);
  plans.push(document.landPlan(LAND));
  assert.equal(document.undo(), LAND);
  assert.deepEqual(document.landPlan(LAND), plans[1]);
  assert.equal(document.undo(), ATRIUM);
  assert.deepEqual(document.layout(ATRIUM), hubBefore);
  assert.equal(document.undo(), LAND);
  assert.deepEqual(document.landPlan(LAND), plans[0]);
  assert.equal(tileOf(document, WEST, 3, 27), 'grass');
  assert.equal(document.undo(), null);
  assert.equal(document.redo(), LAND);
  assert.equal(tileOf(document, WEST, 3, 27), 'water');
  assert.equal(document.redo(), ATRIUM);
  assert.deepEqual(document.layout(ATRIUM), hubAfter);
  assert.equal(document.redo(), LAND);
  assert.deepEqual(document.landPlan(LAND), plans[2]);
});

test('undoing back to the saved land plan clears dirty', () => {
  const document = wildDocument();
  assert.equal(document.isLandDirty(LAND), false);
  document.applyLand(LAND, withStep({ kind: 'fill', shape: { kind: 'rect', rect: { x: 2, y: 26, width: 3, height: 3 } }, tile: 'water' }));
  assert.equal(document.isLandDirty(LAND), true);
  document.undo();
  assert.equal(document.isLandDirty(LAND), false);
  document.redo();
  document.markLandSaved(LAND, document.landPlan(LAND));
  assert.equal(document.isLandDirty(LAND), false);
  document.undo();
  assert.equal(document.isLandDirty(LAND), true);
});

test('a refused land edit changes nothing', () => {
  const document = wildDocument();
  const before = document.landPlan(LAND);
  assert.equal(document.applyLand(LAND, () => ({ ok: false, error: 'no' })).ok, false);
  assert.equal(document.landPlan(LAND), before);
  assert.equal(document.canUndo(), false);
});
