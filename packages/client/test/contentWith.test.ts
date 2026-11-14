import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDistrict, findContentIssues, parseLayout, type DistrictDefinition, type DistrictLayout } from '@containment/shared';
import { FIXTURE_CONTENT, FIXTURE_CONTEXT, FIXTURE_LAYOUT_SOURCES, FIXTURE_LEVEL_RECIPES } from '@containment/shared/fixtures';
import { contentWith } from '../src/editor/contentWith.ts';

const restitch = (edited: Parameters<typeof contentWith>[1]) => contentWith(FIXTURE_CONTENT, edited, FIXTURE_LEVEL_RECIPES, FIXTURE_CONTEXT.hollowOf);

const edited = (id: string, change: (layout: DistrictLayout) => DistrictLayout) => {
  const layout = change(parseLayout(FIXTURE_LAYOUT_SOURCES[id]));
  return new Map([[id, { layout, district: buildDistrict(layout) }]]);
};

test('an object dropped into a wall of an edited district is reported, and the base content stays clean', () => {
  const content = restitch(edited('fx-hub', (layout) => ({ ...layout, objects: [...layout.objects, { id: 'stray-planter', object: 'planter', at: { x: 0, y: 0 } }] })));
  assert.ok(findContentIssues(content).some((issue) => issue.includes('stray-planter')));
  assert.equal(findContentIssues(FIXTURE_CONTENT).some((issue) => issue.includes('stray-planter')), false);
});

test('levels are re-stitched from the edited districts', () => {
  const field = FIXTURE_CONTENT.districts.get('fx-field') as DistrictDefinition;
  const widened: DistrictDefinition = {
    ...field,
    map: field.map.map((row) => `${row} `),
    exits: Object.fromEntries(Object.entries(field.exits ?? {}).map(([name, exit]) => [name, name === 'east' ? { ...exit, tiles: exit.tiles.map((tile) => ({ x: tile.x + 1, y: tile.y })) } : exit])),
  };
  const content = restitch(new Map([['fx-field', { district: widened, layout: parseLayout(FIXTURE_LAYOUT_SOURCES['fx-field']) }]]));
  const offset = (level: typeof FIXTURE_CONTENT, id: string) => {
    const placed = level.levels.get('fx-floor')?.districts ?? [];
    const rect = (districtId: string) => placed.find((each) => each.districtId === districtId)?.rect ?? { x: NaN, y: NaN };
    return rect(id).x - rect('fx-hub').x;
  };
  assert.equal(offset(content, 'fx-outpost'), offset(FIXTURE_CONTENT, 'fx-outpost') + 1);
  assert.equal(content.districts.get('fx-field'), widened);
});

test('with nothing edited the base content comes back unchanged', () => {
  assert.equal(restitch(new Map()), FIXTURE_CONTENT);
});
