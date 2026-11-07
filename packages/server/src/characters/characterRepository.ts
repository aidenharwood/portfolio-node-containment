import { maxIntegrityFor, normalizeAppearance, normalizeSkills, type AccountId, type CharacterId, type CharacterRecord } from '@containment/shared';
import type { Database } from '../persistence/database.ts';

function parseRecord(json: string): CharacterRecord {
  const stored = JSON.parse(json) as Omit<CharacterRecord, 'vitals' | 'storage'> & Partial<Pick<CharacterRecord, 'vitals' | 'storage'>>;
  const skills = normalizeSkills(stored.skills);
  return { ...stored, appearance: normalizeAppearance(stored.appearance), storage: stored.storage ?? [], skills, vitals: stored.vitals ?? { integrity: maxIntegrityFor(skills) } };
}

export class CharacterRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  listForAccount(accountId: AccountId): CharacterRecord[] {
    const rows = this.database
      .prepare('SELECT record FROM characters WHERE account_id = ? ORDER BY created_at')
      .all(accountId) as { record: string }[];
    return rows.map((row) => parseRecord(row.record));
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
    return row ? parseRecord(row.record) : null;
  }

  isNameTaken(name: string): boolean {
    return this.database.prepare('SELECT 1 FROM characters WHERE name = ?').get(name) !== undefined;
  }

  insert(record: CharacterRecord): void {
    this.database
      .prepare('INSERT INTO characters (id, account_id, name, record, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(record.id, record.accountId, record.name, JSON.stringify(record), record.createdAt, Date.now());
  }

  delete(accountId: AccountId, characterId: CharacterId): boolean {
    const result = this.database.prepare('DELETE FROM characters WHERE id = ? AND account_id = ?').run(characterId, accountId);
    return Number(result.changes) > 0;
  }

  save(record: CharacterRecord): void {
    this.database
      .prepare('UPDATE characters SET record = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(record), Date.now(), record.id);
  }
}
