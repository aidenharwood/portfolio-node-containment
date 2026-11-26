import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rustToneAt } from '../src/render/models/megaModels.ts';

test('megastructure rust lies in banded patches, not a per-voxel scatter', () => {
  const lines: [number, number, number, number, number, number][] = [
    [0, 10, 0, 1, 0, 0],
    [3, 0, -2, 0, 1, 0],
    [-20, 30, -8, 0, 0, 1],
    [40, 5, 3, 1, 1, 0],
  ];
  const tones = new Set<number>();
  for (const [x, y, z, dx, dy, dz] of lines) {
    let switches = 0;
    let last = rustToneAt(x, y, z);
    for (let step = 1; step < 64; step++) {
      const tone = rustToneAt(x + dx * step, y + dy * step, z + dz * step);
      tones.add(tone);
      if (tone !== last) switches++;
      last = tone;
    }
    assert.ok(switches <= 14, String(switches));
  }
  assert.ok(tones.size >= 3, String(tones.size));
});
