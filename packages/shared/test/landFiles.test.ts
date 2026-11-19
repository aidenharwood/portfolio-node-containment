import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FIXTURE_LAND_PLAN } from './fixtures/world/wilds.ts';
import { LAND_SOURCES } from '../src/content/land/index.ts';
import { drawLand } from '../src/world/landPlan.ts';
import { parseLandPlan } from '../src/world/landSchema.ts';
import { printLandPlan } from '../src/world/printLandPlan.ts';

const DIRECTORY = new URL('../src/content/land/', import.meta.url);
const files = readdirSync(DIRECTORY).filter((name) => name.endsWith('.json'));

test('there is one land source per land file', () => {
  assert.deepEqual(files.map((name) => name.replace(/\.json$/, '')).sort(), Object.keys(LAND_SOURCES).sort());
});

test('every land file names its own plan, is printed canonically and draws', () => {
  for (const name of files) {
    const text = readFileSync(new URL(name, DIRECTORY), 'utf8').replace(/\r\n/g, '\n');
    const plan = parseLandPlan(JSON.parse(text));
    assert.equal(`${plan.id}.json`, name);
    assert.deepEqual(parseLandPlan(LAND_SOURCES[plan.id]), plan);
    assert.equal(printLandPlan(plan), text, `${name} is not in canonical form`);
    const land = drawLand(plan);
    assert.equal(land.width, plan.columns * plan.squareSize);
    assert.equal(land.height, plan.rows * plan.squareSize);
  }
});

test('a printed land plan reads back as the same plan', () => {
  const text = printLandPlan(FIXTURE_LAND_PLAN);
  assert.deepEqual(parseLandPlan(JSON.parse(text)), FIXTURE_LAND_PLAN);
  assert.ok(text.endsWith('}\n'));
  assert.equal(text.split('\n').filter((line) => line.startsWith('    {')).length, FIXTURE_LAND_PLAN.steps.length);
});

test('printing a land plan with an even line width fails with the schema message', () => {
  const steps = FIXTURE_LAND_PLAN.steps.map((step) => (step.kind === 'line' ? { ...step, width: 2 } : step));
  assert.throws(() => printLandPlan({ ...FIXTURE_LAND_PLAN, steps }), /a line is an odd number of tiles wide/);
});
