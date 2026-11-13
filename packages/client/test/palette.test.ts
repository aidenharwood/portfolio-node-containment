import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '@containment/shared';
import { PALETTE_GROUPS, paletteEntries, searchPalette } from '../src/editor/palette.ts';

test('every palette entry belongs to a known group and carries a readable name', () => {
  const groups = new Set(PALETTE_GROUPS.map((group) => group.collection));
  for (const entry of paletteEntries(GAME_CONTENT)) {
    assert.ok(groups.has(entry.collection), entry.label);
    assert.ok(entry.name && entry.name.length > 0, entry.label);
  }
});

test('search matches display names as well as ids and narrows by group', () => {
  const entries = paletteEntries(GAME_CONTENT);
  const npc = [...GAME_CONTENT.npcs.values()][0];
  assert.ok(npc);
  const word = npc.name.split(/\s+/)[0] ?? npc.name;
  assert.ok(searchPalette(entries, word).some((entry) => entry.entry.npc === npc.id));
  const onlyLights = searchPalette(entries, '', 'lights');
  assert.ok(onlyLights.length > 0);
  assert.ok(onlyLights.every((entry) => entry.collection === 'lights'));
});
