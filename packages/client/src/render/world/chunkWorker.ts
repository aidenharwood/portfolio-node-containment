import { GAME_CONTENT } from '@containment/shared';
import { rasterizeScene, rasterTransfer } from '../far/sceneRaster.ts';
import { decalsForLevel } from './floorDecals.ts';
import { ownedLayoutOf, packStructure, planChunkStructure } from './chunkStructure.ts';
import type { StructureReply, WorkerRequest } from './chunkMesher.ts';

const scope = self as unknown as { onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null; postMessage(message: StructureReply, transfer: Transferable[]): void };

scope.onmessage = (event) => {
  const request = event.data;
  const { id, levelId } = request;
  try {
    const level = GAME_CONTENT.levels.get(levelId);
    if (!level) throw new Error(`There is no level "${levelId}".`);
    if ('kind' in request) {
      const raster = rasterizeScene(level.scene);
      scope.postMessage({ id, raster }, rasterTransfer(raster));
      return;
    }
    const plan = planChunkStructure(ownedLayoutOf(level, level.scene), decalsForLevel(level), request.region);
    for (const step of plan.steps) step();
    const { packed, transfer } = packStructure(plan.result());
    scope.postMessage({ id, structure: packed }, transfer);
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) }, []);
  }
};

scope.postMessage({ ready: true }, []);
