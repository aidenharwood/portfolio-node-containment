import { GAME_CONTENT, objectFootprintSize, PREFABS, type Facing, type GameContent, type WorldObjectDefinition } from '@containment/shared';
import { Group, type Object3D } from 'three';
import { CharacterRig } from '../render/models/characterModel.ts';
import { createCreatureRig } from '../render/models/creatureModels.ts';
import type { EntityRig } from '../render/models/entityRig.ts';
import { buildObjectModel } from '../render/models/objectModels.ts';
import { createVoxelObject } from '../render/voxel/voxelMaterials.ts';
import { MODEL_VOXEL_SIZE } from '../render/world/worldScale.ts';
import type { PaletteEntry } from './editController.ts';

const FACING_YAW: Readonly<Record<Facing, number>> = { south: 0, east: Math.PI / 2, north: Math.PI, west: -Math.PI / 2 };

const posed = (rig: EntityRig): Object3D => {
  rig.animate({ moving: false, walkPhase: 0, time: 0, attackProgress: null, attackMotion: null, hurtProgress: null });
  return rig.root;
};

export interface ItemFootprint {
  readonly width: number;
  readonly height: number;
}

const objectGroup = (definition: WorldObjectDefinition, facing: Facing = 'south'): Group => {
  const parts = buildObjectModel(definition.model, 0);
  const group = new Group();
  group.add(createVoxelObject(parts.base.mesh(MODEL_VOXEL_SIZE)));
  for (const animated of parts.animated) {
    const part = createVoxelObject(animated.model.mesh(MODEL_VOXEL_SIZE), { castShadow: false });
    animated.animate(part, 0, 0);
    group.add(part);
  }
  group.scale.setScalar(definition.modelScale ?? 1);
  group.rotation.y = FACING_YAW[facing];
  const { width, height } = objectFootprintSize(definition, facing);
  group.position.set((width - 1) / 2, 0, (height - 1) / 2);
  const holder = new Group();
  holder.add(group);
  return holder;
};

export function footprintOf(entry: PaletteEntry, content: GameContent = GAME_CONTENT): ItemFootprint {
  const value = entry.entry;
  if (entry.collection === 'objects') {
    const definition = content.worldObjects.get(String(value.object));
    if (definition) return objectFootprintSize(definition, (value.facing as Facing | undefined) ?? 'south');
  }
  if (entry.collection === 'setPieces') {
    const prefab = PREFABS[String(value.prefab)];
    if (prefab) {
      let width = 1;
      let height = 1;
      for (const piece of prefab.pieces) {
        const definition = content.worldObjects.get(piece.objectId);
        const size = definition ? objectFootprintSize(definition, piece.facing ?? 'south') : { width: 1, height: 1 };
        width = Math.max(width, piece.dx + size.width);
        height = Math.max(height, piece.dy + size.height);
      }
      return { width, height };
    }
  }
  if (entry.collection === 'decals') return { width: Number(value.width ?? 1), height: Number(value.height ?? 1) };
  return { width: 1, height: 1 };
}

export function modelOf(entry: PaletteEntry, content: GameContent = GAME_CONTENT): Object3D | null {
  const value = entry.entry;
  try {
    if (entry.collection === 'objects') {
      const definition = content.worldObjects.get(String(value.object));
      return definition ? objectGroup(definition, (value.facing as Facing | undefined) ?? 'south') : null;
    }
    if (entry.collection === 'setPieces') {
      const prefab = PREFABS[String(value.prefab)];
      if (!prefab) return null;
      const group = new Group();
      for (const piece of prefab.pieces) {
        const definition = content.worldObjects.get(piece.objectId);
        if (!definition) continue;
        const model = objectGroup(definition, piece.facing);
        model.position.x += piece.dx;
        model.position.z += piece.dy;
        group.add(model);
      }
      return group;
    }
    if (entry.collection === 'npcs') {
      const npc = content.npcs.get(String(value.npc));
      return npc ? posed(new CharacterRig(npc.appearance, npc.gear)) : null;
    }
    if (entry.collection === 'creatures') {
      const creature = content.creatures.get(String(value.creature));
      return creature ? posed(createCreatureRig(creature.model)) : null;
    }
  } catch {
    return null;
  }
  return null;
}
