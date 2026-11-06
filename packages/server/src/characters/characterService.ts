import { randomUUID } from 'node:crypto';
import {
  characterDraftErrors,
  failure,
  normalizeCharacterName,
  operativeRating,
  success,
  type AccountId,
  type CharacterDraft,
  type CharacterId,
  type CharacterRecord,
  type CharacterSummary,
  type GameContent,
  type Result,
} from '@containment/shared';
import { createCharacterRecord } from './characterFactory.ts';
import type { CharacterRepository } from './characterRepository.ts';

export const summarizeCharacter = (record: CharacterRecord): CharacterSummary => ({
  id: record.id,
  name: record.name,
  appearance: record.appearance,
  equipment: record.equipment,
  operativeRating: operativeRating(record.skills),
  zoneId: record.location.zoneId,
});

export class CharacterService {
  private readonly repository: CharacterRepository;
  private readonly content: GameContent;
  readonly maxCharactersPerAccount: number;

  constructor(repository: CharacterRepository, content: GameContent, maxCharactersPerAccount: number) {
    this.repository = repository;
    this.content = content;
    this.maxCharactersPerAccount = maxCharactersPerAccount;
  }

  roster(accountId: AccountId): CharacterSummary[] {
    return this.repository.listForAccount(accountId).map(summarizeCharacter);
  }

  create(accountId: AccountId, draft: CharacterDraft): Result<CharacterRecord, string[]> {
    const errors = characterDraftErrors(draft);
    if (errors.length > 0) return failure(errors);
    if (this.repository.countForAccount(accountId) >= this.maxCharactersPerAccount) {
      return failure([`You can hold at most ${this.maxCharactersPerAccount} personnel files.`]);
    }
    if (this.repository.isNameTaken(normalizeCharacterName(draft.name))) {
      return failure(['That name already belongs to another operative.']);
    }

    const record = createCharacterRecord(draft, { id: randomUUID(), accountId }, this.content);
    try {
      this.repository.insert(record);
    } catch {
      return failure(['That name already belongs to another operative.']);
    }
    return success(record);
  }

  load(accountId: AccountId, characterId: CharacterId): CharacterRecord | null {
    return this.repository.findOwned(accountId, characterId);
  }

  save(record: CharacterRecord): void {
    this.repository.save(record);
  }
}
