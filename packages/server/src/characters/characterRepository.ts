import { emptyContractLedger, maxIntegrityFor, normalizeAppearance, normalizeSkills, type AccountId, type FriendEntry, type CharacterId, type CharacterRecord, type GameContent } from '@containment/shared';
import { restoreLocation, storeLocation } from './storedLocation.ts';
import type { Database } from '../persistence/database.ts';

function parseRecord(json: string, content: GameContent): CharacterRecord {
  const stored = JSON.parse(json) as Omit<CharacterRecord, 'vitals' | 'storage' | 'location' | 'friends' | 'contracts'> & Partial<Pick<CharacterRecord, 'vitals' | 'storage' | 'friends' | 'contracts'>> & { readonly location: unknown };
  const skills = normalizeSkills(stored.skills);
  return { ...stored, location: restoreLocation(stored.location, content), appearance: normalizeAppearance(stored.appearance), storage: stored.storage ?? [], friends: stored.friends ?? [], contracts: stored.contracts ?? emptyContractLedger(), skills, vitals: stored.vitals ?? { integrity: maxIntegrityFor(skills) } };
}

export class CharacterRepository {
  private readonly database: Database;
  private readonly content: GameContent;

  constructor(database: Database, content: GameContent) {
    this.database = database;
    this.content = content;
  }

  listForAccount(accountId: AccountId): CharacterRecord[] {
    const rows = this.database
      .prepare('SELECT record FROM characters WHERE account_id = ? ORDER BY created_at')
      .all(accountId) as { record: string }[];
    return rows.map((row) => parseRecord(row.record, this.content));
  }

  countForAccount(accountId: AccountId): number {
    const row = this.database.prepare('SELECT COUNT(*) AS total FROM characters WHERE account_id = ?').get(accountId) as {
      total: number;
    };
    return row.total;
  }

  findOwned(accountId: AccountId, characterId: CharacterId): CharacterRecord | null {
    const row = this.database
      .prepare('SELECT record FROM characters WHERE id = ? AND account_id = ?')
      .get(characterId, accountId) as { record: string } | undefined;
    return row ? parseRecord(row.record, this.content) : null;
  }

  findEntryByName(name: string): FriendEntry | null {
    const row = this.database.prepare('SELECT id, name FROM characters WHERE name = ?').get(name) as { id: string; name: string } | undefined;
    return row ? { characterId: row.id, name: row.name } : null;
  }

  isNameTaken(name: string): boolean {
    return this.database.prepare('SELECT 1 FROM characters WHERE name = ?').get(name) !== undefined;
  }

  insert(record: CharacterRecord): void {
    this.database
      .prepare('INSERT INTO characters (id, account_id, name, record, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(record.id, record.accountId, record.name, this.serialize(record), record.createdAt, Date.now());
  }

  delete(accountId: AccountId, characterId: CharacterId): boolean {
    const result = this.database.prepare('DELETE FROM characters WHERE id = ? AND account_id = ?').run(characterId, accountId);
    return Number(result.changes) > 0;
  }

  save(record: CharacterRecord): void {
    this.database
      .prepare('UPDATE characters SET record = ?, updated_at = ? WHERE id = ?')
      .run(this.serialize(record), Date.now(), record.id);
  }

  private serialize(record: CharacterRecord): string {
    return JSON.stringify({ ...record, location: storeLocation(record.location, this.content) });
  }
}
