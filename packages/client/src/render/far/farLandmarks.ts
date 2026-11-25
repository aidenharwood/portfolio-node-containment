import { objectFootprintSize, type GameContent, type ResolvedLevel, type SceneLayout, type WorldObjectModel } from '@containment/shared';
import { buildObjectModel } from '../models/objectModels.ts';
import { hex } from '../voxel/palette.ts';
import { groundAt } from '../world/ground.ts';
import { MODEL_VOXEL_SIZE, STEP_HEIGHT } from '../world/worldScale.ts';
import type { Plan } from './sceneRaster.ts';

export const LANDMARK_HEIGHT = 12;
const BEACON_LIFT = 0.4;
const DEFAULT_GLOW = 0xffd9a0;

export interface Landmark {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly height: number;
  readonly color: number;
}

const MODEL_HEIGHTS = new Map<WorldObjectModel, number>();

export function modelHeight(model: WorldObjectModel): number {
  const known = MODEL_HEIGHTS.get(model);
  if (known !== undefined) return known;
  const height = buildObjectModel(model, 0).heightVoxels * MODEL_VOXEL_SIZE;
  MODEL_HEIGHTS.set(model, height);
  return height;
}

export function planLandmarks(level: ResolvedLevel, content: GameContent, scene: SceneLayout, minimum = LANDMARK_HEIGHT): Plan<Landmark[]> {
  const models = new Set<WorldObjectModel>();
  for (const placement of level.objects) {
    const definition = content.worldObjects.get(placement.objectId);
    if (definition) models.add(definition.model);
  }
  const steps = [...models].map((model) => () => void modelHeight(model));
  const result = (): Landmark[] => {
    const found: Landmark[] = [];
    for (const placement of level.objects) {
      const definition = content.worldObjects.get(placement.objectId);
      if (!definition) continue;
      const height = modelHeight(definition.model) * (definition.modelScale ?? 1);
      if (height < minimum) continue;
      const footprint = objectFootprintSize(definition, placement.facing);
      const ground = placement.datum === undefined ? groundAt(scene, placement.position.x, placement.position.y) : placement.datum * STEP_HEIGHT;
      found.push({ x: placement.position.x + (footprint.width - 1) / 2, y: ground + height + BEACON_LIFT, z: placement.position.y + (footprint.height - 1) / 2, height, color: definition.light ? hex(definition.light.color) : DEFAULT_GLOW });
    }
    return found.sort((a, b) => b.height - a.height);
  };
  return { steps, result };
}
