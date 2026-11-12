import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampUiScale, DEFAULT_SETTINGS, normalizeSettings, pixelRatioFor, shadowMapSizeFor } from '../src/state/gameSettings.ts';

test('stored settings fall back to defaults for anything missing or malformed', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ renderScale: 'ultra', shadows: 'low', bloom: 'yes', uiScale: 9 }), {
    ...DEFAULT_SETTINGS,
    shadows: 'low',
    uiScale: 1.5,
  });
});

test('the interface scale snaps to its step and stays in range', () => {
  assert.equal(clampUiScale(1.12), 1.1);
  assert.equal(clampUiScale(0.2), 0.8);
  assert.equal(clampUiScale(Number.NaN), 1);
});

test('render scale picks a pixel ratio from the device and shadow quality picks a map size', () => {
  assert.equal(pixelRatioFor('performance', 3), 0.75);
  assert.equal(pixelRatioFor('balanced', 3), 1);
  assert.equal(pixelRatioFor('sharp', 3), 1.75);
  assert.equal(pixelRatioFor('sharp', 1), 1);
  assert.equal(pixelRatioFor('native', 3), 3);
  assert.equal(shadowMapSizeFor('low'), 1024);
  assert.equal(shadowMapSizeFor('high'), 2048);
});
