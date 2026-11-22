import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { printLandPlan, printLayout, parseLayout, type LandPlan } from '@containment/shared';
import { FIXTURE_LAND, FIXTURE_WILDS_LAYOUTS } from '@containment/shared/fixtures';
import { createWriteLog, saveLand, saveLayout } from '../editorSave.ts';

const SOURCE = fileURLToPath(new URL('../../shared/src/content/districts/layouts/', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'layouts-'));
copyFileSync(join(SOURCE, 'kestrel-intake.json'), join(root, 'kestrel-intake.json'));
after(() => rmSync(root, { recursive: true, force: true }));

const original = (): Record<string, unknown> => JSON.parse(readFileSync(join(SOURCE, 'kestrel-intake.json'), 'utf8')) as Record<string, unknown>;

test('an unknown district is not found and no file is created', () => {
  const result = saveLayout(root, 'nowhere', JSON.stringify(original()));
  assert.deepEqual(result.ok ? null : result.status, 404);
  assert.equal(existsSync(join(root, 'nowhere.json')), false);
});

test('an id that could leave the folder is refused', () => {
  const result = saveLayout(root, '../kestrel-intake', JSON.stringify(original()));
  assert.equal(result.ok, false);
});

test('malformed json is refused', () => {
  const result = saveLayout(root, 'kestrel-intake', '{ not json');
  assert.deepEqual(result.ok ? null : result.status, 422);
});

test('a layout that fails to build is refused with its path', () => {
  const broken = original();
  const npcs = broken.npcs as { at: { room: string } }[];
  if (npcs[0]) npcs[0].at.room = 'lodgee';
  else (broken.objects as { at: { room: string } }[])[0]!.at.room = 'lodgee';
  const result = saveLayout(root, 'kestrel-intake', JSON.stringify(broken));
  assert.equal(result.ok, false);
  assert.match(result.ok ? '' : result.error, /\.at/);
});

test('a body whose id does not match the url is refused', () => {
  const result = saveLayout(root, 'kestrel-intake', JSON.stringify({ ...original(), id: 'some-other-district' }));
  assert.deepEqual(result.ok ? null : result.status, 422);
});

test('a valid layout is written in canonical form', () => {
  const shuffled = Object.fromEntries(Object.entries(original()).reverse());
  const result = saveLayout(root, 'kestrel-intake', JSON.stringify(shuffled, null, 5));
  assert.ok(result.ok);
  const expected = printLayout(parseLayout(original()));
  assert.equal(readFileSync(join(root, 'kestrel-intake.json'), 'utf8'), expected);
  assert.equal(result.text, expected);
});

test('writes made by the editor suppress reloads for two seconds', () => {
  const log = createWriteLog();
  log.record('a.json', 1000);
  log.record('a.json', 1500);
  assert.equal(log.shouldSuppress('a.json', 2400), true);
  assert.equal(log.shouldSuppress('a.json', 3600), false);
  assert.equal(log.shouldSuppress('b.json', 1600), false);
});

const landHome = mkdtempSync(join(tmpdir(), 'land-'));
const landRoot = join(landHome, 'land');
const squareRoot = join(landHome, 'layouts');
mkdirSync(landRoot);
mkdirSync(squareRoot);
const LAND_TEXT = printLandPlan(FIXTURE_LAND.plan);
writeFileSync(join(landRoot, 'fx-land.json'), LAND_TEXT);
for (const [id, layout] of FIXTURE_WILDS_LAYOUTS) writeFileSync(join(squareRoot, id + '.json'), JSON.stringify(layout));
after(() => rmSync(landHome, { recursive: true, force: true }));

