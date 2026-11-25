import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/content/gameContent.ts';
import { SHIPPED_LANDS } from '../src/content/land/index.ts';
import type { TileLayout } from '../src/world/district.ts';
import type { TileRect } from '../src/world/geometry.ts';
import type { ResolvedLevel } from '../src/world/levelLayout.ts';
import { TILE_KINDS } from '../src/world/tiles.ts';

function perchedLiquid(layout: Pick<TileLayout, 'tileAt' | 'heightAt'>, bounds: TileRect): string[] {
  const found: string[] = [];
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      const kind = layout.tileAt({ x, y });
      if (TILE_KINDS[kind].structure !== 'liquid') continue;
      const height = layout.heightAt({ x, y });
      let lowest = height;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const near = { x: x + dx, y: y + dy };
          if (layout.tileAt(near) === kind) lowest = Math.min(lowest, layout.heightAt(near));
        }
      }
      if (height - lowest >= 2) found.push(`${kind} at ${x},${y} stands ${height - lowest} steps above the ${kind} beside it`);
    }
  }
  return found;
}

test('no water on a shipped land stands two or more steps above the water beside it', () => {
  for (const [id, land] of SHIPPED_LANDS) assert.deepEqual(perchedLiquid(land, { x: 0, y: 0, width: land.width, height: land.height }).slice(0, 5), [], id);
});

test('no water in a level scene stands two or more steps above the water beside it', () => {
  for (const level of GAME_CONTENT.levels.values() as Iterable<ResolvedLevel>) {
    const { scene } = level;
    assert.deepEqual(perchedLiquid(scene, scene.bounds).slice(0, 5), [], level.id);
  }
});
