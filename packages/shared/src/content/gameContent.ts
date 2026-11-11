import type { RegionId } from '../ids.ts';
import type { RegionDefinition } from '../world/region.ts';
import { REGIONS } from './regions.ts';
import type { StartingKit } from '../character/startingKit.ts';
import type { CreatureDefinition, CreatureId } from '../combat/creatures.ts';
import { CREATURES } from './creatures.ts';
import { DEEP_CREATURES } from './deepCreatures.ts';
import { TRAINING_CREATURES } from './trainingCreatures.ts';
import { DEEP_ITEMS } from './deepItems.ts';
import { UNIQUE_GEAR } from './uniqueGear.ts';
import { DEEP_NPCS } from './deepNpcs.ts';
import { DEEP_OBJECTS } from './deepObjects.ts';
import {
  ACHTERBERG_DIALOGUE,
  BRANN_DIALOGUE,
  BUI_DIALOGUE,
  DUVAL_DIALOGUE,
  FENN_DIALOGUE,
  GUEST_DIALOGUE,
  KESSLER_DIALOGUE,
  PENHALLOW_DIALOGUE,
  PIM_DIALOGUE,
  THALE_DIALOGUE,
} from './dialogues/deepwatchDialogues.ts';
import { A_COUNCIL_OF_ONE, COLD_STORAGE, DEAD_AIR, ORIGINAL_CONTRACT, STOKING_THE_FIRE, THE_ANSWER } from './quests/actTwoMain.ts';
import { ACT_TWO_SIDE_QUESTS } from './quests/actTwoSide.ts';
import { CRYOVAULT } from './districts/cryovault.ts';
import { DEEPWATCH } from './districts/deepwatch.ts';
import { DROWNED_ARCHIVE } from './districts/drownedArchive.ts';
import { FURNACE } from './districts/furnace.ts';
import { MERIDIAN_BELOW } from './districts/meridianBelow.ts';
import { SIGNAL_ARRAY } from './districts/signalArray.ts';
import type { ShopDefinition, ShopId } from '../economy/shop.ts';
import { SHOPS } from './shops.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { ItemCatalog, ItemDefinition } from '../gear/items.ts';
import type { AssemblyId, DialogueId, DistrictId, LevelId, NpcId, QuestId, WorldObjectId } from '../ids.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { buildLevelIndex, locate, type LevelIndex } from './levelIndex.ts';
import type { WorldLocation } from '../world/level.ts';
import { MAIN_FLOOR } from './levels/mainFloor.ts';
import { MERIDIAN_BELOW_LEVEL } from './levels/meridianBelowLevel.ts';
import { THE_DEEP } from './levels/theDeep.ts';
import { THE_THRESHOLD } from './levels/theThreshold.ts';
import { UNDERCROFT_LEVEL } from './levels/undercroftLevel.ts';
import type { QuestDefinition } from '../quests/questDefinition.ts';
import type { QuestlineDefinition, QuestlineId } from '../quests/questline.ts';
import { QUESTLINES } from './questlines.ts';
import { WATERWORKS } from './districts/waterworks.ts';
import { NGATA_DIALOGUE } from './dialogues/waterworksDialogues.ts';
import { WATERWORKS_QUESTS } from './quests/waterworks.ts';
import { WATERWORKS_CREATURES } from './waterworksCreatures.ts';
import { WATERWORKS_NPCS } from './waterworksNpcs.ts';
import { WATERWORKS_OBJECTS } from './waterworksObjects.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../world/entities.ts';
import type { DistrictDefinition } from '../world/district.ts';
import { AMES_DIALOGUE, KADE_DIALOGUE, LUND_DIALOGUE, OKAFOR_DIALOGUE, SEL_DIALOGUE } from './dialogues/atriumDialogues.ts';
import { HALE_DIALOGUE, OSEI_DIALOGUE, PELL_DIALOGUE, REGISTRAR_DIALOGUE, REYES_DIALOGUE, VARGA_DIALOGUE } from './dialogues/intakeDialogues.ts';
import { HALVORSEN_DIALOGUE, MAGS_DIALOGUE } from './dialogues/undercroftDialogues.ts';
import { ANAND_DIALOGUE, OYELARAN_DIALOGUE, QUILL_DIALOGUE } from './dialogues/hubDialogues.ts';
import { OVERGROWTH } from './quests/overgrowth.ts';
import { HYDROPONICS } from './districts/hydroponics.ts';
import { CRAFTING_ITEMS } from './craftingItems.ts';
import { CRAFTING_OBJECTS } from './craftingObjects.ts';
import { ITEMS } from './items.ts';
import { RECIPES } from './recipes.ts';
import { FIELD_FABRICATION } from './quests/fieldFabrication.ts';
import { NPCS } from './npcs.ts';
import { AMBIENT_NPCS } from './ambientNpcs.ts';
import { CLUTTER_OBJECTS } from './clutterObjects.ts';
import { AMBIENT_DIALOGUES } from './dialogues/ambientDialogues.ts';
import { ORIENTATION_PROTOCOL } from './quests/orientationProtocol.ts';
import { LIVE_FIRE } from './quests/liveFire.ts';
import { CLEARED_FOR_TRANSIT } from './quests/clearedForTransit.ts';
import { SCRAP_RUN } from './quests/scrapRun.ts';
import { STATIC_IN_THE_VENTS } from './quests/staticInTheVents.ts';
import { LEECH_SEASON } from './quests/leechSeason.ts';
import { THE_FAR_SIDE } from './quests/theFarSide.ts';
import { THE_KNOCKING } from './quests/theKnocking.ts';
import { WORLD_OBJECTS } from './worldObjects.ts';
import { TRANSIT_OBJECTS } from './transitObjects.ts';
import { POCKET_OBJECTS } from './pocketObjects.ts';
import { OFFICE_OBJECTS } from './officeObjects.ts';
import { OFFICE_CREATURES, OFFICE_NPCS } from './officeActors.ts';
import { ODUYA_DIALOGUE } from './dialogues/officeDialogues.ts';
import { ACT_THREE_MAIN_QUESTS } from './quests/actThreeMain.ts';
import { ACT_FOUR_CALDER_QUESTS } from './quests/actFourCalder.ts';
import { CALDER_CREATURES } from './calderCreatures.ts';
import { CALDER_MATERIALS, CALDER_MEDICINE, CALDER_QUEST_ITEMS, CALDER_UNIQUE_GEAR, CATHEDRAL_GEAR, SALTWORKS_GEAR } from './calderItems.ts';
import { CALDER_NPCS } from './calderNpcs.ts';
import { CALDER_OBJECTS } from './calderObjects.ts';
import { BRANDT_DIALOGUE, SORREL_DIALOGUE } from './dialogues/calderDialogues.ts';
import { BRINE_GALLERIES } from './districts/brineGalleries.ts';
import { CALDER_CAUSEWAY } from './districts/calderCauseway.ts';
import { CALDER_GATEHOUSE } from './districts/calderGatehouse.ts';
import { SALT_CATHEDRAL } from './districts/saltCathedral.ts';
import { CALDER_DEEPS } from './districts/calderDeeps.ts';
import { CALDER_DEEPS_LEVEL } from './levels/calderDeepsLevel.ts';
import { CALDER_SIDE_QUESTS } from './quests/calderSide.ts';
import { ACT_FOUR_VESPER_QUESTS, VESPER_SIDE_QUESTS } from './quests/actFourVesper.ts';
import { VESPER_CREATURES } from './vesperCreatures.ts';
import { PHYSICIAN_GEAR, VESPER_MATERIALS, VESPER_MEDICINE, VESPER_QUEST_ITEMS, VESPER_UNIQUE_GEAR, WARD_GEAR } from './vesperItems.ts';
import { VESPER_NPCS } from './vesperNpcs.ts';
import { VESPER_OBJECTS } from './vesperObjects.ts';
import { ASHBY_DIALOGUE, LOWE_DIALOGUE } from './dialogues/vesperDialogues.ts';
import { VESPER_CAUSEWAY } from './districts/vesperCauseway.ts';
import { VESPER_WARDS } from './districts/vesperWards.ts';
import { VESPER_LODGE } from './districts/vesperLodge.ts';
import { VESPER_PHARMACY } from './districts/vesperPharmacy.ts';
import { VESPER_CELLARS } from './districts/vesperCellars.ts';
import { VESPER_CELLARS_LEVEL } from './levels/vesperCellarsLevel.ts';
import { DEAD_LETTER_OFFICE } from './districts/deadLetterOffice.ts';
import { DEAD_LETTER_OFFICE_LEVEL } from './levels/deadLetterOfficeLevel.ts';
import { ASSEMBLY_OBJECTS } from './assemblyObjects.ts';
import { LITTER_OBJECTS } from './litterObjects.ts';
import { FURNITURE_OBJECTS } from './furnitureObjects.ts';
import { CONTRACT_OBJECTS } from './contractObjects.ts';
import { CONTRACTS } from './contracts.ts';
import type { ContractDefinition, ContractId } from '../contracts/contract.ts';
import { ASSEMBLIES } from './assemblies.ts';
import type { AssemblyDefinition } from '../world/assemblies.ts';
import { VERDANT_FOLD } from './districts/verdantFold.ts';
import { VERDANT_FOLD_LEVEL } from './levels/verdantFoldLevel.ts';
import { buildTramNetwork, TRAM_LINES, TRAM_STATIONS } from './tramNetwork.ts';
import type { TramNetwork } from '../world/tram.ts';
import { INTAKE_WING, INTAKE_WING_ANCHORS } from './districts/intakeWing.ts';
import { SERVICE_YARDS } from './districts/serviceYards.ts';
import { SERVICE_CONCOURSE } from './districts/serviceConcourse.ts';
import { VERDANCE_CONCOURSE } from './districts/verdanceConcourse.ts';
import { MERIDIAN_CIRCUIT } from './districts/meridianCircuit.ts';
import { DEEP_CONCOURSE } from './districts/deepConcourse.ts';
import { FURNACE_CAUSEWAY } from './districts/furnaceCauseway.ts';
import { MERIDIAN_ATRIUM } from './districts/meridianAtrium.ts';
import { SECTOR_THREE } from './districts/sectorThree.ts';
import { SECTOR_TWO } from './districts/sectorTwo.ts';
import { UNDERCROFT } from './districts/undercroft.ts';

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
    readonly startingQuestId: QuestId;
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

