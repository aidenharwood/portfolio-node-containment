import { randomUUID } from 'node:crypto';
import {
  characterDraftErrors,
  failure,
  normalizeCharacterName,
  combatLevel,
  success,
  type AccountId,
  type CharacterDraft,
  type CharacterId,
  type CharacterRecord,
  type CharacterSummary,
  type DistrictId,
  type FriendEntry,
  type GameContent,
  type Result,
  type WorldLocation,
} from '@containment/shared';
import { createCharacterRecord } from './characterFactory.ts';
import type { CharacterRepository } from './characterRepository.ts';

function districtAt(location: WorldLocation, content: GameContent): DistrictId {
  const level = content.levels.get(location.levelId);
  return level?.layout.toLocalPoint(location.position)?.districtId ?? level?.definition.spawn.districtId ?? '';
}

export const summarizeCharacter = (record: CharacterRecord, content: GameContent): CharacterSummary => ({
  id: record.id,
  name: record.name,
  appearance: record.appearance,
  equipment: record.equipment,
  combatLevel: combatLevel(record.skills),
  districtId: districtAt(record.location, content),
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
    return this.repository.listForAccount(accountId).map((record) => summarizeCharacter(record, this.content));
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

  remove(accountId: AccountId, characterId: CharacterId, confirmName: string): Result<CharacterRecord, string> {
    const record = this.repository.findOwned(accountId, characterId);
    if (!record) return failure('That personnel file could not be found.');
    if (normalizeCharacterName(confirmName).toLowerCase() !== record.name.toLowerCase()) {
      return failure(`Type ${record.name} exactly to confirm.`);
    }
    if (!this.repository.delete(accountId, characterId)) return failure('That personnel file could not be found.');
    return success(record);
  }

  load(accountId: AccountId, characterId: CharacterId): CharacterRecord | null {
    return this.repository.findOwned(accountId, characterId);
  }

  findByName(name: string): FriendEntry | null {
    return this.repository.findEntryByName(normalizeCharacterName(name));
  }

  save(record: CharacterRecord): void {
    this.repository.save(record);
  }
}
