import { GAME_CONTENT } from '@containment/shared';
import { decalsForLevel } from './floorDecals.ts';
import { ownedLayoutOf, packStructure, planChunkStructure } from './chunkStructure.ts';
import type { StructureReply, StructureRequest } from './chunkMesher.ts';

const scope = self as unknown as { onmessage: ((event: MessageEvent<StructureRequest>) => void) | null; postMessage(message: StructureReply, transfer: Transferable[]): void };

scope.onmessage = (event) => {
  const { id, levelId, region } = event.data;
  try {
    const level = GAME_CONTENT.levels.get(levelId);
    if (!level) throw new Error(`There is no level "${levelId}".`);
    const plan = planChunkStructure(ownedLayoutOf(level, level.scene), decalsForLevel(level), region);
    for (const step of plan.steps) step();
    const { packed, transfer } = packStructure(plan.result());
    scope.postMessage({ id, structure: packed }, transfer);
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) }, []);
  }
};

scope.postMessage({ ready: true }, []);
