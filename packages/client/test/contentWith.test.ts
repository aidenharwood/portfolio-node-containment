import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDistrict, findContentIssues, GAME_CONTENT, LAYOUT_SOURCES, parseLayout, type DistrictDefinition, type DistrictLayout } from '@containment/shared';
import { contentWith } from '../src/editor/contentWith.ts';

const edited = (id: string, change: (layout: DistrictLayout) => DistrictLayout) => {
  const layout = change(parseLayout(LAYOUT_SOURCES[id]));
  return new Map([[id, { layout, district: buildDistrict(layout) }]]);
};

test('a planter dropped into a wall of the edited atrium is reported, and the shipped content stays clean', () => {
  const content = contentWith(GAME_CONTENT, edited('meridian-atrium', (layout) => ({ ...layout, objects: [...layout.objects, { id: 'stray-planter', object: 'planter', at: { x: 0, y: 0 } }] })));
  assert.ok(findContentIssues(content).some((issue) => issue.includes('stray-planter')));
  assert.equal(findContentIssues(GAME_CONTENT).some((issue) => issue.includes('stray-planter')), false);
});

test('levels are re-stitched from the edited districts', () => {
  const hydroponics = GAME_CONTENT.districts.get('hydroponics') as DistrictDefinition;
  const widened: DistrictDefinition = {
    ...hydroponics,
    map: hydroponics.map.map((row) => `${row} `),
    exits: Object.fromEntries(Object.entries(hydroponics.exits ?? {}).map(([name, exit]) => [name, name === 'east' ? { ...exit, tiles: exit.tiles.map((tile) => ({ x: tile.x + 1, y: tile.y })) } : exit])),
  };
  const content = contentWith(GAME_CONTENT, new Map([['hydroponics', { district: widened, layout: parseLayout(LAYOUT_SOURCES.hydroponics) }]]));
  const offset = (level: typeof GAME_CONTENT, id: string) => {
    const placed = level.levels.get('main-floor')?.districts ?? [];
    const rect = (districtId: string) => placed.find((each) => each.districtId === districtId)?.rect ?? { x: NaN, y: NaN };
    return rect(id).x - rect('meridian-circuit').x;
  };
  assert.equal(offset(content, 'hydroponics'), offset(GAME_CONTENT, 'hydroponics') - 1);
  assert.equal(content.districts.get('hydroponics'), widened);
});

test('with nothing edited the base content comes back unchanged', () => {
  assert.equal(contentWith(GAME_CONTENT, new Map()), GAME_CONTENT);
});
