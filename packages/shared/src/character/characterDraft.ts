import { appearanceErrors, randomAppearance, type CharacterAppearance } from './appearance.ts';
import { PRONOUN_SET_IDS, type PronounSetId } from './pronouns.ts';

export interface CharacterDraft {
  readonly name: string;
  readonly pronouns: PronounSetId;
  readonly appearance: CharacterAppearance;
}

export const CHARACTER_NAME_RULES = {
  minimumLength: 3,
  maximumLength: 18,
  pattern: /^[A-Za-z][A-Za-z' -]*[A-Za-z]$/,
  reservedWords: ['admin', 'moderator', 'directorate', 'system', 'overseer', 'staff'],
} as const;

export const normalizeCharacterName = (name: string): string => name.trim().replace(/\s+/g, ' ');

export function characterNameError(rawName: string): string | null {
  const name = normalizeCharacterName(rawName);
  if (name.length < CHARACTER_NAME_RULES.minimumLength) {
    return `Names need at least ${CHARACTER_NAME_RULES.minimumLength} characters.`;
  }
  if (name.length > CHARACTER_NAME_RULES.maximumLength) {
    return `Names may be at most ${CHARACTER_NAME_RULES.maximumLength} characters.`;
  }
  if (!CHARACTER_NAME_RULES.pattern.test(name)) {
    return 'Names may contain letters, spaces, hyphens and apostrophes, and must start and end with a letter.';
  }
  if (/['\- ]{2,}/.test(name)) return 'Names cannot contain consecutive punctuation or spaces.';
  const lowered = name.toLowerCase();
  if (CHARACTER_NAME_RULES.reservedWords.some((word) => lowered.includes(word))) {
    return 'That name is reserved by the Directorate.';
  }
  return null;
}

export function characterDraftErrors(draft: CharacterDraft): string[] {
  const errors: string[] = [];
  const nameError = characterNameError(draft.name);
  if (nameError) errors.push(nameError);
  if (!(PRONOUN_SET_IDS as readonly string[]).includes(draft.pronouns)) errors.push('Unknown pronoun set.');
  errors.push(...appearanceErrors(draft.appearance));
  return errors;
}

export const createDefaultDraft = (): CharacterDraft => ({
  name: '',
  pronouns: 'they',
  appearance: randomAppearance(),
});
