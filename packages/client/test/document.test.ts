import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LAYOUT_SOURCES } from '@containment/shared';
import { EditorDocument } from '../src/editor/document.ts';
import { moveEntry, rotateEntry } from '../src/editor/edits.ts';

const ATRIUM = 'meridian-atrium';
const LODGE = 'vesper-lodge';

test('undo and redo walk back and forth across two districts', () => {
  const document = new EditorDocument(LAYOUT_SOURCES);
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
  const document = new EditorDocument(LAYOUT_SOURCES);
  document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 }));
  document.undo();
  document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 1 }));
  assert.equal(document.redo(), null);
});

test('saving clears dirty, and undo after a save makes it dirty again', () => {
  const document = new EditorDocument(LAYOUT_SOURCES);
  document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 }));
  assert.equal(document.isDirty(ATRIUM), true);
  document.markSaved(ATRIUM, document.layout(ATRIUM));
  assert.equal(document.isDirty(ATRIUM), false);
  document.undo();
  assert.equal(document.isDirty(ATRIUM), true);
});

test('a refused edit changes nothing and reports why', () => {
  const document = new EditorDocument(LAYOUT_SOURCES);
  const before = document.layout(ATRIUM);
  const result = document.apply(ATRIUM, (layout) => moveEntry(layout, { collection: 'objects', index: 0 }, { x: 0, y: 0 }));
  assert.equal(result.ok, false);
  assert.deepEqual(document.layout(ATRIUM), before);
  assert.equal(document.isDirty(ATRIUM), false);
  assert.equal(document.undo(), null);
});

test('listeners hear which district changed', () => {
  const document = new EditorDocument(LAYOUT_SOURCES);
  const heard: string[] = [];
  document.onChange((id) => heard.push(id));
  document.apply(LODGE, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 }));
  document.undo();
  assert.deepEqual(heard, [LODGE, LODGE]);
  assert.equal(document.district(LODGE).id, LODGE);
});

test('canUndo and canRedo follow the history', () => {
  const document = new EditorDocument(LAYOUT_SOURCES);
  assert.equal(document.canUndo(), false);
  assert.equal(document.canRedo(), false);
  document.apply(ATRIUM, (layout) => rotateEntry(layout, { collection: 'objects', index: 0 }));
  assert.equal(document.canUndo(), true);
  document.undo();
  assert.equal(document.canUndo(), false);
  assert.equal(document.canRedo(), true);
});
