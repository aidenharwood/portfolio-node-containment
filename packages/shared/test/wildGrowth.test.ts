import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT } from '../src/index.ts';
import { SPAN_WILD_PROPS } from '../src/content/span/objects.ts';
import { parseTileLayout } from '../src/world/district.ts';
import { TILE_KINDS } from '../src/world/tiles.ts';
import { canGrow, emptyGround, hasRhythm, WILD_GROWTH, type Ground } from '../../../scripts/span/wildGrowth.ts';
import { WILD_POIS } from '../../../scripts/span/wilds.ts';

const groundOf = (rows: readonly string[]): Ground => {
  const size = rows.length;
  const ground = emptyGround(size);
  for (let index = 0; index < size * size; index++) {
    const cell = rows[Math.floor(index / size)]?.[index % size] ?? '#';
    ground.natural[index] = cell === '.' ? 1 : 0;
    ground.walkable[index] = cell === '#' ? 0 : 1;
  }
  return ground;
};

const MIN_PROPS = 15;
const OPEN = ['.......', '.......', '.......', '.......', '.......', '.......', '.......'];

describe('wild growth', () => {
  test('a blocking prop stands only inside a free ring, so it never closes a way', () => {
    const ground = groundOf(OPEN);
    assert.equal(canGrow(ground, [{ x: 3, y: 3 }], true), true);
    ground.blocked[2 * 7 + 4] = 1;
    assert.equal(canGrow(ground, [{ x: 3, y: 3 }], true), false);
    assert.equal(canGrow(ground, [{ x: 3, y: 3 }], false), true);
  });

  test('a passage two tiles wide is never planted shut', () => {
    const ground = groundOf(['#####', '.....', '.....', '#####', '#####']);
    assert.equal(canGrow(ground, [{ x: 2, y: 1 }], true), false);
    assert.equal(canGrow(ground, [{ x: 2, y: 2 }], true), false);
    assert.equal(canGrow(ground, [{ x: 2, y: 1 }], false), true);
  });

  test('a hedge run counts as one piece and needs its whole ring free', () => {
    const ground = groundOf(['.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '.........']);
    const run = [2, 3, 4, 5].map((x) => ({ x, y: 4 }));
    assert.equal(canGrow(ground, run, true), true);
    ground.blocked[3 * 9 + 6] = 1;
    assert.equal(canGrow(ground, run, true), false);
  });

  test('kept ground turns blockers away first and flora last', () => {
    const ground = groundOf(OPEN);
    ground.noBlock[3 * 7 + 3] = 1;
    assert.equal(canGrow(ground, [{ x: 3, y: 3 }], true), false);
    assert.equal(canGrow(ground, [{ x: 3, y: 3 }], false), true);
    ground.noFlora[3 * 7 + 3] = 1;
    assert.equal(canGrow(ground, [{ x: 3, y: 3 }], false), false);
  });

  test('the metronome guard spots five of a kind on one pitch', () => {
    assert.equal(hasRhythm([2, 5, 8, 11, 14]), true);
    assert.equal(hasRhythm([2, 5, 8, 11]), false);
    assert.equal(hasRhythm([2, 5, 8, 12, 15]), false);
    assert.equal(hasRhythm([1, 2, 3, 4, 5, 6]), false);
  });

  test('every stand grows props the game knows', () => {
    for (const [region, growth] of Object.entries(WILD_GROWTH)) {
      for (const stand of growth.stands) for (const member of stand.members) assert.ok(GAME_CONTENT.worldObjects.has(member.object), region + ' grows an unknown ' + member.object);
    }
  });
});

describe('the wilds as shipped', () => {
  const natural = new Map(SPAN_WILD_PROPS.map((object) => [object.id, object]));
  const wild = [...GAME_CONTENT.districts.values()].filter((district) => district.square && WILD_POIS[district.id]);

  test('flora is walked through and the rest of the kit blocks like scenery', () => {
    for (const object of SPAN_WILD_PROPS) assert.equal(object.blocksMovement, object.furnishing?.mount !== 'flat', object.id);
  });

  test('each region grows its own kit, with ruins and stumps everywhere', () => {
    const kits: Readonly<Record<string, readonly string[]>> = {
      'kestrel-reach': ['broadleaf-tree', 'birch-tree', 'bush', 'boulder', 'wildflowers'],
      'harrow-terraces': ['hedgerow', 'orchard-tree', 'field-wall', 'hay-bale'],
      halcyon: ['overgrown-planter', 'rubble-heap'],
      wreckfield: ['dead-tree', 'scrap-mound', 'tyre-heap', 'wrecked-panel'],
      'glass-steppe': ['obsidian-outcrop', 'glass-crystals', 'fused-shards'],
      'the-spindle': ['windbent-pine', 'rock-outcrop'],
    };
    const grown = new Map<string, Set<string>>();
    for (const district of GAME_CONTENT.districts.values()) {
      for (const object of district.objects) if (natural.has(object.objectId)) grown.set(district.region, new Set([...(grown.get(district.region) ?? []), object.objectId]));
    }
    for (const [region, kit] of Object.entries(kits)) for (const id of [...kit, 'ruin-wall', 'tree-stump']) assert.ok(grown.get(region)?.has(id), region + ' grows no ' + id);
  });

  test('wild squares are lived in and still mostly open ground', () => {
    for (const district of wild) {
      const layout = parseTileLayout(district.map);
      let walkable = 0;
      for (let y = 0; y < layout.height; y++) for (let x = 0; x < layout.width; x++) if (TILE_KINDS[layout.tileAt({ x, y })].walkable) walkable++;
      const props = district.objects.filter((object) => natural.has(object.objectId));
      const blocked = props.reduce((total, object) => {
        const definition = natural.get(object.objectId);
        return total + (definition?.blocksMovement ? (definition.footprint?.width ?? 1) * (definition.footprint?.height ?? 1) : 0);
      }, 0);
      assert.ok(props.length >= MIN_PROPS, district.id + ' grows only ' + props.length + ' natural props');
      assert.ok(blocked / walkable < 0.06, district.id + ' blocks ' + blocked + ' of ' + walkable + ' walkable tiles');
    }
  });
});
