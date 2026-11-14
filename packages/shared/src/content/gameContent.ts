import type { StartingKit } from '../character/startingKit.ts';
import type { CreatureDefinition, CreatureId } from '../combat/creatures.ts';
import type { ContractDefinition, ContractId } from '../contracts/contract.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { ShopDefinition, ShopId } from '../economy/shop.ts';
import type { ItemCatalog } from '../gear/items.ts';
import type { AssemblyId, DialogueId, DistrictId, LevelId, NpcId, QuestId, RegionId, WorldObjectId } from '../ids.ts';
import type { QuestDefinition } from '../quests/questDefinition.ts';
import type { QuestlineDefinition, QuestlineId } from '../quests/questline.ts';
import type { AssemblyDefinition } from '../world/assemblies.ts';
import type { DistrictDefinition } from '../world/district.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../world/entities.ts';
import type { TilePoint } from '../world/geometry.ts';
import type { WorldLocation } from '../world/level.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { RegionDefinition } from '../world/region.ts';
import type { TramNetwork } from '../world/tram.ts';
import { ASSEMBLIES } from './assemblies.ts';
import { LOW_WARD_DISTRICTS, TERMINUS_SQUARE, TERMINUS_SQUARE_ANCHORS } from './districts/lowWard.ts';
import { buildInstallations } from './installations.ts';
import { buildLevelIndex, locate, type LevelIndex } from './levelIndex.ts';
import { OVERWORLD } from './levels/overworld.ts';
import { CURRENCY_ITEMS } from './seed/items.ts';
import { SEED_DIALOGUES, SEED_NPCS, SEED_OBJECTS, SEED_REGIONS, SEED_SHOPS } from './seed/lowWard.ts';
import { buildTramNetwork, TRAM_LINES, TRAM_STATIONS } from './tramNetwork.ts';

export interface GameContent {
  readonly items: ItemCatalog;
  readonly npcs: ReadonlyMap<NpcId, NpcDefinition>;
  readonly worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>;
  readonly assemblies: ReadonlyMap<AssemblyId, AssemblyDefinition>;
  readonly dialogues: ReadonlyMap<DialogueId, DialogueDefinition>;
  readonly quests: ReadonlyMap<QuestId, QuestDefinition>;
  readonly questlines: ReadonlyMap<QuestlineId, QuestlineDefinition>;
  readonly districts: ReadonlyMap<DistrictId, DistrictDefinition>;
  readonly levels: ReadonlyMap<LevelId, ResolvedLevel>;
  readonly levelOfDistrict: ReadonlyMap<DistrictId, LevelId>;
  readonly regions: ReadonlyMap<RegionId, RegionDefinition>;
  readonly tram: TramNetwork;
  readonly creatures: ReadonlyMap<CreatureId, CreatureDefinition>;
  readonly shops: ReadonlyMap<ShopId, ShopDefinition>;
  readonly recipes: ReadonlyMap<string, RecipeDefinition>;
  readonly contracts: ReadonlyMap<ContractId, ContractDefinition>;
  readonly newCharacter: {
    readonly startingLocation: WorldLocation;
    readonly trainingLocation: WorldLocation;
    readonly startingQuestId?: QuestId;
    readonly kit: StartingKit;
  };
}

const STANDARD_ISSUE_KIT: StartingKit = {
  equipment: [],
  items: [],
};

function indexById<T extends { readonly id: string }>(entries: readonly T[]): ReadonlyMap<string, T> {
  const index = new Map<string, T>();
  for (const entry of entries) {
    if (index.has(entry.id)) throw new Error(`Duplicate content id "${entry.id}".`);
    index.set(entry.id, entry);
  }
  return index;
}

const DISTRICTS: ReadonlyMap<DistrictId, DistrictDefinition> = indexById([...LOW_WARD_DISTRICTS]);
const INSTALLED = buildInstallations([...SEED_OBJECTS]);
const ASSEMBLY_INDEX: ReadonlyMap<AssemblyId, AssemblyDefinition> = indexById([...ASSEMBLIES, ...INSTALLED.assemblies]);
const LEVEL_INDEX: LevelIndex = buildLevelIndex([OVERWORLD], DISTRICTS, ASSEMBLY_INDEX);

function placed(districtId: DistrictId, position: TilePoint): WorldLocation {
  const location = locate(LEVEL_INDEX, districtId, position);
  if (!location) throw new Error(`District "${districtId}" is not placed on a level.`);
  return location;
}

export const GAME_CONTENT: GameContent = {
  items: indexById([...CURRENCY_ITEMS]),
  npcs: indexById([...SEED_NPCS]),
  worldObjects: indexById(INSTALLED.objects),
  assemblies: ASSEMBLY_INDEX,
  dialogues: indexById<DialogueDefinition>(SEED_DIALOGUES),
  quests: indexById<QuestDefinition>([]),
  questlines: indexById<QuestlineDefinition>([]),
  districts: DISTRICTS,
  levels: LEVEL_INDEX.levels,
  levelOfDistrict: LEVEL_INDEX.levelOfDistrict,
  regions: indexById(SEED_REGIONS),
  tram: buildTramNetwork(TRAM_STATIONS, TRAM_LINES, DISTRICTS, LEVEL_INDEX),
  creatures: indexById<CreatureDefinition>([]),
  shops: indexById(SEED_SHOPS),
  recipes: indexById<RecipeDefinition>([]),
  contracts: indexById<ContractDefinition>([]),
  newCharacter: {
    startingLocation: placed(TERMINUS_SQUARE.id, TERMINUS_SQUARE_ANCHORS.start),
    trainingLocation: placed(TERMINUS_SQUARE.id, TERMINUS_SQUARE_ANCHORS.start),
    kit: STANDARD_ISSUE_KIT,
  },
};
