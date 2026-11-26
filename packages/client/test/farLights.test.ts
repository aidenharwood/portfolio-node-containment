import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHUNK_SIZE, GAME_CONTENT, type ObjectPlacement, type WorldObjectId } from '@containment/shared';
import { Color } from 'three';
import { farGlowOf, GLOW_INTENSITY, LIGHT_INTENSITY_SCALE, LIGHT_REACH, placeFarLights, poolWeight } from '../src/render/far/farLights.ts';
import { createSceneRaster, kindIndexOf } from '../src/render/far/sceneRaster.ts';
import { STEP_HEIGHT } from '../src/render/world/worldScale.ts';

const placement = (id: string, objectId: string, x: number, y: number, facing?: ObjectPlacement['facing']): ObjectPlacement => ({ instanceId: id as ObjectPlacement['instanceId'], objectId: objectId as WorldObjectId, position: { x, y }, ...(facing ? { facing } : {}) });

function sourceOf(objects: readonly ObjectPlacement[], indoors: (x: number, y: number) => boolean = () => false) {
  const raster = createSceneRaster({ x: 0, y: 0, width: 96, height: 96 });
  raster.kinds.fill(kindIndexOf('asphalt'));
  raster.heights.fill(2);
  return {
    raster,
    source: {
      objects,
      worldObjects: GAME_CONTENT.worldObjects,
      indoorsAt: ({ x, y }: { x: number; y: number }) => indoors(x, y),
      groundColorAt: (_x: number, _y: number, out: [number, number, number]) => void out.fill(0.25),
      moodAt: () => 5,
    },
  };
}

test('lamps and neon outside become far lights with their colour, reach and strength; indoor and unlit objects do not', () => {
  const { raster, source } = sourceOf(
    [placement('a', 'street-lamp', 10, 10), placement('b', 'neon-sign', 40, 40, 'east'), placement('c', 'boulder', 20, 20), placement('d', 'street-lamp', 60, 60), placement('e', 'blade-sign', 70, 12)],
    (x, y) => x === 60 && y === 60,
  );
  const batch = placeFarLights(source, raster);
  assert.equal(batch.count, 3);
  const lamp = GAME_CONTENT.worldObjects.get('street-lamp' as WorldObjectId)!;
  const color = new Color(lamp.light!.color);
  const power = (lamp.light!.intensity * LIGHT_INTENSITY_SCALE) / Math.PI;
  assert.ok(Math.abs((batch.pools[0] as number) - color.r * power * 0.25) < 1e-5);
  assert.ok(Math.abs((batch.pools[3] as number) - lamp.light!.radius * LIGHT_REACH) < 1e-6);
  assert.ok(Math.abs((batch.spots[3] as number) - 2 * STEP_HEIGHT) < 1e-6, 'the pool lies on the ground');
  assert.ok((batch.spots[1] as number) > (batch.spots[3] as number) + 1, 'the lamp head stands above it');
  assert.deepEqual([...batch.chunks.subarray(0, 2)], [Math.floor(10 / CHUNK_SIZE), Math.floor(10 / CHUNK_SIZE)]);
  assert.equal(batch.heads[4], 5, 'the mood rides with the head');
  const sign = farGlowOf(GAME_CONTENT.worldObjects.get('blade-sign' as WorldObjectId)!.model);
  assert.ok(sign, 'a blade sign glows without a light of its own');
  const blade = 2;
  const reach = Math.min(3.2, 1.6 + sign.size * 1.5) * LIGHT_REACH;
  assert.ok(Math.abs((batch.pools[blade * 4 + 3] as number) - reach) < 1e-5);
  const glow = new Color(sign.color);
  assert.ok(Math.abs((batch.pools[blade * 4] as number) - glow.r * ((GLOW_INTENSITY * LIGHT_INTENSITY_SCALE) / Math.PI) * 0.25) < 1e-5);
});

test('far pools take over from the field lights where those fade, and always beyond the near chunks', () => {
  assert.equal(poolWeight(false, 5, 40), 1);
  assert.equal(poolWeight(true, 20, 40), 0);
  assert.equal(poolWeight(true, 45, 40), 1);
  const fieldFade = (distance: number, edge: number) => 1 - Math.min(1, Math.max(0, (distance - edge * 0.8) / (edge * 0.2))) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (distance - edge * 0.8) / (edge * 0.2))));
  for (const distance of [30, 33, 36, 39]) assert.ok(Math.abs(poolWeight(true, distance, 40) + fieldFade(distance, 40) - 1) < 1e-9);
  assert.equal(poolWeight(true, 30, Infinity, 70, 64), 1, 'past the field light grid the pool lights a drawn chunk too');
  assert.equal(poolWeight(true, 30, Infinity, 40, 64), 0);
});
