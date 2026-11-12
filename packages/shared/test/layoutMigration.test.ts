import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';
import type { DistrictDefinition } from '../src/world/district.ts';
import { buildDistrict } from '../src/world/layout.ts';

const OPTIONAL_LISTS = ['assemblies', 'creatures', 'decals', 'landmarks'] as const;

const normalised = (district: DistrictDefinition): Record<string, unknown> => {
  const copy: Record<string, unknown> = { ...district };
  for (const key of OPTIONAL_LISTS) if (copy[key] === undefined) copy[key] = [];
  if (copy.anchors === undefined) copy.anchors = {};
  return copy;
};

test('every district rebuilds from its layout file exactly as it is built today', () => {
  assert.equal(GAME_CONTENT.districts.size, 31);
  for (const district of GAME_CONTENT.districts.values()) {
    const file = new URL(`../src/content/districts/layouts/${district.id}.json`, import.meta.url);
    const rebuilt = buildDistrict(JSON.parse(readFileSync(file, 'utf8')));
    assert.deepEqual(normalised(rebuilt), normalised(district), district.id);
  }
});
