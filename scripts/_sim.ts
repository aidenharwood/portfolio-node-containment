import { createStartingSkills, experienceForLevel } from '../packages/shared/src/character/skills.ts';
import { playerAttackProfile } from '../packages/shared/src/combat/combatMath.ts';
import { GAME_CONTENT } from '../packages/shared/src/index.ts';
const skills = { ...createStartingSkills(), closeQuarters: experienceForLevel(1), fortitude: experienceForLevel(1) };
console.log(playerAttackProfile(skills, { primary: 'scrap-baton', torso: 'scrap-plate' }, GAME_CONTENT.items));
