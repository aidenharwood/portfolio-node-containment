import { randomUUID } from 'node:crypto';
import { CREDENTIAL_RULES, failure, success, type AccountId, type Result } from '@containment/shared';
import type { AccountRepository } from './accountRepository.ts';
import type { LoginThrottle } from './loginThrottle.ts';
import { hashPassword, verifyPassword } from './passwordHasher.ts';
import type { SessionRepository } from './sessionRepository.ts';

export interface AuthenticatedAccount {
  readonly accountId: AccountId;
  readonly username: string;
}

export interface IssuedSession extends AuthenticatedAccount {
  readonly token: string;
}

const INVALID_CREDENTIALS = 'Invalid username or password.';

export class AuthService {
  private readonly accounts: AccountRepository;
  private readonly sessions: SessionRepository;
  private readonly throttle: LoginThrottle;

  constructor(accounts: AccountRepository, sessions: SessionRepository, throttle: LoginThrottle) {
    this.accounts = accounts;
    this.sessions = sessions;
    this.throttle = throttle;
  }

  async register(username: string, password: string): Promise<Result<IssuedSession>> {
    const credentialError = credentialsError(username, password);
    if (credentialError) return failure(credentialError);
    if (this.accounts.findByUsername(username)) return failure('That username is already registered.');

    const account = { id: randomUUID(), username, passwordHash: await hashPassword(password), createdAt: Date.now() };
    try {
      this.accounts.insert(account);
    } catch {
      return failure('That username is already registered.');
    }
    return success(this.openSession(account.id, account.username));
  }

  async login(username: string, password: string, origin: string): Promise<Result<IssuedSession>> {
    const throttleKey = `${origin}|${username.toLowerCase()}`;
    if (this.throttle.isLocked(throttleKey)) return failure('Too many failed attempts. Wait a minute and try again.');

    const account = this.accounts.findByUsername(username);
    const valid = account ? await verifyPassword(password, account.passwordHash) : await hashPassword(password).then(() => false);
    if (!account || !valid) {
      this.throttle.recordFailure(throttleKey);
      return failure(INVALID_CREDENTIALS);
    }
    this.throttle.clear(throttleKey);
    return success(this.openSession(account.id, account.username));
  }

  resume(token: string): Result<IssuedSession> {
    const accountId = this.sessions.resolve(token);
    const account = accountId ? this.accounts.findById(accountId) : null;
    if (!account) return failure('Your session has expired. Please sign in again.');
    return success({ accountId: account.id, username: account.username, token });
  }

  logout(token: string): void {
    this.sessions.revoke(token);
  }

  private openSession(accountId: AccountId, username: string): IssuedSession {
    return { accountId, username, token: this.sessions.issue(accountId) };
  }
}

export function credentialsError(username: string, password: string): string | null {
  if (!CREDENTIAL_RULES.usernamePattern.test(username)) {
    return 'Usernames must be 3-20 characters: letters, numbers and underscores.';
  }
  if (password.length < CREDENTIAL_RULES.passwordMinimumLength) {
    return `Passwords need at least ${CREDENTIAL_RULES.passwordMinimumLength} characters.`;
  }
  if (password.length > CREDENTIAL_RULES.passwordMaximumLength) return 'That password is too long.';
  if (password.toLowerCase().includes(username.toLowerCase())) return 'Your password cannot contain your username.';
  return null;
}
