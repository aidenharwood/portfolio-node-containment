import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampBrightness,
  clampUiScale,
  DEFAULT_SETTINGS,
  frameIntervalFor,
  normalizeSettings,
  pixelRatioFor,
  PRESET_SETTINGS,
  presetOf,
  samplesFor,
  shadowMapSizeFor,
  VIEW_DISTANCES,
  viewReachFor,
} from '../src/state/gameSettings.ts';

test('stored settings fall back to defaults for anything missing or malformed', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ renderScale: 'ultra', shadows: 'low', bloom: 'yes', uiScale: 9, frameCap: '144', brightness: 'dim' }), {
    ...DEFAULT_SETTINGS,
    shadows: 'low',
    uiScale: 1.5,
  });
});

test('older boolean glow and weather settings carry over to their levels', () => {
  const migrated = normalizeSettings({ bloom: false, weather: false });
  assert.equal(migrated.glow, 'off');
  assert.equal(migrated.weather, 'off');
  assert.equal(normalizeSettings({ bloom: true, weather: true }).glow, 'full');
  assert.equal(normalizeSettings({ bloom: false, glow: 'subtle' }).glow, 'subtle');
  assert.equal(normalizeSettings({ bloom: false, glow: 'blinding' }).glow, 'off');
});

test('players who chose Performance before post-processing options existed keep it off', () => {
  const migrated = normalizeSettings({ renderScale: 'performance', shadows: 'off', bloom: false });
  assert.deepEqual([migrated.grading, migrated.vignette, migrated.grain, migrated.sharpen], [false, false, false, false]);
  assert.equal(normalizeSettings({ renderScale: 'performance', grading: true }).vignette, true);
});

test('the interface scale and brightness snap to their step and stay in range', () => {
  assert.equal(clampUiScale(1.12), 1.1);
  assert.equal(clampUiScale(0.2), 0.8);
  assert.equal(clampUiScale(Number.NaN), 1);
  assert.equal(clampBrightness(1.52), 1.3);
  assert.equal(clampBrightness(0.93), 0.95);
});

test('render scale picks a pixel ratio from the device and shadow quality picks a map size', () => {
  assert.equal(pixelRatioFor('performance', 3), 0.75);
  assert.equal(pixelRatioFor('balanced', 3), 1);
  assert.equal(pixelRatioFor('sharp', 3), 1.75);
  assert.equal(pixelRatioFor('sharp', 1), 1);
  assert.equal(pixelRatioFor('native', 3), 3);
  assert.equal(shadowMapSizeFor('low'), 1024);
  assert.equal(shadowMapSizeFor('high'), 2048);
  assert.equal(shadowMapSizeFor('ultra'), 4096);
});

test('automatic anti-aliasing matches the pixel ratio and explicit modes are fixed', () => {
  assert.equal(samplesFor('auto', 0.75), 0);
  assert.equal(samplesFor('auto', 1), 4);
  assert.equal(samplesFor('auto', 1.75), 2);
  assert.equal(samplesFor('off', 1), 0);
  assert.equal(samplesFor('4x', 3), 4);
});

test('presets are recognised until any graphics option departs from them', () => {
  assert.equal(presetOf(DEFAULT_SETTINGS), 'high');
  assert.equal(presetOf({ ...DEFAULT_SETTINGS, ...PRESET_SETTINGS.low }), 'low');
  assert.equal(presetOf({ ...DEFAULT_SETTINGS, grain: false }), 'custom');
  assert.equal(presetOf({ ...DEFAULT_SETTINGS, brightness: 1.2, fpsCounter: true }), 'high');
});

test('each preset reaches further, and older settings keep the reach their resolution gave them', () => {
  assert.deepEqual(
    (['low', 'medium', 'high', 'ultra'] as const).map((preset) => PRESET_SETTINGS[preset].viewDistance),
    VIEW_DISTANCES,
  );
  assert.deepEqual(VIEW_DISTANCES.map(viewReachFor), [600, 900, 1300, 1600]);
  assert.equal(DEFAULT_SETTINGS.viewDistance, 'vast');
  assert.equal(normalizeSettings({ viewDistance: 'extreme' }).viewDistance, 'extreme');
  assert.equal(normalizeSettings({ viewDistance: 'endless' }).viewDistance, 'vast');
  assert.equal(normalizeSettings({ renderScale: 'native' }).viewDistance, 'extreme');
  assert.equal(normalizeSettings({ renderScale: 'performance', viewDistance: 'vast' }).viewDistance, 'vast');
  assert.equal(presetOf({ ...DEFAULT_SETTINGS, viewDistance: 'near' }), 'custom');
});

test('frame caps turn into a minimum interval between frames', () => {
  assert.equal(frameIntervalFor('uncapped'), 0);
  assert.equal(frameIntervalFor('30'), 1000 / 30);
});
