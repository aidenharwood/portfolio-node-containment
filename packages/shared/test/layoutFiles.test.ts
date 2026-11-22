import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GAME_CONTENT, LAYOUT_SOURCES } from '../src/index.ts';
import { parseLayout } from '../src/world/layout.ts';
import { printLayout } from '../src/world/printLayout.ts';

const DIRECTORY = new URL('../src/content/districts/layouts/', import.meta.url);
const files = readdirSync(DIRECTORY).filter((name) => name.endsWith('.json'));

test('there is one layout file per district', () => {
  assert.deepEqual(files.map((name) => name.replace(/\.json$/, '')).sort(), [...GAME_CONTENT.districts.keys()].sort());
});

test('every layout file names its own district and is printed canonically', () => {
  for (const name of files) {
    const text = readFileSync(new URL(name, DIRECTORY), 'utf8').replace(/\r\n/g, '\n');
    const layout = parseLayout(JSON.parse(text));
    assert.equal(`${layout.id}.json`, name);
    assert.equal(printLayout(layout), text, `${name} is not in canonical form`);
  }
});

test('every district is built from its layout file', () => {
  for (const id of GAME_CONTENT.districts.keys()) assert.ok(LAYOUT_SOURCES[id], `${id} has no layout source`);
  assert.equal(Object.keys(LAYOUT_SOURCES).length, GAME_CONTENT.districts.size);
});
