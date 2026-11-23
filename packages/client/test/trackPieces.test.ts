import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TileKindId, TileLayout } from '@containment/shared';
import { blockMark, trackPieceAt, trackRise } from '../src/render/world/trackPieces.ts';
import { TILE_RESOLUTION } from '../src/render/world/worldScale.ts';

const R = TILE_RESOLUTION;

const layoutOf = (rows: readonly string[], heights: (x: number, y: number) => number = () => 1): TileLayout => ({
  width: rows[0]?.length ?? 0,
  height: rows.length,
  tileAt: ({ x, y }): TileKindId => (rows[y]?.[x] === 'T' ? 'track' : rows[y]?.[x] === '.' ? 'grass' : 'void'),
  heightAt: ({ x, y }) => heights(x, y),
});

const bend = layoutOf([
  '....TT..',
  '....TT..',
  'TTTTTT..',
  'TTTTTT..',
  '........',
]);

test('a double track that turns is drawn as one bend block, with straights before it', () => {
  for (const [x, y] of [[4, 2], [5, 2], [4, 3], [5, 3]] as const) {
    const piece = trackPieceAt(bend, x, y);
    assert.equal(piece.kind, 'block', `${x},${y}`);
    if (piece.kind !== 'block') continue;
    assert.deepEqual([piece.x, piece.y], [4, 2]);
    assert.deepEqual([...piece.open].sort(), ['north', 'west']);
  }
  assert.deepEqual(trackPieceAt(bend, 1, 2), { kind: 'straight', axis: 'x' });
  assert.deepEqual(trackPieceAt(bend, 4, 0), { kind: 'straight', axis: 'y' });
});

test('a bend lays both lanes as arcs around its inner corner', () => {
  const open = new Set(['north', 'west'] as const);
  const at = (radius: number, angle: number) => blockMark(open, radius * Math.cos(angle), radius * Math.sin(angle), R);
  for (const radius of [2.5, 5.5, 10.5, 13.5]) {
    for (const angle of [0.2, 0.8, 1.3]) assert.equal(at(radius, angle), 'rail', `radius ${radius} angle ${angle}`);
  }
  assert.notEqual(at(8, 0.8), 'rail');
  assert.equal(blockMark(open, 15.5, 15.5, R), null);
});

test('a junction lays the straight through it and both bends off it', () => {
  const open = new Set(['east', 'west', 'north'] as const);
  assert.equal(blockMark(open, 3.5, 2.5, R), 'rail');
  assert.equal(blockMark(open, 2.5 * Math.cos(0.7), 2.5 * Math.sin(0.7), R), 'rail');
  assert.equal(blockMark(open, 2 * R - 2.5 * Math.cos(0.7), 2.5 * Math.sin(0.7), R), 'rail');
});

test('a step in a straight track becomes a continuous slope across the tiles beside it', () => {
  const line = layoutOf(['TTTTTTTTTTTT', 'TTTTTTTTTTTT'], (x) => (x < 6 ? 1 : 2));
  const surface = (x: number, u: number): number => line.heightAt({ x, y: 0 }) + trackRise(line, x, 0, 'x')(u);
  assert.equal(surface(5, 0.5), surface(6, -0.5));
  assert.equal(surface(5, 0.5), 1.5);
  assert.equal(surface(3, -0.5), 1);
  assert.equal(surface(8, 0.5), 2);
  let previous = surface(2, -0.5);
  for (let x = 2; x <= 9; x++) {
    for (const u of [-0.5, -0.25, 0, 0.25, 0.5]) {
      const height = surface(x, u);
      assert.ok(height >= previous - 1e-9, `the slope climbs steadily at ${x} ${u}`);
      previous = height;
    }
  }
});