const DISTRICTS: ReadonlyMap<DistrictId, DistrictDefinition> = indexById([INTAKE_WING, MERIDIAN_ATRIUM, MERIDIAN_CIRCUIT, VERDANCE_CONCOURSE, SERVICE_CONCOURSE, SERVICE_YARDS, WATERWORKS, SECTOR_TWO, UNDERCROFT, SECTOR_THREE, HYDROPONICS, DEEPWATCH, DEEP_CONCOURSE, FURNACE_CAUSEWAY, CRYOVAULT, SIGNAL_ARRAY, DROWNED_ARCHIVE, FURNACE, MERIDIAN_BELOW, VERDANT_FOLD, DEAD_LETTER_OFFICE, CALDER_CAUSEWAY, BRINE_GALLERIES, CALDER_GATEHOUSE, SALT_CATHEDRAL, CALDER_DEEPS, VESPER_CAUSEWAY, VESPER_WARDS, VESPER_LODGE, VESPER_PHARMACY, VESPER_CELLARS]);
const ASSEMBLY_INDEX: ReadonlyMap<AssemblyId, AssemblyDefinition> = indexById(ASSEMBLIES);
const LEVEL_INDEX: LevelIndex = buildLevelIndex([MAIN_FLOOR, UNDERCROFT_LEVEL, THE_DEEP, THE_THRESHOLD, MERIDIAN_BELOW_LEVEL, VERDANT_FOLD_LEVEL, DEAD_LETTER_OFFICE_LEVEL, CALDER_DEEPS_LEVEL, VESPER_CELLARS_LEVEL], DISTRICTS, ASSEMBLY_INDEX);

