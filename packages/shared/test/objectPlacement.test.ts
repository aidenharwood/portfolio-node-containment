import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findContentIssues, type GameContent } from '../src/index.ts';
import type { DistrictDefinition } from '../src/world/district.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const atrium = FIXTURE_CONTENT.districts.get('fx-hub') as DistrictDefinition;

const withObject = (position: { x: number; y: number }): GameContent => {
  const district: DistrictDefinition = { ...atrium, objects: [...atrium.objects, { instanceId: 'stray-planter', objectId: 'planter', position }] };
  return { ...FIXTURE_CONTENT, districts: new Map([...FIXTURE_CONTENT.districts, [district.id, district]]) };
};

test('an object placed inside a wall is reported with its tile', () => {
  const issues = findContentIssues(withObject({ x: 0, y: 0 })).filter((issue) => issue.includes('stray-planter') && issue.includes('wall or void'));
  assert.equal(issues.length, 1, issues.join('; '));
  assert.match(issues[0] ?? '', /^zone fx-hub: .*stray-planter.*0,0/);
});

test('an object on open floor is not reported', () => {
  const plaza = atrium.rooms?.plaza;
  assert.ok(plaza);
  const issues = findContentIssues(withObject({ x: plaza.x + 3, y: plaza.y + 5 })).filter((issue) => issue.includes('stray-planter') && issue.includes('wall'));
  assert.deepEqual(issues, []);
});
