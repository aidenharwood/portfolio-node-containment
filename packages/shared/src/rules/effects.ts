import type { SkillId } from '../character/skills.ts';
import type { CraftingStation } from '../crafting/recipes.ts';
import type { ItemId, QuestId, DistrictId } from '../ids.ts';
import type { TilePoint } from '../world/geometry.ts';

export type GameEffect =
  | { readonly type: 'giveItem'; readonly itemId: ItemId; readonly count?: number }
  | { readonly type: 'takeItem'; readonly itemId: ItemId; readonly count?: number }
  | { readonly type: 'grantExperience'; readonly skill: SkillId; readonly amount: number }
  | { readonly type: 'startQuest'; readonly questId: QuestId }
  | { readonly type: 'emitSignal'; readonly signal: string }
  | { readonly type: 'setFlag'; readonly flag: string }
  | { readonly type: 'notify'; readonly text: string }
  | { readonly type: 'teleport'; readonly districtId: DistrictId; readonly position: TilePoint }
  | { readonly type: 'openShop'; readonly shopId: string }
  | { readonly type: 'openCrafting'; readonly station: CraftingStation }
  | { readonly type: 'openStorage' }
  | { readonly type: 'restoreIntegrity' };
