import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findContentIssues, GAME_CONTENT, type GameContent } from '../src/index.ts';
import type { DistrictDefinition } from '../src/world/district.ts';

const atrium = GAME_CONTENT.districts.get('meridian-atrium') as DistrictDefinition;

const withObject = (position: { x: number; y: number }): GameContent => {
  const district: DistrictDefinition = { ...atrium, objects: [...atrium.objects, { instanceId: 'stray-planter', objectId: 'planter', position }] };
  return { ...GAME_CONTENT, districts: new Map([...GAME_CONTENT.districts, [district.id, district]]) };
};

test('an object placed inside a wall is reported with its tile', () => {
  const issues = findContentIssues(withObject({ x: 0, y: 0 })).filter((issue) => issue.includes('stray-planter') && issue.includes('wall or void'));
  assert.equal(issues.length, 1, issues.join('; '));
  assert.match(issues[0] ?? '', /^zone meridian-atrium: .*stray-planter.*0,0/);
});

test('an object on open floor is not reported', () => {
  const plaza = atrium.rooms?.plaza;
  assert.ok(plaza);
  const issues = findContentIssues(withObject({ x: plaza.x + 3, y: plaza.y + 20 })).filter((issue) => issue.includes('stray-planter') && issue.includes('wall'));
  assert.deepEqual(issues, []);
});
