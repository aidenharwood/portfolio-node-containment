import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { printLayout, parseLayout } from '@containment/shared';
import { createWriteLog, saveLayout } from '../editorSave.ts';

const SOURCE = fileURLToPath(new URL('../../shared/src/content/districts/layouts/', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'layouts-'));
copyFileSync(join(SOURCE, 'terminus-square.json'), join(root, 'terminus-square.json'));
after(() => rmSync(root, { recursive: true, force: true }));

const original = (): Record<string, unknown> => JSON.parse(readFileSync(join(SOURCE, 'terminus-square.json'), 'utf8')) as Record<string, unknown>;

test('an unknown district is not found and no file is created', () => {
  const result = saveLayout(root, 'nowhere', JSON.stringify(original()));
  assert.deepEqual(result.ok ? null : result.status, 404);
  assert.equal(existsSync(join(root, 'nowhere.json')), false);
});

test('an id that could leave the folder is refused', () => {
  const result = saveLayout(root, '../terminus-square', JSON.stringify(original()));
  assert.equal(result.ok, false);
});

test('malformed json is refused', () => {
  const result = saveLayout(root, 'terminus-square', '{ not json');
  assert.deepEqual(result.ok ? null : result.status, 422);
});

test('a layout that fails to build is refused with its path', () => {
  const broken = original();
  const npcs = broken.npcs as { at: { room: string } }[];
  if (npcs[0]) npcs[0].at.room = 'lodgee';
  else (broken.objects as { at: { room: string } }[])[0]!.at.room = 'lodgee';
  const result = saveLayout(root, 'terminus-square', JSON.stringify(broken));
  assert.equal(result.ok, false);
  assert.match(result.ok ? '' : result.error, /\.at/);
});

test('a body whose id does not match the url is refused', () => {
  const result = saveLayout(root, 'terminus-square', JSON.stringify({ ...original(), id: 'some-other-district' }));
  assert.deepEqual(result.ok ? null : result.status, 422);
});

test('a valid layout is written in canonical form', () => {
  const shuffled = Object.fromEntries(Object.entries(original()).reverse());
  const result = saveLayout(root, 'terminus-square', JSON.stringify(shuffled, null, 5));
  assert.ok(result.ok);
  const expected = printLayout(parseLayout(original()));
  assert.equal(readFileSync(join(root, 'terminus-square.json'), 'utf8'), expected);
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
