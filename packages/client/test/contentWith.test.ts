import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDistrict, drawLand, findContentIssues, parseLayout, type DistrictDefinition, type DistrictLayout, type LandMap } from '@containment/shared';
import { FIXTURE_CONTENT, FIXTURE_CONTEXT, FIXTURE_LAND, FIXTURE_LAYOUT_SOURCES, FIXTURE_LEVEL_RECIPES, FIXTURE_WILDS_LAYOUTS } from '@containment/shared/fixtures';
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
  assert.equal(contentWith(FIXTURE_CONTENT, new Map(), FIXTURE_LEVEL_RECIPES, FIXTURE_CONTEXT.hollowOf, new Map()), FIXTURE_CONTENT);
});

test('an edited land is served to the level recipes and drawn in the scene', () => {
  const { plan } = FIXTURE_LAND;
  const sea: LandMap = drawLand({ ...plan, steps: [...plan.steps, { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 32, height: 32 } }, tile: 'water' }] });
  const layout = FIXTURE_WILDS_LAYOUTS.get('fx-wild-west');
  assert.ok(layout);
  const recut = new Map([['fx-wild-west', { layout, district: buildDistrict(layout, sea) }]]);
  const content = contentWith(FIXTURE_CONTENT, recut, FIXTURE_LEVEL_RECIPES, FIXTURE_CONTEXT.hollowOf, new Map([['fx-land', sea]]));
  const level = content.levels.get('fx-wilds');
  assert.ok(level);
  assert.equal(content.lands.get('fx-land'), sea);
  assert.equal(level.definition.land, sea);
  for (const point of [{ x: 16, y: 16 }, { x: 4, y: 28 }, { x: -1, y: 16 }]) assert.equal(level.scene.tileAt(point), 'water');
  assert.equal(FIXTURE_CONTENT.levels.get('fx-wilds')?.scene.tileAt({ x: 16, y: 16 }), 'grass');
});
