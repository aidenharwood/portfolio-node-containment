import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findContentIssues, GAME_CONTENT } from '../src/index.ts';

test('all content references resolve and every zone is well formed', () => {
  assert.deepEqual(findContentIssues(GAME_CONTENT), []);
});

test('every piece of gear and medicine has a recipe fed from tier-appropriate sources', () => {
  const withoutMaul = new Map(GAME_CONTENT.recipes);
  withoutMaul.delete('fabricator:shock-maul');
  assert.ok(
    findContentIssues({ ...GAME_CONTENT, recipes: withoutMaul }).some((issue) => issue.startsWith('item shock-maul') && issue.includes('crafting recipe')),
  );

  const deepKestrel = new Map(GAME_CONTENT.recipes);
  const kestrel = GAME_CONTENT.recipes.get('fabricator:kestrel-sidearm');
  assert.ok(kestrel);
  deepKestrel.set(kestrel.id, { ...kestrel, inputs: [{ itemId: 'hardened-steel', count: 1 }] });
  assert.ok(
    findContentIssues({ ...GAME_CONTENT, recipes: deepKestrel }).some((issue) => issue.includes('kestrel-sidearm') && issue.includes('tier 3')),
  );

  const underLevelled = new Map(GAME_CONTENT.recipes);
  const carbine = GAME_CONTENT.recipes.get('fabricator:marksman-carbine');
  assert.ok(carbine);
  underLevelled.set(carbine.id, { ...carbine, level: 2 });
  assert.ok(findContentIssues({ ...GAME_CONTENT, recipes: underLevelled }).some((issue) => issue.includes('below the item')));
});