const landFile = (): string => readFileSync(join(landRoot, 'fx-land.json'), 'utf8');
const withStep = (step: LandPlan['steps'][number]): LandPlan => ({ ...FIXTURE_LAND.plan, steps: [...FIXTURE_LAND.plan.steps, step] });
const refusedLand = (id: string, body: string, status: number, pattern?: RegExp): void => {
  const result = saveLand(landRoot, squareRoot, id, body);
  assert.equal(result.ok ? null : result.status, status);
  if (pattern) assert.match(result.ok ? '' : result.error, pattern);
  assert.equal(landFile(), LAND_TEXT);
};

test('a land plan that every square still builds on is written in canonical form', () => {
  const plan = withStep({ kind: 'fill', shape: { kind: 'rect', rect: { x: 100, y: 4, width: 4, height: 4 } }, tile: 'rock' });
  const result = saveLand(landRoot, squareRoot, 'fx-land', JSON.stringify(plan, null, 7));
  assert.ok(result.ok);
  assert.equal(landFile(), printLandPlan(plan));
  writeFileSync(join(landRoot, 'fx-land.json'), LAND_TEXT);
});

test('a land id that is not kebab-case is refused', () => {
  refusedLand('../fx-land', JSON.stringify(FIXTURE_LAND.plan), 400);
});

test('a land with no file is not found', () => {
  const result = saveLand(landRoot, squareRoot, 'nowhere', JSON.stringify({ ...FIXTURE_LAND.plan, id: 'nowhere' }));
  assert.equal(result.ok ? null : result.status, 404);
  assert.equal(existsSync(join(landRoot, 'nowhere.json')), false);
});

test('malformed land json is refused', () => {
  refusedLand('fx-land', '{ nope', 422);
});

test('a land plan that does not parse or draw is refused', () => {
  refusedLand('fx-land', JSON.stringify(withStep({ kind: 'line', points: [{ x: 1, y: 1 }, { x: 4, y: 1 }], width: 2, tile: 'water' })), 422, /odd/);
  refusedLand('fx-land', JSON.stringify(withStep({ kind: 'gate', id: 'fx-wall-gate', rect: { x: 100, y: 4, width: 1, height: 1 }, tile: 'door' })), 422, /named twice/);
});

test('a land body whose id does not match the url is refused', () => {
  refusedLand('fx-land', JSON.stringify({ ...FIXTURE_LAND.plan, id: 'other-land' }), 422, /other-land/);
});

test('a land plan that leaves a square crate with no land is refused with that district', () => {
  refusedLand('fx-land', JSON.stringify(withStep({ kind: 'fill', shape: { kind: 'rect', rect: { x: 12, y: 8, width: 1, height: 1 } }, tile: 'void' })), 422, /fx-wild-west: objects\[0\]/);
});

test('a land square layout is saved when it builds on the land beside it', () => {
  const layout = FIXTURE_WILDS_LAYOUTS.get('fx-wild-west');
  assert.ok(layout);
  const result = saveLayout(squareRoot, 'fx-wild-west', JSON.stringify(layout), landRoot);
  assert.ok(result.ok);
  assert.equal(readFileSync(join(squareRoot, 'fx-wild-west.json'), 'utf8'), printLayout(parseLayout(layout)));
});

test('a land square layout is refused without a land plan, and when it no longer builds on the land', () => {
  const layout = FIXTURE_WILDS_LAYOUTS.get('fx-wild-west');
  assert.ok(layout);
  const before = readFileSync(join(squareRoot, 'fx-wild-west.json'), 'utf8');
  const unlanded = saveLayout(squareRoot, 'fx-wild-west', JSON.stringify(layout));
  assert.match(unlanded.ok ? '' : unlanded.error, /needs the land plan/);
  const moved = { ...layout, objects: [{ id: 'wild-west-crate', object: 'crate', at: { room: 'no-such-room', dx: 0, dy: 0 } }] };
  const broken = saveLayout(squareRoot, 'fx-wild-west', JSON.stringify(moved), landRoot);
  assert.equal(broken.ok, false);
  assert.equal(readFileSync(join(squareRoot, 'fx-wild-west.json'), 'utf8'), before);
});
