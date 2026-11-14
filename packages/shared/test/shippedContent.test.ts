import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findContentIssues, GAME_CONTENT } from '../src/index.ts';

test('the shipped world passes every content check', () => {
  assert.deepEqual(findContentIssues(GAME_CONTENT), []);
});

test('new characters start in a district of the shipped world', () => {
  const start = GAME_CONTENT.newCharacter.startingLocation;
  assert.ok(GAME_CONTENT.levels.get(start.levelId)?.layout.districtAt(start.position));
});

test('the Site Meridian lifts run from the headhouse down to the Vault and back', () => {
  const depthOf = (districtId: string): number | undefined => {
    const levelId = GAME_CONTENT.levelOfDistrict.get(districtId);
    return levelId === undefined ? undefined : GAME_CONTENT.levels.get(levelId)?.definition.depth;
  };
  const destination = (objectId: string): string => {
    const effect = GAME_CONTENT.worldObjects.get(objectId)?.interactions[0]?.effects[0];
    assert.equal(effect?.type, 'teleport', `${objectId} is a lift`);
    return effect.type === 'teleport' ? effect.districtId : '';
  };
  const route: readonly [string, string, number][] = [
    ['meridian-lift', 'canal-basin', -1],
    ['intake-lift-down', 'meridian-intake', -2],
    ['secure-lift-down', 'meridian-secure', -3],
    ['vault-lift-up', 'meridian-vault', -2],
    ['secure-lift-up', 'meridian-secure', -1],
    ['intake-lift-up', 'meridian-intake', 0],
  ];
  for (const [lift, from, depth] of route) {
    const placed = GAME_CONTENT.districts.get(from)?.objects.some((object) => object.objectId === lift);
    assert.ok(placed, `${lift} stands in ${from}`);
    assert.equal(depthOf(destination(lift)), depth, `${lift} leads to depth ${depth}`);
  }
});
