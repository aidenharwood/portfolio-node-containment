import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SHIPPED_LANDS } from '../src/content/land/index.ts';
import { wardBorders } from '../src/content/landIntegrity.ts';
import { contrastNoise } from '../src/world/noise.ts';
import { TILE_KINDS } from '../src/world/tiles.ts';
import { PLACES, regionAtSquare } from '../../../scripts/span/atlas.ts';
import { isSeamTile, seamEdges } from '../../../scripts/span/plan.ts';
import { distanceField } from '../../../scripts/span/relief.ts';
import { maskLoops, smoothLoop } from '../../../scripts/span/trace.ts';

const spread = (values: readonly number[]): number => {
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.sqrt(values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length);
};

describe('contrast noise', () => {
  test('stays in 0..1, repeats for the same input and spreads wider with more gain', () => {
    const plain: number[] = [];
    const stretched: number[] = [];
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const value = contrastNoise(9, x / 7, y / 7, 3, 0.45, 2);
        assert.ok(value >= 0 && value <= 1);
        assert.equal(value, contrastNoise(9, x / 7, y / 7, 3, 0.45, 2));
        stretched.push(value);
        plain.push(contrastNoise(9, x / 7, y / 7, 3, 0.45, 1));
      }
    }
    assert.ok(spread(stretched) > spread(plain) * 1.5);
  });
});

describe('the relief generator', () => {
  test('the distance field is the Euclidean distance to the nearest source tile', () => {
    const width = 23;
    const height = 17;
    const sources = new Uint8Array(width * height);
    for (const [x, y] of [[3, 4], [19, 2], [11, 15], [20, 14]] as const) sources[y * width + x] = 1;
    const field = distanceField(width, height, sources);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let nearest = Infinity;
        for (let index = 0; index < sources.length; index++) if (sources[index]) nearest = Math.min(nearest, Math.hypot(x - (index % width), y - Math.floor(index / width)));
        assert.ok(Math.abs((field[y * width + x] as number) - nearest) < 1e-4, x + ',' + y);
      }
    }
  });

  test('a smoothed contour keeps its corners and drops the steps of a staircase', () => {
    const square = maskLoops(10, 10, (x, y) => x >= 2 && x < 8 && y >= 3 && y < 9);
    assert.equal(square.length, 1);
    assert.deepEqual(smoothLoop(square[0]!, 1), square[0]);
    const stairs = maskLoops(40, 40, (x, y) => x + y < 40);
    const smoothed = smoothLoop(stairs[0]!, 1);
    assert.ok(stairs[0]!.length > 60);
    assert.ok(smoothed.length <= 6);
    assert.deepEqual(smoothed[0], stairs[0]![0]);
  });
});

describe('the Span has real relief', () => {
  const land = SHIPPED_LANDS.get('the-span');
  assert.ok(land);
  const heightsOf = (ward: string): number[] => {
    const heights: number[] = [];
    for (let y = 0; y < land.height; y++) for (let x = 0; x < land.width; x++) if (land.wardAt({ x, y }) === ward && TILE_KINDS[land.tileAt({ x, y })].walkable) heights.push(land.heightAt({ x, y }));
    return heights;
  };

  test('Kestrel, Harrow and the Glass Steppe vary by three steps or more', () => {
    for (const ward of ['kestrel-reach', 'harrow-terraces', 'glass-steppe']) assert.ok(spread(heightsOf(ward)) >= 3, ward);
  });

  test('most wild squares rise and fall six steps or more', () => {
    const size = land.plan.squareSize;
    const places = new Set(PLACES.map((place) => place.column + ',' + place.row));
    let wild = 0;
    let hilly = 0;
    for (let row = 0; row < land.plan.rows; row++) {
      for (let column = 0; column < land.plan.columns; column++) {
        if (!regionAtSquare(column, row) || places.has(column + ',' + row)) continue;
        let low = Infinity;
        let high = -Infinity;
        for (let y = row * size; y < (row + 1) * size; y++) {
          for (let x = column * size; x < (column + 1) * size; x++) {
            if (!TILE_KINDS[land.tileAt({ x, y })].walkable) continue;
            low = Math.min(low, land.heightAt({ x, y }));
            high = Math.max(high, land.heightAt({ x, y }));
          }
        }
        wild++;
        if (high - low >= 6) hilly++;
      }
    }
    assert.ok(hilly >= wild * 0.75, hilly + ' of ' + wild);
  });
});

describe('the Seams', () => {
  const land = SHIPPED_LANDS.get('the-span');
  assert.ok(land);

  test('neighbouring regions meet in the open along most of every Seam', () => {
    const borders = wardBorders(land);
    assert.deepEqual(borders.map((border) => border.wards.join(' and ')).sort(), ['glass-steppe and the-spindle', 'glass-steppe and wreckfield', 'halcyon and harrow-terraces', 'halcyon and wreckfield', 'harrow-terraces and kestrel-reach']);
    for (const border of borders) assert.ok(border.open >= border.length * 0.7, border.wards.join(' and ') + ': open at ' + border.open + ' of ' + border.length);
  });

  test('a flush strip of plating marks every Seam', () => {
    const strips = new Map<number, { tiles: number; plating: number }>();
    for (const edge of seamEdges()) {
      const strip = strips.get(edge.seam) ?? { tiles: 0, plating: 0 };
      for (let along = edge.from; along < edge.to; along++) {
        for (const across of [edge.line - 1, edge.line]) {
          const point = edge.vertical ? { x: across, y: along } : { x: along, y: across };
          assert.ok(isSeamTile(point.x, point.y));
          strip.tiles++;
          if (land.tileAt(point) === 'plating') strip.plating++;
        }
      }
      strips.set(edge.seam, strip);
    }
    assert.equal(strips.size, 5);
    for (const [seam, strip] of strips) assert.ok(strip.plating >= strip.tiles * 0.6, 'seam ' + seam + ': ' + strip.plating + ' of ' + strip.tiles);
  });
});
