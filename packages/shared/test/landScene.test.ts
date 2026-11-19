import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { FIXTURE_CONTENT, FIXTURE_FLOOR, FIXTURE_LAND, FIXTURE_WILDS, FIXTURE_WILDS_IDS, FIXTURE_WILDS_LAYOUTS } from './fixtures/world/index.ts';
import { FIXTURE_LAND_PLAN } from './fixtures/world/wilds.ts';
import type { DistrictDefinition, TileLayout } from '../src/world/district.ts';
import { drawLand, type LandMap } from '../src/world/landPlan.ts';
import { LAND_MARGIN, sceneOf } from '../src/world/landScene.ts';
import { buildDistrict } from '../src/world/layout.ts';
import { resolveLevel, type ResolvedLevel } from '../src/world/levelLayout.ts';

const wilds = FIXTURE_CONTENT.levels.get('fx-wilds') as ResolvedLevel;

const grassUnder = (width: number, height: number): LandMap =>
  drawLand({
    id: 'grass-under',
    squareSize: 1,
    columns: width,
    rows: height,
    steps: [{ kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width, height } }, tile: 'grass' }],
  });

describe('the scene layout', () => {
  test('a level without land draws its layout and nothing else', () => {
    const level = FIXTURE_CONTENT.levels.get('fx-floor') as ResolvedLevel;
    const { layout, scene } = level;
    assert.deepEqual(scene.bounds, { x: 0, y: 0, width: layout.width, height: layout.height });
    assert.equal(scene.width, layout.width);
    assert.equal(scene.height, layout.height);
    for (let y = -2; y < layout.height + 2; y++) {
      for (let x = -2; x < layout.width + 2; x++) {
        assert.equal(scene.tileAt({ x, y }), layout.tileAt({ x, y }));
        assert.equal(scene.heightAt({ x, y }), layout.heightAt({ x, y }));
      }
    }
  });

  test('a tile a district owns shows the district, not the land under it', () => {
    const plain = FIXTURE_CONTENT.levels.get('fx-floor') as ResolvedLevel;
    const land = grassUnder(plain.layout.width, plain.layout.height);
    const level = resolveLevel({ ...FIXTURE_FLOOR, land }, FIXTURE_CONTENT.districts, FIXTURE_CONTENT.assemblies);
    let outpostFloor = 0;
    let landShown = 0;
    for (let y = 0; y < level.layout.height; y++) {
      for (let x = 0; x < level.layout.width; x++) {
        const tile = level.layout.tileAt({ x, y });
        if (tile === 'void') {
          assert.equal(level.scene.tileAt({ x, y }), 'grass');
          landShown++;
          continue;
        }
        assert.equal(level.scene.tileAt({ x, y }), tile);
        assert.equal(level.scene.heightAt({ x, y }), level.layout.heightAt({ x, y }));
        if (level.layout.districtAt({ x, y }) === 'fx-outpost' && tile !== 'grass') outpostFloor++;
      }
    }
    assert.ok(outpostFloor > 0);
    assert.ok(landShown > 0);
  });

  test('land in no district shows the land, with its height', () => {
    const { layout, scene } = wilds;
    let water = 0;
    for (let y = 0; y < FIXTURE_LAND.height; y++) {
      for (let x = 96; x < FIXTURE_LAND.width; x++) {
        assert.equal(layout.tileAt({ x, y }), 'void');
        assert.equal(scene.tileAt({ x, y }), FIXTURE_LAND.tileAt({ x, y }));
        assert.equal(scene.heightAt({ x, y }), FIXTURE_LAND.heightAt({ x, y }));
        if (scene.tileAt({ x, y }) === 'water') water++;
      }
    }
    assert.ok(water > 0);
  });

  test('a plan whose west half is water shows the water beside an eastern square', () => {
    const land = drawLand({
      id: 'half-sea',
      squareSize: 16,
      columns: 2,
      rows: 1,
      steps: [
        { kind: 'fill', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 16 } }, tile: 'water' },
        { kind: 'fill', shape: { kind: 'rect', rect: { x: 16, y: 0, width: 16, height: 16 } }, tile: 'grass' },
        { kind: 'rise', shape: { kind: 'rect', rect: { x: 0, y: 0, width: 16, height: 16 } }, height: 2 },
      ],
    });
    const layout: TileLayout = {
      width: 32,
      height: 16,
      tileAt: ({ x, y }) => (x >= 16 && x < 32 && y >= 0 && y < 16 ? 'concrete' : 'void'),
      heightAt: () => 0,
    };
    const scene = sceneOf(layout, land);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        assert.equal(scene.tileAt({ x, y }), 'water');
        assert.equal(scene.heightAt({ x, y }), 2);
      }
      assert.equal(scene.tileAt({ x: 20, y }), 'concrete');
    }
  });

  test('land of a third ward in a split square is void in the layout and drawn in the scene', () => {
    const land = drawLand({
      ...FIXTURE_LAND_PLAN,
      steps: [...FIXTURE_LAND_PLAN.steps, { kind: 'ward', shape: { kind: 'rect', rect: { x: 40, y: 26, width: 6, height: 3 } }, ward: 'fx-third' }],
    });
    const districts = new Map<string, DistrictDefinition>(FIXTURE_CONTENT.districts);
    for (const id of FIXTURE_WILDS_IDS) districts.set(id, buildDistrict(FIXTURE_WILDS_LAYOUTS.get(id) as never, land));
    const level = resolveLevel({ ...FIXTURE_WILDS, land }, districts, FIXTURE_CONTENT.assemblies);
    for (let y = 26; y < 29; y++) {
      for (let x = 40; x < 46; x++) {
        assert.equal(level.layout.tileAt({ x, y }), 'void');
        assert.equal(level.scene.tileAt({ x, y }), land.tileAt({ x, y }));
        assert.notEqual(level.scene.tileAt({ x, y }), 'void');
      }
    }
  });

  test('past the edge the nearest edge tile repeats for the margin', () => {
    const { scene } = wilds;
    const { width, height } = FIXTURE_LAND;
    const same = (point: { x: number; y: number }, from: { x: number; y: number }) => {
      assert.equal(scene.tileAt(point), FIXTURE_LAND.tileAt(from));
      assert.equal(scene.heightAt(point), FIXTURE_LAND.heightAt(from));
    };
    same({ x: -1, y: 5 }, { x: 0, y: 5 });
    same({ x: -LAND_MARGIN, y: -LAND_MARGIN }, { x: 0, y: 0 });
    same({ x: width + LAND_MARGIN - 1, y: 3 }, { x: width - 1, y: 3 });
    same({ x: 5, y: height + LAND_MARGIN - 1 }, { x: 5, y: height - 1 });
    assert.equal(scene.tileAt({ x: -LAND_MARGIN - 1, y: 0 }), 'void');
    assert.equal(scene.heightAt({ x: -LAND_MARGIN - 1, y: 0 }), 0);
    assert.equal(scene.tileAt({ x: width + LAND_MARGIN, y: 0 }), 'void');
  });

  test('a land wider than its placed squares sizes the scene', () => {
    assert.ok(wilds.layout.width < FIXTURE_LAND.width);
    assert.equal(wilds.scene.width, FIXTURE_LAND.width);
    assert.equal(wilds.scene.height, FIXTURE_LAND.height);
    assert.deepEqual(wilds.scene.bounds, { x: -32, y: -32, width: FIXTURE_LAND.width + 64, height: FIXTURE_LAND.height + 64 });
  });
});