function startingLocation(): WorldLocation {
  const location = locate(LEVEL_INDEX, INTAKE_WING.id, INTAKE_WING_ANCHORS.start);
  if (!location) throw new Error("The Intake Wing is not placed on a level.");
  return location;
}

export const GAME_CONTENT: GameContent = {
  items: indexById<ItemDefinition>([...ITEMS, ...CRAFTING_ITEMS, ...DEEP_ITEMS, ...UNIQUE_GEAR, ...CALDER_MATERIALS, ...CALDER_MEDICINE, ...CALDER_QUEST_ITEMS, ...SALTWORKS_GEAR, ...CATHEDRAL_GEAR, ...CALDER_UNIQUE_GEAR, ...VESPER_MATERIALS, ...VESPER_MEDICINE, ...VESPER_QUEST_ITEMS, ...WARD_GEAR, ...PHYSICIAN_GEAR, ...VESPER_UNIQUE_GEAR]),
  npcs: indexById([...NPCS, ...DEEP_NPCS, ...WATERWORKS_NPCS, ...OFFICE_NPCS, ...CALDER_NPCS, ...VESPER_NPCS, ...AMBIENT_NPCS]),
  worldObjects: indexById([...WORLD_OBJECTS, ...CRAFTING_OBJECTS, ...DEEP_OBJECTS, ...TRANSIT_OBJECTS, ...POCKET_OBJECTS, ...ASSEMBLY_OBJECTS, ...LITTER_OBJECTS, ...WATERWORKS_OBJECTS, ...FURNITURE_OBJECTS, ...OFFICE_OBJECTS, ...CONTRACT_OBJECTS, ...CALDER_OBJECTS, ...VESPER_OBJECTS, ...CLUTTER_OBJECTS]),
  assemblies: ASSEMBLY_INDEX,
  dialogues: indexById([
    ...AMBIENT_DIALOGUES,
    REYES_DIALOGUE,
    VARGA_DIALOGUE,
    PELL_DIALOGUE,
    OSEI_DIALOGUE,
    REGISTRAR_DIALOGUE,
    HALE_DIALOGUE,
    QUILL_DIALOGUE,
    LUND_DIALOGUE,
    OKAFOR_DIALOGUE,
    SEL_DIALOGUE,
    AMES_DIALOGUE,
    KADE_DIALOGUE,
    MAGS_DIALOGUE,
    HALVORSEN_DIALOGUE,
    ANAND_DIALOGUE,
    OYELARAN_DIALOGUE,
    THALE_DIALOGUE,
    BUI_DIALOGUE,
    PENHALLOW_DIALOGUE,
    DUVAL_DIALOGUE,
    FENN_DIALOGUE,
    ACHTERBERG_DIALOGUE,
    PIM_DIALOGUE,
    BRANN_DIALOGUE,
    KESSLER_DIALOGUE,
    GUEST_DIALOGUE,
    NGATA_DIALOGUE,
    ODUYA_DIALOGUE,
    BRANDT_DIALOGUE,
    SORREL_DIALOGUE,
    ASHBY_DIALOGUE,
    LOWE_DIALOGUE,
  ]),
  quests: indexById([
    ORIENTATION_PROTOCOL,
    FIELD_FABRICATION,
    LIVE_FIRE,
    CLEARED_FOR_TRANSIT,
    SCRAP_RUN,
    THE_KNOCKING,
    THE_FAR_SIDE,
    STATIC_IN_THE_VENTS,
    LEECH_SEASON,
    OVERGROWTH,
    A_COUNCIL_OF_ONE,
    COLD_STORAGE,
    DEAD_AIR,
    ORIGINAL_CONTRACT,
    STOKING_THE_FIRE,
    THE_ANSWER,
    ...ACT_TWO_SIDE_QUESTS,
    ...WATERWORKS_QUESTS,
    ...ACT_THREE_MAIN_QUESTS,
    ...ACT_FOUR_CALDER_QUESTS,
    ...CALDER_SIDE_QUESTS,
    ...ACT_FOUR_VESPER_QUESTS,
    ...VESPER_SIDE_QUESTS,
  ]),
  questlines: indexById(QUESTLINES),
  districts: DISTRICTS,
  levels: LEVEL_INDEX.levels,
  levelOfDistrict: LEVEL_INDEX.levelOfDistrict,
  regions: indexById(REGIONS),
  tram: buildTramNetwork(TRAM_STATIONS, TRAM_LINES, DISTRICTS, LEVEL_INDEX),
  creatures: indexById([...CREATURES, ...DEEP_CREATURES, ...WATERWORKS_CREATURES, ...OFFICE_CREATURES, ...TRAINING_CREATURES, ...CALDER_CREATURES, ...VESPER_CREATURES]),
  shops: indexById(SHOPS),
  recipes: indexById(RECIPES),
  contracts: indexById(CONTRACTS),
  newCharacter: {
    startingLocation: startingLocation(),
    startingQuestId: ORIENTATION_PROTOCOL.id,
    kit: STANDARD_ISSUE_KIT,
  },
};
