import { GAME_CONTENT, type ResolvedLevel, type SceneLayout } from '@containment/shared';
import { chunkMesherPool } from '../world/chunkMesher.ts';
import { planSceneRaster, type Plan, type SceneRaster } from './sceneRaster.ts';

const SLICE_MS = 6;
const RASTER_PRIORITY = 0.5;

interface Pending<T> {
  readonly promise: Promise<T>;
  value: T | null;
}

const RASTERS = new WeakMap<ResolvedLevel, Pending<SceneRaster>>();

const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export async function runInSlices<T>(plan: Plan<T>, sliceMs = SLICE_MS): Promise<T> {
  let deadline = performance.now() + sliceMs;
  for (const step of plan.steps) {
    if (performance.now() >= deadline) {
      await pause();
      deadline = performance.now() + sliceMs;
    }
    step();
  }
  return plan.result();
}

const workerFor = (level: ResolvedLevel) => (GAME_CONTENT.levels.get(level.id) === level ? chunkMesherPool() : null);

function remember<T>(cache: WeakMap<ResolvedLevel, Pending<T>>, level: ResolvedLevel, start: () => Promise<T>): Pending<T> {
  const known = cache.get(level);
  if (known) return known;
  const pending: Pending<T> = { promise: start(), value: null };
  void pending.promise.then(
    (value) => {
      pending.value = value;
    },
    () => cache.delete(level),
  );
  cache.set(level, pending);
  return pending;
}

const localRaster = (scene: SceneLayout): Promise<SceneRaster> => runInSlices(planSceneRaster(scene));

export function sceneRasterFor(level: ResolvedLevel, scene: SceneLayout = level.scene): Promise<SceneRaster> {
  return remember(RASTERS, level, () => {
    const pool = workerFor(level);
    if (!pool || scene !== level.scene) return localRaster(scene);
    return pool.requestRaster(level.id, () => RASTER_PRIORITY).catch(() => localRaster(scene));
  }).promise;
}

export const readySceneRaster = (level: ResolvedLevel): SceneRaster | null => RASTERS.get(level)?.value ?? null;
