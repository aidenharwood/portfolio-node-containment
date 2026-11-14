import type { WorldObjectId } from '../ids.ts';
import type { WorldObjectDefinition } from '../world/entities.ts';
import { registerDressingObjects } from './districts/furnish.ts';
import { registerRoomSignatures } from './furnishingCatalogue.ts';
import { registerPrefabs, type DressingTheme, type Prefab } from './prefabs/index.ts';

export interface FurnishingKit {
  readonly objects: readonly WorldObjectDefinition[];
  readonly prefabs: readonly Prefab[];
  readonly signatures: Readonly<Partial<Record<DressingTheme, readonly WorldObjectId[]>>>;
}

export function registerFurnishingKit(kit: FurnishingKit): void {
  registerDressingObjects(kit.objects);
  registerPrefabs(kit.prefabs);
  registerRoomSignatures(kit.signatures);
}
