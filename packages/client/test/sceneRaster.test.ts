import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIXTURE_CONTENT } from '@containment/shared/fixtures';
import { createSceneRaster, planSceneRaster, rasterizeRows, rasterizeScene, rasterLayout, runPlan } from '../src/render/far/sceneRaster.ts';
import { ChunkMesherPool, type MesherWorker, type StructureReply, type WorkerRequest } from '../src/render/world/chunkMesher.ts';

const wilds = FIXTURE_CONTENT.levels.get('fx-wilds');
assert.ok(wilds);

test('the scene raster copies every tile and height of the scene, margin included, in any slicing', () => {
  const scene = wilds.scene;
  const raster = rasterizeScene(scene);
  assert.deepEqual([raster.x, raster.y, raster.width, raster.height], [scene.bounds.x, scene.bounds.y, scene.bounds.width, scene.bounds.height]);
  const layout = rasterLayout(raster);
  for (let y = scene.bounds.y - 1; y <= scene.bounds.y + scene.bounds.height; y++) {
    for (let x = scene.bounds.x - 1; x <= scene.bounds.x + scene.bounds.width; x++) {
      const kind = scene.tileAt({ x, y });
      assert.equal(layout.tileAt({ x, y }), kind);
      if (kind !== 'void') assert.equal(layout.heightAt({ x, y }), scene.heightAt({ x, y }));
    }
  }
  const sliced = runPlan(planSceneRaster(scene));
  assert.deepEqual(sliced.kinds, raster.kinds);
  assert.deepEqual(sliced.heights, raster.heights);
  const partial = createSceneRaster(scene.bounds);
  rasterizeRows(scene, partial, 0, 5);
  rasterizeRows(scene, partial, 5, partial.height);
  assert.deepEqual(partial.kinds, raster.kinds);
});

const settle = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve));

test('the mesher pool rasterises a level on a worker, and a broken pool rejects the request', async () => {
  const received: WorkerRequest[] = [];
  const worker: MesherWorker = {
    onmessage: null,
    onerror: null,
    postMessage: (message) => void received.push(message),
    terminate: () => undefined,
  };
  const pool = new ChunkMesherPool(1, () => worker);
  const raster = createSceneRaster({ x: 0, y: 0, width: 2, height: 2 });
  const asked = pool.requestRaster('fx-wilds', () => 0);
  await settle();
  const request = received[0];
  assert.ok(request && 'kind' in request && request.kind === 'raster' && request.levelId === 'fx-wilds');
  worker.onmessage?.({ data: { id: request.id, raster } } as MessageEvent<StructureReply>);
  assert.equal(await asked, raster);
  const failing = pool.requestRaster('fx-wilds', () => 0);
  await settle();
  worker.onerror?.({ preventDefault: () => undefined } as ErrorEvent);
  await assert.rejects(failing);
  await assert.rejects(pool.requestRaster('fx-wilds', () => 0));
  pool.dispose();
});
