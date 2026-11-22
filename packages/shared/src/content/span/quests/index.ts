import type { RecipeDefinition } from '../../../crafting/recipes.ts';
import type { DialogueDefinition } from '../../../dialogue/dialogue.ts';
import type { ItemDefinition } from '../../../gear/items.ts';
import type { QuestDefinition } from '../../../quests/questDefinition.ts';
import type { QuestlineDefinition } from '../../../quests/questline.ts';
import type { WorldObjectDefinition } from '../../../world/entities.ts';
import { INTAKE_DIALOGUES, INTAKE_QUESTLINES, INTAKE_QUESTS, TUTORIAL_QUEST_ID } from './intake.ts';
import { SPINWARD_DIALOGUES, SPINWARD_ITEMS, SPINWARD_OBJECTS, SPINWARD_QUESTLINES, SPINWARD_QUESTS, SPINWARD_RECIPES } from './spinward.ts';
import { FAR_SPAN_DIALOGUES, FAR_SPAN_ITEMS, FAR_SPAN_OBJECTS, FAR_SPAN_QUESTLINES, FAR_SPAN_QUESTS, FAR_SPAN_RECIPES } from './farSpan.ts';

export { TUTORIAL_QUEST_ID };

export const SPAN_QUESTS: readonly QuestDefinition[] = [...INTAKE_QUESTS, ...SPINWARD_QUESTS, ...FAR_SPAN_QUESTS];
export const SPAN_QUESTLINES: readonly QuestlineDefinition[] = [...INTAKE_QUESTLINES, ...SPINWARD_QUESTLINES, ...FAR_SPAN_QUESTLINES];
export const SPAN_QUEST_DIALOGUES: readonly DialogueDefinition[] = [...INTAKE_DIALOGUES, ...SPINWARD_DIALOGUES, ...FAR_SPAN_DIALOGUES];
export const SPAN_QUEST_ITEMS: readonly ItemDefinition[] = [...SPINWARD_ITEMS, ...FAR_SPAN_ITEMS];
export const SPAN_QUEST_OBJECTS: readonly WorldObjectDefinition[] = [...SPINWARD_OBJECTS, ...FAR_SPAN_OBJECTS];
export const SPAN_QUEST_RECIPES: readonly RecipeDefinition[] = [...SPINWARD_RECIPES, ...FAR_SPAN_RECIPES];
