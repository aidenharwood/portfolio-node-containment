import type { ZoneLocation } from '../character/character.ts';
import type { StartingKit } from '../character/startingKit.ts';
import type { CreatureDefinition, CreatureId } from '../combat/creatures.ts';
import { CREATURES } from './creatures.ts';
import type { ShopDefinition, ShopId } from '../economy/shop.ts';
import { SHOPS } from './shops.ts';
import type { RecipeDefinition } from '../crafting/recipes.ts';
import type { DialogueDefinition } from '../dialogue/dialogue.ts';
import type { ItemCatalog, ItemDefinition } from '../gear/items.ts';
import type { DialogueId, NpcId, QuestId, WorldObjectId, ZoneId } from '../ids.ts';
import type { QuestDefinition } from '../quests/questDefinition.ts';
import type { NpcDefinition, WorldObjectDefinition } from '../world/entities.ts';
import type { ZoneDefinition } from '../world/zone.ts';
import { AMES_DIALOGUE, KADE_DIALOGUE, LUND_DIALOGUE, OKAFOR_DIALOGUE, SEL_DIALOGUE } from './dialogues/atriumDialogues.ts';
import { OSEI_DIALOGUE, PELL_DIALOGUE, REYES_DIALOGUE, VARGA_DIALOGUE } from './dialogues/intakeDialogues.ts';
import { HALVORSEN_DIALOGUE, MAGS_DIALOGUE } from './dialogues/undercroftDialogues.ts';
import { ANAND_DIALOGUE, OYELARAN_DIALOGUE } from './dialogues/hubDialogues.ts';
import { OVERGROWTH } from './quests/overgrowth.ts';
import { HYDROPONICS } from './zones/hydroponics.ts';
import { CRAFTING_ITEMS } from './craftingItems.ts';
import { CRAFTING_OBJECTS } from './craftingObjects.ts';
import { ITEMS } from './items.ts';
import { RECIPES } from './recipes.ts';
import { FIELD_FABRICATION } from './quests/fieldFabrication.ts';
import { NPCS } from './npcs.ts';
import { ORIENTATION_PROTOCOL } from './quests/orientationProtocol.ts';
import { LIVE_FIRE } from './quests/liveFire.ts';
import { STATIC_IN_THE_VENTS } from './quests/staticInTheVents.ts';
import { LEECH_SEASON } from './quests/leechSeason.ts';
import { THE_FAR_SIDE } from './quests/theFarSide.ts';
import { THE_KNOCKING } from './quests/theKnocking.ts';
import { WORLD_OBJECTS } from './worldObjects.ts';
import { INTAKE_WING } from './zones/intakeWing.ts';
import { MERIDIAN_ATRIUM } from './zones/meridianAtrium.ts';
import { SECTOR_THREE } from './zones/sectorThree.ts';
import { SECTOR_TWO } from './zones/sectorTwo.ts';
import { UNDERCROFT } from './zones/undercroft.ts';

export interface GameContent {
  readonly items: ItemCatalog;
  readonly npcs: ReadonlyMap<NpcId, NpcDefinition>;
  readonly worldObjects: ReadonlyMap<WorldObjectId, WorldObjectDefinition>;
  readonly dialogues: ReadonlyMap<DialogueId, DialogueDefinition>;
  readonly quests: ReadonlyMap<QuestId, QuestDefinition>;
  readonly zones: ReadonlyMap<ZoneId, ZoneDefinition>;
  readonly creatures: ReadonlyMap<CreatureId, CreatureDefinition>;
  readonly shops: ReadonlyMap<ShopId, ShopDefinition>;
  readonly recipes: ReadonlyMap<string, RecipeDefinition>;
  readonly newCharacter: {
    readonly startingLocation: ZoneLocation;
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

export const GAME_CONTENT: GameContent = {
  items: indexById<ItemDefinition>([...ITEMS, ...CRAFTING_ITEMS]),
  npcs: indexById(NPCS),
  worldObjects: indexById([...WORLD_OBJECTS, ...CRAFTING_OBJECTS]),
  dialogues: indexById([
    REYES_DIALOGUE,
    VARGA_DIALOGUE,
    PELL_DIALOGUE,
    OSEI_DIALOGUE,
    LUND_DIALOGUE,
    OKAFOR_DIALOGUE,
    SEL_DIALOGUE,
    AMES_DIALOGUE,
    KADE_DIALOGUE,
    MAGS_DIALOGUE,
    HALVORSEN_DIALOGUE,
    ANAND_DIALOGUE,
    OYELARAN_DIALOGUE,
  ]),
  quests: indexById([ORIENTATION_PROTOCOL, FIELD_FABRICATION, LIVE_FIRE, THE_KNOCKING, THE_FAR_SIDE, STATIC_IN_THE_VENTS, LEECH_SEASON, OVERGROWTH]),
  zones: indexById([INTAKE_WING, MERIDIAN_ATRIUM, SECTOR_TWO, UNDERCROFT, SECTOR_THREE, HYDROPONICS]),
  creatures: indexById(CREATURES),
  shops: indexById(SHOPS),
  recipes: indexById(RECIPES),
  newCharacter: {
    startingLocation: { zoneId: INTAKE_WING.id, position: INTAKE_WING.spawn },
    startingQuestId: ORIENTATION_PROTOCOL.id,
    kit: STANDARD_ISSUE_KIT,
  },
};
