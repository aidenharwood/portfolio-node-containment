import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readViewState, writeViewState, type ViewState } from '../src/editor/viewState.ts';

const KNOWN = new Set(['intake-wing', 'meridian-atrium']);

test('a full view state survives a trip through the URL', () => {
  const state: ViewState = { district: 'meridian-atrium', room: 'plaza', view: '3d', yaw: 30, pitch: 40, zoom: 0.4, focus: { x: 61, y: 47 }, layers: ['tiles', 'objects', 'issues'] };
  assert.deepEqual(readViewState(writeViewState(state), KNOWN), state);
});

test('an unknown district and a negative zoom fall back to safe values', () => {
  const state = readViewState('?district=nope&zoom=-3', KNOWN);
  assert.equal(state.district, 'intake-wing');
  assert.equal(state.zoom, 0.1);
});

test('missing or garbled numbers take the defaults', () => {
  const state = readViewState('?district=meridian-atrium&yaw=abc&focus=1', KNOWN);
  assert.deepEqual([state.view, state.yaw, state.pitch, state.zoom, state.focus], ['split', 45, 55, 1, undefined]);
  assert.ok(state.layers.includes('objects'));
});

test('a huge zoom is clamped and unknown layers are dropped', () => {
  const state = readViewState('?district=meridian-atrium&zoom=99&layers=objects,sparkles', KNOWN);
  assert.equal(state.zoom, 8);
  assert.deepEqual(state.layers, ['objects']);
});
