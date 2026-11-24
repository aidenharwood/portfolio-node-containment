import type { StartingKit } from '../character/startingKit.ts';
import type { CreatureDefinition, CreatureId } from '../combat/creatures.ts';
import type { ContractDefinition, ContractId } from '../contracts/contract.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { ShopDefinition, ShopId } from '../economy/shop.ts';
import type { ItemCatalog } from '../gear/items.ts';
import type { AssemblyId, DialogueId, DistrictId, ItemId, LevelId, NpcId, QuestId, RegionId, WorldObjectId } from '../ids.ts';
import type { QuestDefinition } from '../quests/questDefinition.ts';
import type { QuestlineDefinition, QuestlineId } from '../quests/questline.ts';
import type { AssemblyDefinition } from '../world/assemblies.ts';
import type { DistrictDefinition } from '../world/district.ts';
import type { LandMap } from '../world/landPlan.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../world/entities.ts';
import type { TilePoint } from '../world/geometry.ts';
import type { WorldLocation } from '../world/level.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { RegionDefinition } from '../world/region.ts';
import type { TramNetwork } from '../world/tram.ts';
import { ASSEMBLIES } from './assemblies.ts';
import { buildInstallations } from './installations.ts';
import { SHIPPED_LANDS } from './land/index.ts';
import { buildLevelIndex, locate, type LevelIndex } from './levelIndex.ts';
import { OVERWORLD, SPAWN_DISTRICT_ID } from './levels/overworld.ts';
import { BELOW_LEVELS } from './levels/below.ts';
import { CURRENCY_ITEMS } from './catalog/currency.ts';
import { CREATURE_UNIQUES, FIELD_GEAR, FIELD_GEAR_RECIPES } from './catalog/uniques.ts';
import { MASTERY_MANTLES } from './catalog/mastery.ts';
import { RENAMED_WARD_ITEMS, WARD_FOOD, WARD_GEAR, WARD_KITS, WARD_MATERIALS, WARD_RECIPES, WARD_UNIQUES } from './catalog/items.ts';
import { WARD_SPOTS, WARD_STATIONS } from './catalog/nodes.ts';
import { CITY_KIT_OBJECTS } from './catalog/cityKit.ts';
import { LANDMARK_OBJECTS } from './catalog/landmarks.ts';
import { STORAGE_LOCKER } from './catalog/services.ts';
import { TRANSIT_ASSEMBLIES, TRANSIT_OBJECTS } from './catalog/transit.ts';
import { combineDialogues } from './catalog/dialogueKit.ts';
import { SPAN_CREATURES } from './span/creatures.ts';
import { SPAN_DISTRICTS } from './span/districts.ts';
import { SPAN_LIFTS, SPAN_RELICS } from './span/lifts.ts';
import { MEGASTRUCTURE_KIT } from './span/megastructures.ts';
import { SPAN_KIT } from './span/objects.ts';
import { WILD_DIALOGUES, WILD_KIT, WILD_NPCS } from './span/wilds.ts';
import { SPAN_BASE_DIALOGUES, SPAN_NPCS, SPAN_REGIONS, SPAN_SHOPS } from './span/people.ts';
import { QUEST_FOLK_DIALOGUES, QUEST_FOLK_NPCS } from './span/questFolk.ts';
import { SPAN_QUESTS, SPAN_QUESTLINES, SPAN_QUEST_DIALOGUES, SPAN_QUEST_ITEMS, SPAN_QUEST_OBJECTS, SPAN_QUEST_RECIPES, TUTORIAL_QUEST_ID } from './span/quests/index.ts';
import { CONTRACTS } from './contracts.ts';
import { buildTramNetwork } from './tramNetwork.ts';
import { SPAN_TRAM_LINES, SPAN_TRAM_STATIONS } from './span/transit.ts';

