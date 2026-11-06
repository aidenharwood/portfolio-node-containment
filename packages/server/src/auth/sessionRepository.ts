import { createHash, randomBytes } from 'node:crypto';
import type { AccountId } from '@containment/shared';
import type { Database } from '../persistence/database.ts';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export class SessionRepository {
  private readonly database: Database;
  private readonly lifetimeMs: number;

  constructor(database: Database, lifetimeMs: number) {
    this.database = database;
    this.lifetimeMs = lifetimeMs;
  }

  issue(accountId: AccountId, now = Date.now()): string {
    const token = randomBytes(32).toString('base64url');
    this.database
      .prepare('INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), accountId, now + this.lifetimeMs);
    return token;
  }

  resolve(token: string, now = Date.now()): AccountId | null {
    const row = this.database
      .prepare('SELECT account_id, expires_at FROM sessions WHERE token_hash = ?')
      .get(hashToken(token)) as { account_id: string; expires_at: number } | undefined;
    if (!row) return null;
    if (row.expires_at <= now) {
      this.revoke(token);
      return null;
    }
    return row.account_id;
  }

  revoke(token: string): void {
    this.database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }

  purgeExpired(now = Date.now()): void {
    this.database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  }
}
