import type { AccountId } from '@containment/shared';
import type { Database } from '../persistence/database.ts';

export interface AccountRow {
  readonly id: AccountId;
  readonly username: string;
  readonly passwordHash: string;
  readonly createdAt: number;
}

interface RawAccountRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
}

const toAccount = (row: RawAccountRow): AccountRow => ({
  id: row.id,
  username: row.username,
  passwordHash: row.password_hash,
  createdAt: row.created_at,
});

export class AccountRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  findByUsername(username: string): AccountRow | null {
    const row = this.database.prepare('SELECT * FROM accounts WHERE username = ?').get(username) as RawAccountRow | undefined;
    return row ? toAccount(row) : null;
  }

  findById(id: AccountId): AccountRow | null {
    const row = this.database.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as RawAccountRow | undefined;
    return row ? toAccount(row) : null;
  }

  insert(account: AccountRow): void {
    this.database
      .prepare('INSERT INTO accounts (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)')
      .run(account.id, account.username, account.passwordHash, account.createdAt);
  }
}