export interface GameContent {
  readonly items: ItemCatalog;
  readonly renamedItems?: ReadonlyMap<ItemId, ItemId>;
  readonly npcs: ReadonlyMap<NpcId, NpcDefinition>;
  readonly worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>;
  readonly assemblies: ReadonlyMap<AssemblyId, AssemblyDefinition>;
  readonly dialogues: ReadonlyMap<DialogueId, DialogueDefinition>;
  readonly quests: ReadonlyMap<QuestId, QuestDefinition>;
  readonly questlines: ReadonlyMap<QuestlineId, QuestlineDefinition>;
  readonly districts: ReadonlyMap<DistrictId, DistrictDefinition>;
  readonly levels: ReadonlyMap<LevelId, ResolvedLevel>;
  readonly levelOfDistrict: ReadonlyMap<DistrictId, LevelId>;
  readonly lands: ReadonlyMap<string, LandMap>;
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

const DISTRICTS: ReadonlyMap<DistrictId, DistrictDefinition> = indexById(SPAN_DISTRICTS);
const INSTALLED = buildInstallations([STORAGE_LOCKER, ...CITY_KIT_OBJECTS, ...LANDMARK_OBJECTS, ...TRANSIT_OBJECTS, ...SPAN_KIT.objects, ...WILD_KIT.objects, ...MEGASTRUCTURE_KIT.objects, ...SPAN_LIFTS, ...SPAN_RELICS, ...WARD_SPOTS, ...WARD_STATIONS, ...SPAN_QUEST_OBJECTS]);
const ASSEMBLY_INDEX: ReadonlyMap<AssemblyId, AssemblyDefinition> = indexById([...ASSEMBLIES, ...TRANSIT_ASSEMBLIES, ...INSTALLED.assemblies]);
const LEVEL_INDEX: LevelIndex = buildLevelIndex([OVERWORLD, ...BELOW_LEVELS], DISTRICTS, ASSEMBLY_INDEX);

function placed(districtId: DistrictId, position: TilePoint): WorldLocation {
  const location = locate(LEVEL_INDEX, districtId, position);
  if (!location) throw new Error(`District "${districtId}" is not placed on a level.`);
  return location;
}

const START = DISTRICTS.get(SPAWN_DISTRICT_ID)?.anchors?.start as TilePoint;

export const GAME_CONTENT: GameContent = {
  items: indexById([...CURRENCY_ITEMS, ...WARD_MATERIALS, ...WARD_FOOD, ...WARD_KITS, ...WARD_GEAR, ...WARD_UNIQUES, ...MASTERY_MANTLES, ...CREATURE_UNIQUES, ...FIELD_GEAR, ...SPAN_QUEST_ITEMS]),
  renamedItems: RENAMED_WARD_ITEMS,
  npcs: indexById([...SPAN_NPCS, ...WILD_NPCS, ...QUEST_FOLK_NPCS]),
  worldObjects: indexById(INSTALLED.objects),
  assemblies: ASSEMBLY_INDEX,
  dialogues: indexById<DialogueDefinition>(combineDialogues([...SPAN_BASE_DIALOGUES, ...WILD_DIALOGUES, ...QUEST_FOLK_DIALOGUES, ...SPAN_QUEST_DIALOGUES], (questId) => SPAN_QUESTS.find((quest) => quest.id === questId)?.name ?? questId)),
  quests: indexById<QuestDefinition>(SPAN_QUESTS),
  questlines: indexById<QuestlineDefinition>(SPAN_QUESTLINES),
  districts: DISTRICTS,
  levels: LEVEL_INDEX.levels,
  levelOfDistrict: LEVEL_INDEX.levelOfDistrict,
  lands: SHIPPED_LANDS,
  regions: indexById(SPAN_REGIONS),
  tram: buildTramNetwork(SPAN_TRAM_STATIONS, SPAN_TRAM_LINES, DISTRICTS, LEVEL_INDEX),
  creatures: indexById<CreatureDefinition>(SPAN_CREATURES),
  shops: indexById(SPAN_SHOPS),
  recipes: indexById<RecipeDefinition>([...WARD_RECIPES, ...FIELD_GEAR_RECIPES, ...SPAN_QUEST_RECIPES]),
  contracts: indexById<ContractDefinition>(CONTRACTS),
  newCharacter: {
    startingLocation: placed(SPAWN_DISTRICT_ID, START),
    trainingLocation: placed(SPAWN_DISTRICT_ID, START),
    startingQuestId: TUTORIAL_QUEST_ID,
    kit: STANDARD_ISSUE_KIT,
  },
};
