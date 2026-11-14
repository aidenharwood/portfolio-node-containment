import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createDefaultDraft, GAME_CONTENT } from '@containment/shared';
import { AccountRepository } from '../src/auth/accountRepository.ts';
import { AuthService } from '../src/auth/authService.ts';
import { LoginThrottle } from '../src/auth/loginThrottle.ts';
import { SessionRepository } from '../src/auth/sessionRepository.ts';
import { CharacterRepository } from '../src/characters/characterRepository.ts';
import { CharacterService } from '../src/characters/characterService.ts';
import { openDatabase } from '../src/persistence/database.ts';

function createServices() {
  const database = openDatabase(':memory:');
  const sessions = new SessionRepository(database, 60_000);
  const auth = new AuthService(new AccountRepository(database), sessions, new LoginThrottle({ maxFailures: 3, windowMs: 60_000 }));
  const characters = new CharacterService(new CharacterRepository(database, GAME_CONTENT), GAME_CONTENT, 2);
  return { auth, characters, sessions };
}

describe('authentication', () => {
  test('registers, logs in and resumes with the issued token', async () => {
    const { auth } = createServices();
    const registered = await auth.register('operative_1', 'correct horse battery');
    assert.ok(registered.ok);
    const loggedIn = await auth.login('OPERATIVE_1', 'correct horse battery', 'test');
    assert.ok(loggedIn.ok);
    const resumed = auth.resume(loggedIn.value.token);
    assert.ok(resumed.ok);
    assert.equal(resumed.value.accountId, registered.value.accountId);
  });

  test('rejects duplicate usernames case-insensitively', async () => {
    const { auth } = createServices();
    await auth.register('operative_1', 'correct horse battery');
    const duplicate = await auth.register('Operative_1', 'another long password');
    assert.equal(duplicate.ok, false);
  });

  test('rejects weak credentials', async () => {
    const { auth } = createServices();
    assert.equal((await auth.register('ab', 'correct horse battery')).ok, false);
    assert.equal((await auth.register('operative_2', 'short')).ok, false);
    assert.equal((await auth.register('operative_3', 'operative_3-password')).ok, false);
  });

  test('locks out repeated failed logins', async () => {
    const { auth } = createServices();
    await auth.register('operative_1', 'correct horse battery');
    for (let attempt = 0; attempt < 3; attempt++) await auth.login('operative_1', 'wrong password!', 'test');
    const locked = await auth.login('operative_1', 'correct horse battery', 'test');
    assert.equal(locked.ok, false);
    assert.match(locked.ok ? '' : locked.error, /Too many/);
  });

  test('revoked tokens no longer resume', async () => {
    const { auth } = createServices();
    const registered = await auth.register('operative_1', 'correct horse battery');
    assert.ok(registered.ok);
    auth.logout(registered.value.token);
    assert.equal(auth.resume(registered.value.token).ok, false);
  });
});

describe('character creation', () => {
  test('creates a character with nothing but an undersuit, untrained skills and only the opening quest', async () => {
    const { auth, characters } = createServices();
    const account = await auth.register('operative_1', 'correct horse battery');
    assert.ok(account.ok);
    const created = characters.create(account.value.accountId, { ...createDefaultDraft(), name: 'Mara Voss' });
    assert.ok(created.ok);
    assert.ok(Object.values(created.value.skills).every((experience) => experience === 0));
    assert.deepEqual(created.value.equipment, {});
    assert.ok(created.value.inventory.every((slot) => slot === null));
    assert.deepEqual(created.value.storage, []);
    assert.deepEqual(Object.keys(created.value.quests), GAME_CONTENT.newCharacter.startingQuestId ? [GAME_CONTENT.newCharacter.startingQuestId] : []);
    assert.equal(characters.roster(account.value.accountId).length, 1);
  });

  test('deletes a personnel file only when its name is retyped, and only for its owner', async () => {
    const { auth, characters } = createServices();
    const owner = await auth.register('operative_1', 'correct horse battery');
    const stranger = await auth.register('operative_2', 'correct horse battery');
    assert.ok(owner.ok && stranger.ok);
    const created = characters.create(owner.value.accountId, { ...createDefaultDraft(), name: 'Mara Voss' });
    assert.ok(created.ok);
    assert.equal(characters.remove(owner.value.accountId, created.value.id, 'Mara').ok, false);
    assert.equal(characters.remove(stranger.value.accountId, created.value.id, 'Mara Voss').ok, false);
    assert.equal(characters.remove(owner.value.accountId, created.value.id, 'mara voss').ok, true);
    assert.equal(characters.roster(owner.value.accountId).length, 0);
    assert.ok(characters.create(owner.value.accountId, { ...createDefaultDraft(), name: 'Mara Voss' }).ok, 'the name is free again');
  });

  test('enforces unique names and the per-account limit', async () => {
    const { auth, characters } = createServices();
    const account = await auth.register('operative_1', 'correct horse battery');
    assert.ok(account.ok);
    const draft = createDefaultDraft();
    assert.ok(characters.create(account.value.accountId, { ...draft, name: 'Mara Voss' }).ok);
    assert.equal(characters.create(account.value.accountId, { ...draft, name: 'mara voss' }).ok, false);
    assert.ok(characters.create(account.value.accountId, { ...draft, name: 'Second File' }).ok);
    assert.equal(characters.create(account.value.accountId, { ...draft, name: 'Third File' }).ok, false);
  });

  test('characters cannot be loaded by another account', async () => {
    const { auth, characters } = createServices();
    const owner = await auth.register('operative_1', 'correct horse battery');
    const other = await auth.register('operative_2', 'correct horse battery');
    assert.ok(owner.ok && other.ok);
    const created = characters.create(owner.value.accountId, { ...createDefaultDraft(), name: 'Mara Voss' });
    assert.ok(created.ok);
    assert.equal(characters.load(other.value.accountId, created.value.id), null);
  });
});
